# OpenJam — 6-Month Plan

> Goal: ship feature parity with jam.dev's **core bug-capture flow** in 6 months, working solo at ~10 hrs/week (~260 hours total).

## North star

A developer can install our extension, click record, capture a bug with full context (video + console + network + environment), and share a single link that lets a reviewer replay the bug exactly as it happened — all on a self-hostable open-source stack.

If a reviewer can watch the capture, see the failing network request, read the console error, and leave a comment — we've matched jam.dev's core value prop. Everything beyond that is stretch.

---

## What's IN scope (core flow)

1. **Capture** — Browser extension records screen + tab audio, console logs, network requests, and page metadata.
2. **Upload** — Capture is sent to the backend, video to object storage, structured data to Postgres.
3. **Replay** — Web dashboard plays back the video alongside a synchronized timeline of console and network events.
4. **Share** — Every capture gets a public (or auth-gated) URL anyone can open.
5. **Comment** — Reviewers can leave threaded comments on a capture.
6. **Auth** — Email + GitHub OAuth login, personal workspace, basic team support.

## What's OUT of scope for v1 (stretch / post-launch)

- Jira / Linear / GitHub Issues integrations
- Slack integration
- AI-generated bug summaries
- Mobile SDK (iOS / Android)
- Source map support for production stack traces
- Real-time collaboration (multiple reviewers watching simultaneously)
- Self-hosted enterprise features (SSO, audit logs)
- Annotations / drawing on video frames

These go on the roadmap, not in v1.

---

## Capacity model

- **Available:** 10 hrs/week × 26 weeks = **260 hours**
- **Buffer for: bugs, learning, life, scope creep** = ~25% = 65 hours
- **Effective build time:** **~195 hours**

Every milestone below is sized in hours. If actuals overrun by >30%, cut scope, don't extend timeline.

---

## Month 1 — Foundations (Weeks 1-4, ~40h)

**Goal: scaffolding done, "hello world" capture works locally.**

| Task | Est. |
|---|---|
| Repo scaffolding: monorepo layout (backend / frontend / extension / shared) | 4h |
| Spring Boot backend: project setup, Postgres + Flyway migrations, healthcheck endpoint | 6h |
| React + Vite + Tailwind frontend scaffold, routing, basic layout | 4h |
| Chrome extension (Manifest V3) scaffold with TypeScript build | 4h |
| **First real feature:** Extension records screen via `chrome.tabCapture` / `getDisplayMedia`, saves to local blob | 8h |
| Backend endpoint: `POST /captures` accepts video blob, stores to local filesystem (S3 swap-in later) | 6h |
| Frontend: minimal "capture detail" page that plays back the uploaded video | 4h |
| Docker compose for Postgres + backend + frontend (dev env) | 4h |

**End of Month 1 demo:** Click extension button → record screen → upload → see playback in dashboard. No auth, no logs, no network capture. Just the spine.

---

## Month 2 — Console & Network Capture (Weeks 5-8, ~40h)

**Goal: capture the data that actually makes bug reports useful.**

| Task | Est. |
|---|---|
| Extension: inject content script that proxies `console.log/warn/error` and serializes to structured events | 8h |
| Extension: capture network requests via `chrome.webRequest` API (URL, method, status, timing, headers) | 8h |
| Extension: bundle console + network events with timestamps relative to video start | 4h |
| Backend: schema for `events` table (capture_id, type, timestamp_ms, payload jsonb) | 4h |
| Backend: `POST /captures/:id/events` bulk endpoint | 4h |
| Frontend: console panel with filtering by level (log/warn/error) | 6h |
| Frontend: network panel with waterfall view (simplified, no full Chrome DevTools clone) | 6h |

**End of Month 2 demo:** Capture a bug on a real site → see video + console errors + failing network requests, all timestamp-aligned. **This is the core value prop, done.**

---

## Month 3 — Auth, Sharing, Storage (Weeks 9-12, ~40h)

**Goal: make it shareable and multi-user.**

| Task | Est. |
|---|---|
| Backend: Spring Security + JWT, user table, sessions | 8h |
| Backend: GitHub OAuth login | 4h |
| Frontend: login/signup, protected routes, user menu | 6h |
| S3-compatible storage: swap local filesystem for S3 SDK (works with AWS S3 + MinIO) | 6h |
| Shareable links: public capture URL with unguessable slug, view-only mode for unauthenticated viewers | 4h |
| Workspace model: user belongs to a personal workspace, captures belong to a workspace | 6h |
| Capture list page: see all your captures, search by URL/title | 4h |
| Privacy: per-capture visibility toggle (private / workspace / public link) | 2h |

**End of Month 3 demo:** Sign in with GitHub, record a bug, copy the share link, send it to a friend who can view (but not edit) without signing up.

---

## Month 4 — Replay Polish & Comments (Weeks 13-16, ~40h)

**Goal: the replay experience should feel as good as jam.dev's.**

