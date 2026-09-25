# REDDY Agent

> A browser-accessible AI assistant workspace for conversational task execution, tool calling, memory, knowledge management, Google Workspace operations, and developer-oriented system diagnostics.

REDDY is a personal AI cockpit rather than a basic chat interface. It combines a React dashboard, an Express API, a Gemini-powered agent loop, configurable skills, session memory, knowledge tools, Google OAuth integrations, and a neo-brutalist operational UI.

## Highlights

- Gemini-powered conversational agent with iterative tool calling
- Session-based conversation memory with automatic context pruning
- Dynamic skill and tool registration
- In-memory knowledge vault for reusable context
- Configurable agent instructions per session
- Gemini API-key validation, saving, and status reporting
- Google Workspace operations through Firebase Google authentication
- Google Sheets, Gmail, Google Drive, and Google Docs integrations
- System diagnostics skill for CPU, memory, and operating-system metrics
- Task history, latency tracking, success-rate metrics, and charts
- Suno audio playback and playlist importing
- GitHub profile Markdown generation through Profile Studio
- Guestbook widget backed by browser `localStorage`
- Responsive neo-brutalist dashboard with CRT scanlines and engineering-grid visuals
- TypeScript validation and production build scripts

## Technology stack

- **Language:** TypeScript, TSX, CSS, HTML
- **Frontend:** React 19 + Vite
- **Backend:** Node.js + Express + `tsx`
- **AI:** Google Gemini via `@google/genai`
- **Styling:** Tailwind CSS 4 + custom CSS
- **Authentication:** Firebase Authentication with Google OAuth
- **Animation:** `motion`
- **Icons:** `lucide-react`
- **Charts:** `recharts`
- **Configuration:** `dotenv`

## Architecture

```text
Browser
  │
  ├── React dashboard
  │     ├── Chat workspace
  │     ├── Knowledge Vault
  │     ├── Key Deck
  │     ├── Workspace Widget
  │     ├── Task Tracker
  │     ├── System Status Monitor
  │     ├── Profile Studio
  │     └── Suno / Guestbook / arcade widgets
  │
  └── Express API
        ├── /api/chat
        ├── /api/knowledge
        ├── /api/tasks/history
        ├── /api/keys/*
        ├── /api/settings
        ├── /api/skills
        └── /api/purge/*
              │
              ├── RedAeyeEngine
              ├── ProviderOrchestrator
              ├── MemoryVault
              └── ToolRegistry
                      │
                      └── Google Gemini API
```

## Repository layout

```text
AGENTS.md
  Default agent identity, operating rules, and coding protocols.

server.ts
  Express entry point. Initializes the agent runtime, exposes the API,
  serves Vite during development, and serves the production frontend.

core/
  Agent runtime and orchestration.
  ├── engine.ts        Iterative Gemini agent loop and tool execution
  ├── orchestrator.ts  Gemini provider integration and API-key management
  ├── memory.ts        Session conversation storage and pruning
  └── registry.ts      Skill and tool registration/execution

plugins/
  Built-in runtime skills.
  └── system.ts        System diagnostics and get_system_metrics

src/
  React frontend.
  ├── App.tsx          Main dashboard and chat workspace
  ├── main.tsx         React bootstrap
  ├── types.ts         Shared frontend/backend contracts
  ├── index.css        Tailwind entry and dashboard visual system
  ├── components/
  │   ├── AnimatedVectorIcons.tsx
  │   ├── ArcadeCabinetWidget.tsx
  │   ├── BrutalistCard.tsx
  │   ├── GuestbookWidget.tsx
  │   ├── KeyDeck.tsx
  │   ├── KnowledgeVault.tsx
  │   ├── ProfileStudio.tsx
  │   ├── SunoWidget.tsx
  │   ├── SystemStatusMonitor.tsx
  │   ├── TaskTracker.tsx
  │   ├── TechStackGrid.tsx
  │   └── WorkspaceWidget.tsx
  └── lib/
      └── firebase.ts  Firebase and Google OAuth setup

firebase-applet-config.json
  Firebase application configuration used by the authentication layer.

vite.config.ts
  Vite, React, Tailwind, alias, and development-server configuration.

index.html
  Browser document shell.

.env.example
  Environment-variable template.
```

## How the agent works

The central runtime is `RedAeyeEngine` in `core/engine.ts`.

1. A user message is added to the current `MemoryVault`.
2. The engine retrieves the available conversation context.
3. Registered tools and skill instructions are collected.
4. The augmented conversation is sent to Gemini.
5. Gemini function calls are detected and passed to `ToolRegistry`.
6. Tool results are written back into session memory.
7. The engine continues the conversation with Gemini.
8. The loop stops when Gemini returns a final response or reaches the five-iteration safety limit.

