/**
 * Test helper: boots the REAL server (server.ts via tsx) as a child process
 * against a caller-provided working directory and a free TCP port.
 * Used by the API integration tests so that route behavior is verified
 * against the actual Express app rather than a re-implementation.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

// tests/helpers/server.ts → repo root (three levels up)
export const REPO_ROOT = path.resolve(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  ".."
);

export function tsxExecutable(): string {
  const bin = process.platform === "win32" ? "tsx.cmd" : "tsx";
  return path.join(REPO_ROOT, "node_modules", ".bin", bin);
}

export async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const address = srv.address();
      const port = typeof address === "object" && address ? address.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

/** Shared token the test suite deploys into every server it spawns. */
export const TEST_API_TOKEN = "reddy-test-token";

/**
 * The server now requires Authorization: Bearer <REDDY_API_TOKEN> on every
 * /api route whenever the token is configured. The suite always configures it,
 * so the ambient fetch is wrapped once to attach the header. `rawFetch` is the
 * untouched original and is what the 401 assertions use.
 */
export const rawFetch: typeof fetch = globalThis.fetch.bind(globalThis);

let authFetchInstalled = false;
function installAuthFetch() {
  if (authFetchInstalled) return;
  authFetchInstalled = true;
  const original = globalThis.fetch.bind(globalThis);
  (globalThis as any).fetch = ((input: any, init: any = {}) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input && typeof input.url === "string" ? input.url : "");
    const headers = new Headers(init && init.headers ? init.headers : undefined);
    if (url.includes("/api/")) headers.set("authorization", `Bearer ${TEST_API_TOKEN}`);
    return original(input, { ...init, headers });
  }) as typeof fetch;
}

export interface ServerHandle {
  child: ChildProcess;
  port: number;
  baseUrl: string;
  stop(): Promise<void>;
}

export async function startServer(
  options: { env?: Record<string, string>; cwd?: string } = {}
): Promise<ServerHandle> {
  const port = await getFreePort();
  const cwd = options.cwd ?? REPO_ROOT;
  installAuthFetch();

  const env = {
    ...process.env,
    PORT: String(port),
    // Keep the key state deterministic: tests assert both the
    // "no key configured" and the explicit env-key source paths.
    GEMINI_API_KEY: "",
    // The suite exercises the authenticated posture; tests/auth.test.ts asserts
    // enforcement and the anonymous fallback separately.
    REDDY_API_TOKEN: TEST_API_TOKEN,
    ...options.env,
  };

  const child = spawn(tsxExecutable(), [path.join(REPO_ROOT, "server.ts")], {
    cwd,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const stderr: string[] = [];
  const stdout: string[] = [];
  child.stderr?.on("data", (d) => stderr.push(String(d)));
  child.stdout?.on("data", (d) => stdout.push(String(d)));

  const baseUrl = `http://127.0.0.1:${port}`;

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `Server exited early (code ${child.exitCode}). stdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`
      );
    }
    try {
      const res = await fetch(`${baseUrl}/api/skills`);
      if (res.ok) {
        return {
          child,
          port,
          baseUrl,
          async stop() {
            if (child.exitCode === null) {
              child.kill("SIGTERM");
              await new Promise<void>((resolve) => {
                const t = setTimeout(() => {
                  child.kill("SIGKILL");
                  resolve();
                }, 3000);
                child.on("exit", () => {
                  clearTimeout(t);
                  resolve();
                });
              });
            }
          },
        };
      }
    } catch {
      // not up yet — retry
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  child.kill("SIGKILL");
  throw new Error(
    `Server did not become ready on ${baseUrl}. stdout:\n${stdout.join("")}\nstderr:\n${stderr.join("")}`
  );
}

/** Copies a fixture directory into a fresh temp dir and returns its path. */
export async function copyFixtureToTemp(fixtureDir: string): Promise<string> {
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "reddy-test-"));
  await fs.promises.cp(fixtureDir, tmpRoot, { recursive: true });
  return tmpRoot;
}
