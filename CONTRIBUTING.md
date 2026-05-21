# Contributing to OpenJam

First — thanks for considering a contribution. OpenJam is built in the open and we want it to stay that way.

This guide covers how to get a dev environment running, how to propose changes, and the conventions we follow.

---

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior to the maintainers.

---

## Before you start

- **Big changes:** Open an issue first to discuss the design. We'd rather talk before you spend hours on a PR we can't merge.
- **Small changes:** Typos, doc fixes, obvious bugs — feel free to send a PR directly.
- **Check the [roadmap](PLAN.md):** We have an explicit scope for v1.0. Features outside of that scope are welcome on the v1.1+ roadmap but probably won't be merged into v1.

---

## Development setup

### Prerequisites

- Java 21+ (for the Spring Boot backend)
- Node.js 20+ (for the frontend and extension)
- PostgreSQL 15+ (or use the bundled Docker setup)
- An S3-compatible bucket (or [MinIO](https://min.io/) locally)

### First-time setup

```bash
# Fork the repo, then:
git clone https://github.com/YOUR_USERNAME/openjam.git
cd openjam

# Backend
cd backend
./mvnw spring-boot:run

# Frontend (in a new terminal)
cd frontend
npm install
npm run dev

# Extension (in a new terminal)
cd extension
npm install
npm run build
# Then load extension/dist as an unpacked extension in Chrome
```

Or use Docker for the full stack:

```bash
docker compose up -d
```

---

## Workflow

1. **Fork** the repo and create your branch from `main`.
2. Use a descriptive branch name: `feat/network-panel`, `fix/replay-scrubber-jitter`, `docs/self-host-guide`.
3. **Make your changes.** Keep PRs focused — one concern per PR.
4. **Test your changes.** Run existing tests (`./mvnw test` and `npm test`) and add new ones where it makes sense.
5. **Open a PR** against `main`. Describe what changed and why. Link any related issues.
6. A maintainer will review. Expect a few rounds of feedback — that's normal.

---

## Commit messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add network request panel to replay view
fix: prevent video upload from stalling on slow connections
docs: clarify self-host storage requirements
chore: bump spring-boot to 3.2.5
refactor: extract capture-event serialization into shared module
test: add coverage for console-event timestamp alignment
```

Use the imperative mood ("add" not "added"), keep the first line under 72 characters, and put detail in the body if needed.

---

## Coding conventions

### Backend (Java / Spring Boot)
- Java 21 features welcome (records, pattern matching, etc.)
- Follow standard Spring Boot conventions
- Format with `./mvnw spotless:apply` before committing
- Write tests for non-trivial logic; we use JUnit 5 + Mockito + Testcontainers

### Frontend (React / TypeScript)
- TypeScript strict mode is on. No `any` without a comment explaining why.
- Function components + hooks only
- TailwindCSS for styling
- Format with `npm run format` (Prettier) before committing

### Extension
- Manifest V3
- Keep the content script as small as possible — performance on the user's page matters
- All capture data is timestamp-aligned to a single capture-start moment

---

## Contributor License Agreement (CLA)

OpenJam is licensed under AGPL-3.0. Before we can accept your contribution, you'll be asked to sign a Contributor License Agreement on your first PR. The CLA lets us:

- Defend the project legally if needed
- Offer commercial / dual-license terms to enterprise users who can't adopt AGPL

You retain full copyright to your contribution. The CLA grants ReproLabs the right to relicense your contribution under other licenses. If you're not okay with that, that's fine — please open an issue and we'll discuss alternatives, but we can't merge contributions without it.

---

## Reporting bugs

Open a GitHub issue using the **Bug report** template. Include:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your environment (OS, browser, OpenJam version)
- A capture/recording if you can — yes, we eat our own dogfood

---

## Suggesting features

Open a GitHub issue using the **Feature request** template. Include:

- The problem you're trying to solve (not just the solution)
- How it fits the existing product
- Any prior art (jam.dev, other tools, your own previous work)

---

## Questions?

Open a [Discussion](../../discussions) on GitHub. We're friendly.