| Task | Est. |
|---|---|
| Replay UI: video player + timeline scrubber synced to console/network panels | 10h |
| Replay UI: click a console/network event → video jumps to that timestamp | 4h |
| Replay UI: video controls (playback speed, fullscreen, frame-step) | 4h |
| Capture metadata panel: browser, OS, viewport, URL, custom tags | 4h |
| Comments: backend schema (`comments` table, threaded), endpoints | 4h |
| Comments: frontend thread UI with markdown support | 6h |
| Comments: optional pin-to-timestamp (comment references a moment in the video) | 4h |
| Email notifications on new comments (use a simple SMTP setup, no fancy templates) | 4h |

**End of Month 4 demo:** Full jam.dev-style replay. Reviewer can scrub through the bug, click console errors to jump to them, and leave a comment pinned to a specific moment.

---

## Month 5 — Teams, Polish, Self-Host (Weeks 17-20, ~40h)

**Goal: ready for real users to self-host and small teams to use.**

| Task | Est. |
|---|---|
| Team workspaces: invite users by email, role-based access (owner/member) | 8h |
| Team capture sharing: captures default to team-visible | 4h |
| Extension UX polish: better recording UI, pause/resume, pre-flight checks | 8h |
| Firefox extension support (Manifest V3 with Firefox-specific tweaks) | 6h |
| Self-host docs: docker-compose.yml, env var reference, Postgres + MinIO setup | 6h |
| One-click deploy buttons: Railway, Fly.io, Render | 4h |
| Settings page: workspace settings, billing placeholder, danger zone | 4h |

**End of Month 5 demo:** A small team can sign up, invite each other, capture bugs, and view them in a shared workspace. Self-host docs let anyone deploy OpenJam to their own infra in under 30 minutes.

---

## Month 6 — Launch & Hardening (Weeks 21-26, ~50h)

**Goal: ship publicly, get first 100 users / 500 GitHub stars.**

| Task | Est. |
|---|---|
| Error handling pass: every API call has retry + user-visible error states | 6h |
| Performance pass: extension memory profile, large-capture handling (60+ min recordings) | 6h |
| Privacy: redact sensitive headers (Authorization, Cookie) by default, configurable allowlist | 4h |
| Security: rate limits, file upload size caps, basic abuse prevention | 4h |
| Landing page: marketing site at root domain explaining what OpenJam is, with demo video | 6h |
| Demo capture: pre-loaded public capture anyone can click without signing up | 2h |
| Docs site (Docusaurus or Astro Starlight): self-host guide, extension setup, API reference | 8h |
| Launch prep: Product Hunt assets, Show HN draft, screenshots, demo GIF | 4h |
| **Launch:** Show HN, Product Hunt, /r/selfhosted, /r/opensource, dev.to writeup | 4h |
| Post-launch: triage issues, fix top-reported bugs, respond to GitHub issues | 6h |

**End of Month 6:** Public launch. OpenJam v1.0 is live, self-hostable, and feature-parity with jam.dev's core flow. Targeting 500 GitHub stars and first 100 hosted-or-self-hosted users in the launch week.

---

## Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Chrome extension review delays / Manifest V3 quirks | High | Get extension on Chrome Web Store by end of Month 3, not Month 6 |
| Video storage costs spiral on hosted version | Medium | Self-host first, hosted version is post-v1 |
| Trademark issue with name "OpenJam" | Medium | Already noted — be ready to rename if C&D arrives |
| Scope creep ("just one more feature") | High | This document. Cut features, don't extend timeline |
| Burnout from nights/weekends pace | High | Take one full week off mid-plan (built into buffer) |
| Capture quality issues on complex SPAs | Medium | Test against React/Vue/Angular demo apps from Month 2 onward |

---

## What I'm explicitly NOT building in 6 months

Saying this out loud so I don't sneak it in:

- ❌ Jira / Linear / GitHub Issues integrations
- ❌ Slack integration
- ❌ AI bug summaries
- ❌ Mobile SDK
- ❌ Source maps for prod stack traces
- ❌ SSO / SAML
- ❌ Real-time multi-reviewer
- ❌ Annotations / drawing tools
- ❌ Hosted SaaS billing
- ❌ Marketplace / plugins

These are all good ideas. They're for v1.1+.

---

## Weekly cadence

- **Saturday morning (4h):** Deep work — biggest task of the week
- **Sunday morning (3h):** Continue deep work or polish
- **Two weekday evenings (1.5h each):** Smaller tasks, code review of own PRs, docs

If a week is missed (life happens), don't double up the next week — drop a task instead.

---

## Definition of done for v1.0

- [ ] Extension works in Chrome + Firefox
- [ ] Records screen + console + network + metadata
- [ ] Backend stores captures in S3-compatible storage
- [ ] Replay UI plays back video + timeline + console + network
- [ ] Shareable public links
- [ ] Comments with markdown + timestamp pinning
- [ ] GitHub OAuth + email auth
- [ ] Team workspaces with invites
- [ ] Self-host docs + docker-compose
- [ ] Landing page + demo capture
- [ ] Docs site live
- [ ] AGPL-3.0 license, contributing guide, code of conduct
