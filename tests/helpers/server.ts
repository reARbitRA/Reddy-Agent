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
  const env = {
    ...process.env,
    PORT: String(port),
    // Keep the key state deterministic: tests assert both the
    // "no key configured" and the explicit env-key source paths.
    GEMINI_API_KEY: "",
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
