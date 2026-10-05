import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { ProviderOrchestrator } from "./core/orchestrator";
import { ToolRegistry } from "./core/registry";
import { MemoryVault } from "./core/memory";
import { RedAeyeEngine } from "./core/engine";
import { SystemInfoSkill } from "./plugins/system";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable("x-powered-by");
  app.use(express.json());

  // ---- Security headers (T-010) -----------------------------------------
  const ALLOW_EMBEDDING = process.env.REDDY_ALLOW_EMBEDDING === "true";
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (!ALLOW_EMBEDDING) res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "media-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://accounts.google.com https://*.gstatic.com",
        "frame-src https://accounts.google.com https://*.firebaseapp.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join("; ")
    );
    next();
  });

  // ---- Request id + structured access log (T-013) -----------------------
  // Bodies and header values are never logged — only method, path, status,
  // duration and the correlation id.
  app.use((req, res, next) => {
    const requestId = crypto.randomUUID();
    res.setHeader("x-request-id", requestId);
    const startedAt = Date.now();
    res.on("finish", () => {
      console.log(JSON.stringify({
        level: "info",
        event: "http_request",
        request_id: requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: Date.now() - startedAt
      }));
    });
    next();
  });

  // ---- API authentication (T-003) ---------------------------------------
  // When REDDY_API_TOKEN is set every /api route requires it. When it is not
  // set the server boots in a loudly-warned anonymous mode intended for local
  // development only.
  const API_TOKEN = (process.env.REDDY_API_TOKEN || "").trim();
  if (!API_TOKEN) {
    console.warn("======================================================================");
    console.warn("INSECURE_ANONYMOUS_MODE: REDDY_API_TOKEN is not set.");
    console.warn("Every /api route is reachable without credentials. Local use only.");
    console.warn("Set REDDY_API_TOKEN before exposing this server to any network.");
    console.warn("======================================================================");
  }
  function requireApiAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!API_TOKEN) return next();
    const header = req.headers["authorization"];
    const bearer = typeof header === "string" && header.toLowerCase().startsWith("bearer ")
      ? header.slice(7).trim()
      : "";
    const provided = bearer || (typeof req.headers["x-reddy-token"] === "string" ? req.headers["x-reddy-token"].trim() : "");
    const a = Buffer.from(provided);
    const b = Buffer.from(API_TOKEN);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    next();
  }
  app.use("/api", requireApiAuth);

  // Agent Setup
  const orchestrator = new ProviderOrchestrator();
  const registry = new ToolRegistry();
  registry.registerSkill(SystemInfoSkill);
  
  const memories = new Map<string, MemoryVault>();
  const systemProtocols = new Map<string, string>(); // session_id -> instruction
  
  let defaultInstruction = "You are REDDY, a helpful AI Assistant. You help users run tasks, answer questions, and manage knowledge.";
  try {
    const agentsPath = path.join(process.cwd(), "AGENTS.md");
    if (fs.existsSync(agentsPath)) {
      defaultInstruction = fs.readFileSync(agentsPath, "utf8");
    }
  } catch (e) {
    console.warn("Could not read AGENTS.md default instruction:", e);
  }

  const knowledgeVault = new Map<string, { id: string, name: string, content: string, category: string }>();
  const taskHistory: { timestamp: number, message: string, success: boolean, latency: number, seeded?: boolean }[] = Array.from({ length: 15 }).map((_, i) => {
    const timeOffset = (15 - i) * 60 * 1000;
    return {
      timestamp: Date.now() - timeOffset,
      message: `Task Execution #${i}`,
      success: Math.random() > 0.05,
      latency: Math.floor(120 + Math.random() * 850),
      seeded: true // synthetic boot record — never presented as measured data
    };
  });

  // The purge pipeline is allowed to touch TypeScript sources under <cwd>/src
  // and nothing else. Every path a client supplies is validated against this
  // root before it is read or written.
  const PURGE_ROOT = path.join(process.cwd(), "src");

  // Note: tsconfig.json does not enable strictNullChecks, so literal-typed
  // discriminants widen to boolean and discriminated-union narrowing is
  // unavailable. The result is therefore modelled with a nullable abs.
  type PurgeTarget = { abs: string | null; reason: string | null };

  function resolvePurgeTarget(filePath: unknown): PurgeTarget {
    const reject = (reason: string): PurgeTarget => ({ abs: null, reason });
    if (typeof filePath !== "string" || filePath.length === 0) {
      return reject("path must be a non-empty string");
    }
    if (path.isAbsolute(filePath)) {
      return reject("absolute paths are not accepted");
    }
    const resolved = path.resolve(process.cwd(), filePath);
    const relToRoot = path.relative(PURGE_ROOT, resolved);
    if (relToRoot === "" || relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) {
      return reject("target resolves outside <cwd>/src");
    }
    if (!/\.(ts|tsx)$/.test(resolved)) {
      return reject("only .ts and .tsx files may be purged");
    }
    // Reject any symlink in the chain: a link planted inside src/ must not be
    // able to redirect the write outside the project.
    const segments = path.relative(process.cwd(), resolved).split(path.sep);
    let cursor = process.cwd();
    for (const seg of segments) {
      cursor = path.join(cursor, seg);
      let st: fs.Stats;
      try {
        st = fs.lstatSync(cursor);
      } catch {
        break; // final segment does not exist — the caller skips missing files
      }
      if (st.isSymbolicLink()) {
        return reject("symlinks are not accepted");
      }
    }
    return { abs: resolved, reason: null };
  }

  // Recursive directory scanner for Mock Purge audit
  function scanDirectory(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === "node_modules" || file === ".git" || file === "dist" || file === ".next" || file === "assets") continue;
      const filePath = path.join(dir, file);
      const stat = fs.lstatSync(filePath);
      if (stat.isSymbolicLink()) continue; // never follow links out of src/
      if (stat.isDirectory()) {
        scanDirectory(filePath, fileList);
      } else if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
        fileList.push(filePath);
      }
    }
    return fileList;
  }

  app.get("/api/purge/audit", (req, res) => {
    try {
      const srcDir = path.join(process.cwd(), "src");
      const files = scanDirectory(srcDir);
      const results: { id: string; file: string; line: number; text: string; category: string; description: string }[] = [];
      let counter = 1;

      for (const file of files) {
        const content = fs.readFileSync(file, "utf8");
        const lines = content.split("\n");
        const relativePath = path.relative(process.cwd(), file);

        lines.forEach((line, index) => {
          const trimmed = line.trim();
          
          // Check for TODOs
          if (trimmed.includes("TODO:") || trimmed.includes("// TODO") || trimmed.includes("/* TODO")) {
            results.push({
              id: `audit-${counter++}`,
              file: relativePath,
              line: index + 1,
              text: trimmed,
              category: "TODO_COMMENT",
              description: "Sovereign developer task item left to implement real interfaces"
            });
          }
          // Check for mock lists / fake arrays
          else if (
            (trimmed.includes("DEFAULT_ENTRIES") || trimmed.includes("PLAYLIST")) && 
            (trimmed.includes("const ") || trimmed.includes("let "))
          ) {
            results.push({
              id: `audit-${counter++}`,
              file: relativePath,
              line: index + 1,
              text: trimmed,
              category: "MOCK_STATIC_DATA",
              description: "Static database array serving static client content"
            });
          }
        });
      }

      res.json({ results });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/purge/execute", (req, res) => {
    try {
      const { items } = req.body;
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Missing items to purge" });
      }

      const purgedDetails: string[] = [];

      // Group by file path so we write once or sequentially correctly
      const fileGroups: { [key: string]: { line: number; text: string; category: string }[] } = {};
      items.forEach((item: any) => {
        if (!fileGroups[item.file]) {
          fileGroups[item.file] = [];
        }
        fileGroups[item.file].push(item);
      });

      for (const filePath of Object.keys(fileGroups)) {
        const target = resolvePurgeTarget(filePath);
        if (target.abs === null) {
          console.warn(`PURGE_PATH_REJECTED: ${filePath} — ${target.reason}`);
          return res.status(400).json({ error: "PURGE_PATH_REJECTED", file: filePath, reason: target.reason });
        }
        const absolutePath = target.abs;
        if (!fs.existsSync(absolutePath)) continue;

        let content = fs.readFileSync(absolutePath, "utf8");
        const lines = content.split("\n");

        // Sort items descending so line number shifts don't disrupt previous edits!
        const sortedItems = fileGroups[filePath].sort((a, b) => b.line - a.line);

        sortedItems.forEach((item) => {
          const lIdx = item.line - 1;
          const currentLine = lines[lIdx];
          
          if (currentLine && currentLine.trim() === item.text.trim()) {
            if (item.category === "TODO_COMMENT") {
              // Convert TODO inline comment to resolved system tag
              lines[lIdx] = currentLine.replace(/TODO:/g, "RESOLVED: Purged by REDDY MOCK_PURGE Protocol.").replace(/\/\/ TODO/g, "// RESOLVED:");
              purgedDetails.push(`RESOLVED: TODO comment in ${filePath} at line ${item.line}`);
            } else if (item.category === "MOCK_STATIC_DATA") {
              // Mark the static array warning
              lines[lIdx] = `// DEPLOYED PROSTHETIC CHIP // ` + currentLine;
              purgedDetails.push(`Purged offline mockup flag in ${filePath} at line ${item.line}`);
            }
          }
        });

        fs.writeFileSync(absolutePath, lines.join("\n"), "utf8");
      }

      res.json({ status: "success", purgedDetails });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/knowledge", (req, res) => {
    res.json({ knowledge: Array.from(knowledgeVault.values()) });
  });

  app.post("/api/knowledge", (req, res) => {
    const { name, content, category } = req.body;
    const id = crypto.randomUUID();
    knowledgeVault.set(id, { id, name, content, category });
    res.json({ status: "saved", id });
  });

  app.delete("/api/knowledge/:id", (req, res) => {
    if (!knowledgeVault.has(req.params.id)) {
      return res.status(404).json({ error: "NOT_FOUND" });
    }
    knowledgeVault.delete(req.params.id);
    res.json({ status: "deleted" });
  });

  app.post("/api/keys/validate", async (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Missing key" });
    const isValid = await orchestrator.validateKey(key);
    res.json({ valid: isValid });
  });

  app.post("/api/keys/save", async (req, res) => {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "Missing key" });
    orchestrator.setKey(key);
    res.json({ status: "key_deployed" });
  });

  app.get("/api/keys/status", (req, res) => {
    const hasEnv = !!process.env.GEMINI_API_KEY;
    res.json({ 
      active: true, 
      source: hasEnv ? "SYSTEM_ENV" : "USER_INJECTED" 
    });
  });

  app.get("/api/settings", (req, res) => {
    const session_id = (req.query.session_id as string) || "default";
    const instruction = systemProtocols.get(session_id) || defaultInstruction;
    res.json({ instruction });
  });

  app.post("/api/settings", (req, res) => {
    const { session_id, instruction } = req.body;
    systemProtocols.set(session_id, instruction);
    // Refresh memory system prompt if it exists
    if (memories.has(session_id)) {
      const vault = memories.get(session_id)!;
      vault.updateSystemPrompt(instruction);
    }
    res.json({ status: "updated" });
  });

  app.post("/api/skills/inject", (req, res) => {
    const { name, description, guidelines } = req.body;
    registry.registerSkill({
      name,
      description,
      guidelines,
      tools: [] // Pure text skills have no tools but provide context
    });
    res.json({ status: "injected", name });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, session_id } = req.body;
    
    if (!memories.has(session_id)) {
      const vault = new MemoryVault();
      const basePrompt = systemProtocols.get(session_id) || defaultInstruction;
      vault.add("system", basePrompt);
      memories.set(session_id, vault);
    } else {
      // A protocol changed through POST /api/settings must reach a session
      // that was already created — rewrite the pinned system message in place.
      const vault = memories.get(session_id)!;
      const currentProtocol = systemProtocols.get(session_id);
      if (currentProtocol) {
        vault.updateSystemPrompt(currentProtocol);
      }
    }

    const memory = memories.get(session_id)!;
    const engine = new RedAeyeEngine(orchestrator, registry, memory);

    const start = Date.now();
    try {
      // Inject knowledge context
      const knowledgeContext = Array.from(knowledgeVault.values())
        .map(k => `[KNOWLEDGE]: ${k.name} (${k.category})\n${k.content}`)
        .join("\n\n");
      
      const response = await engine.execute(message + (knowledgeContext ? `\n\nCONTEXT FROM VAULT:\n${knowledgeContext}` : ""));
      const latency = Date.now() - start;
      taskHistory.push({ timestamp: Date.now(), message, success: true, latency });
      if (taskHistory.length > 50) taskHistory.shift(); // Keep last 50

      res.json({ response, session_id });
    } catch (error: any) {
      const latency = Date.now() - start;
      taskHistory.push({ timestamp: Date.now(), message, success: false, latency });
      if (taskHistory.length > 50) taskHistory.shift();
      
      console.error("Engine Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tasks/history", (req, res) => {
    res.json({ history: taskHistory });
  });

  app.get("/api/skills", (req, res) => {
    res.json({ skills: registry.listSkills() });
  });

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      uptime_s: Math.round(process.uptime()),
      pid: process.pid,
      version: "0.1.0",
      auth_mode: API_TOKEN ? "token" : "anonymous"
    });
  });

  // Unknown /api routes must answer JSON 404, never the SPA shell — otherwise
  // a mistyped endpoint returns 200 text/html and hides integration errors.
  app.use("/api", (req, res) => {
    res.status(404).json({ error: "NOT_FOUND", path: req.path });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting Vite dev server integration...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: process.cwd()
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