The default agent behavior is defined in `AGENTS.md`. Session-specific instructions can be read and updated through the settings API, while knowledge entries are injected into chat requests as additional context.

## API

### Chat

```http
POST /api/chat
```

Sends a message through the REDDY agent loop. Supports session IDs and knowledge-context injection.

### Knowledge vault

```http
GET    /api/knowledge
POST   /api/knowledge
DELETE /api/knowledge/:id
```

Creates, searches, lists, and deletes in-memory knowledge entries.

### Task history

```http
GET /api/tasks/history
```

Returns task history, success information, and latency data used by the monitoring dashboard.

### Gemini keys

```http
POST /api/keys/validate
POST /api/keys/save
GET  /api/keys/status
```

Validates a supplied Gemini key, stores a key in the running process, and reports the active key source.

### Agent settings

```http
GET  /api/settings
POST /api/settings
```

Reads and updates session-specific system instructions.

### Skills

```http
GET  /api/skills
POST /api/skills/inject
```

Lists registered skills and injects text-based skills at runtime.

### Purge tools

```http
GET  /api/purge/audit
POST /api/purge/execute
```

Scans TypeScript source files for TODO comments and selected static mock-data patterns, then optionally marks matching lines as resolved.

> Review purge results carefully before executing modifications. This endpoint changes source files.

## Google Workspace integration

`WorkspaceWidget.tsx` uses Firebase Google sign-in and OAuth access tokens to communicate with Google APIs.

Supported operations include:

- List and create Google Sheets
- Read spreadsheet rows
- Append rows to spreadsheets
- Fetch recent Gmail messages
- Send Gmail messages after confirmation
- List Google Docs
- Create documents
- Read document content
- Append text to documents

To use these features, configure Firebase authentication, Google OAuth scopes, and the required Google APIs in your Google Cloud project.

## Requirements

- Node.js
- npm
- A Google Gemini API key for AI features
- Firebase configuration for Google Workspace features
- Google Cloud APIs and OAuth scopes enabled for the integrations you use

## Getting started

Clone the repository and install dependencies:

```bash
git clone https://github.com/reARbitRA/Reddy-Agent.git
cd Reddy-Agent
npm install
```

Create `.env.local` in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Production build

```bash
npm run build
npm start
```

The build creates the production frontend and bundles the server into `dist/server.cjs`.

## Available scripts

```text
npm run dev      Start the Express/Vite development server through server.ts
npm run build    Build the Vite frontend and bundle server.ts into dist/server.cjs
npm start        Start the production server
npm run clean    Remove the dist directory
npm run lint     Run TypeScript checking without emitting files
```

## Configuration

At minimum, provide:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Firebase and Google Workspace configuration is loaded through the repository's Firebase app configuration and Google Cloud project settings. Do not commit private API keys, OAuth secrets, service credentials, or production tokens.

## Current implementation notes

REDDY is currently optimized as a personal AI workspace and prototype-friendly developer cockpit.

- Conversations, settings, knowledge entries, and task history are stored in server memory.
- In-memory state is lost when the server restarts.
- The guestbook persists separately in browser `localStorage`.
- Task history starts with synthetic entries before real tasks are recorded.
- Some dashboard widgets intentionally use simulated or seeded data, including system metrics, guestbook entries, and Suno preset tracks.
- The Gemini key can be supplied through `GEMINI_API_KEY` or through the in-app key setup panel.

For a persistent multi-user deployment, replace process memory with a database and add explicit user/session authorization around knowledge, task history, settings, and key-management endpoints.

## Security considerations

Before deploying REDDY publicly:

1. Never expose Gemini or service credentials in client-side code.
2. Treat user-supplied Gemini keys as sensitive secrets.
3. Add authentication and authorization to every stateful API route.
4. Encrypt persisted API keys if key storage is introduced.
5. Restrict Google OAuth scopes to only the operations you need.
6. Require confirmation for destructive or externally visible operations such as sending Gmail messages.
7. Add rate limiting and request-size limits to the Express API.
8. Replace simulated system metrics with a clearly labeled, permission-aware implementation.
9. Review `/api/purge/execute` before enabling it in a production environment.
10. Use HTTPS and secure cookie/token handling in deployment.

## Contributing

1. Create a feature branch.
2. Keep changes focused and typed.
3. Run the validation command before opening a pull request:

```bash
npm run lint
npm run build
```

4. Document new tools, routes, environment variables, and OAuth scopes.
5. Do not commit secrets or generated credentials.

## License

Add the license that matches your intended distribution terms before publishing REDDY for external use.

## Questions

- How does `RedAeyeEngine` coordinate Gemini function calls and session memory?
- Which dashboard widgets still use mock or in-memory data, and how should they be migrated to Firebase persistence?
- How should Gemini keys and Google OAuth access tokens be secured before public deployment?
