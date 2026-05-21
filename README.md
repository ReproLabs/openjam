# OpenJam

> The open-source alternative to [jam.dev](https://jam.dev) — bug reports that engineers actually want to receive.

OpenJam is a browser extension + web dashboard that captures everything an engineer needs to reproduce a bug: a screen recording, console logs, network requests, the user's environment, and repro steps — all in a single shareable link.

Stop receiving bug reports that say *"it's broken"*. Start receiving bug reports with the stack trace, the failing API call, and a video of exactly what happened.

---

## Features

- 🎥 **One-click bug capture** — Record your screen, the console, and the network tab with a single click from any browser tab
- 🌐 **Full network & console replay** — Reviewers see the exact requests, responses, and errors the reporter saw
- 🖥️ **Auto-captured environment** — Browser, OS, viewport, user agent, URL, and any custom metadata you attach
- 🔗 **Shareable links** — Every capture gets a permanent URL. Drop it in Slack, Jira, Linear, or GitHub
- 💬 **Comments & annotations** — Discuss the bug in-context, frame by frame
- 🔌 **Integrations** — Send captures to Jira, Linear, GitHub Issues, Slack (roadmap)
- 🏠 **Self-hostable** — Run OpenJam on your own infrastructure. Your bug reports, your data.
- 🆓 **Open source** — AGPL-3.0 licensed. Fork it, extend it, ship it.

---

## How it works

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Browser         │     │  OpenJam         │     │  Web Dashboard   │
│  Extension       │────▶│  Backend         │────▶│  (React)         │
│  (Chrome/Firefox)│     │  (Spring Boot)   │     │                  │
└──────────────────┘     └──────────────────┘     └──────────────────┘
   Captures:                Stores:                  Plays back:
   • Screen video           • Recordings (S3)        • Video + timeline
   • Console logs           • Logs & network         • Console output
   • Network requests       • Metadata (Postgres)    • Network waterfall
   • Page metadata          • Comments               • Comments thread
```

---

## Tech stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Extension   | TypeScript, Manifest V3, WebRTC     |
| Frontend    | React, TypeScript, Vite, TailwindCSS|
| Backend     | Java 21, Spring Boot 3, Spring Security |
| Database    | PostgreSQL                          |
| Storage     | S3-compatible (AWS S3, MinIO, R2)   |
| Auth        | JWT + OAuth (Google, GitHub)        |

---

## Getting started

### Prerequisites

- Java 21+
- Node.js 20+
- PostgreSQL 15+
- An S3-compatible bucket (or [MinIO](https://min.io/) locally)

### Quick start (local dev)

```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/openjam.git
cd openjam

# 2. Start backend (Spring Boot)
cd backend
./mvnw spring-boot:run

# 3. Start frontend (Vite)
cd ../frontend
npm install
npm run dev

# 4. Load the extension
# Open chrome://extensions, enable Developer Mode,
# click "Load unpacked", and select the extension/dist folder
cd ../extension
npm install
npm run build
```

The dashboard will be available at `http://localhost:5173` and the API at `http://localhost:8080`.

### Self-hosting with Docker

```bash
docker compose up -d
```

See [docs/self-hosting.md](docs/self-hosting.md) for production deployment guides (AWS, GCP, Fly.io, Railway).

---

## Project structure

```
openjam/
├── backend/        # Spring Boot API
├── frontend/       # React dashboard
├── extension/      # Chrome/Firefox extension
├── shared/         # Shared TypeScript types
├── docs/           # Documentation
└── docker/         # Docker compose & deployment configs
```

---

## Roadmap

- [ ] MVP: screen recording + console + network capture
- [ ] Shareable replay links
- [ ] Comments & annotations
- [ ] Team workspaces
- [ ] Jira / Linear / GitHub integrations
- [ ] Slack integration
- [ ] AI-generated bug summaries
- [ ] Mobile bug capture (iOS / Android SDK)
- [ ] Source map support for production stack traces

---

## Contributing

Contributions are welcome! Whether it's a bug fix, a new integration, or improving the docs — please open an issue first to discuss what you'd like to change.

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and coding standards.

---

## OpenJam Cloud

Don't want to self-host? **OpenJam Cloud** (coming soon) offers a managed version with:

- Zero-setup hosting
- Team collaboration features
- Advanced integrations
- Priority support

The core product will always remain open source. Cloud just saves you the ops work.

---

## License

[AGPL-3.0](LICENSE) © OpenJam contributors

OpenJam is licensed under the GNU Affero General Public License v3.0. This means you are free to use, modify, and self-host OpenJam — but if you run a modified version as a network service, you must make your source code available under the same license.

For commercial licensing options (if AGPL doesn't fit your use case), please [open an issue](../../issues) or contact the maintainers.

OpenJam is not affiliated with jam.dev.
