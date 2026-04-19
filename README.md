<div align="center">
  <img src="frontend/public/icon.svg" width="120" alt="VORTEX Logo" />
  <h1>VORTEX Protocol</h1>
  <p><strong>The Sovereign Escrow & Fault-Tolerant Resolution Engine for Web3</strong></p>
  
  [![Algorand](https://img.shields.io/badge/Blockchain-Algorand-black?style=flat-square&logo=algorand)]()
  [![AI](https://img.shields.io/badge/AI_Engine-Gemini_2.5_Flash-blue?style=flat-square)]()
  [![Next.js](https://img.shields.io/badge/Frontend-Next.js_16-000?style=flat-square&logo=nextdotjs)]()
  [![FastAPI](https://img.shields.io/badge/API-FastAPI-009688?style=flat-square&logo=fastapi)]()
  [![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL_15-336791?style=flat-square&logo=postgresql)]()
  [![Docker](https://img.shields.io/badge/Deployment-Containerized-2496ED?style=flat-square&logo=docker)]()
</div>

---

**VORTEX** is an elite, fault-tolerant bounty escrow system built organically on **Algorand**. It replaces traditional "hope-based" freelancing escrow with **Code-is-Law Enforcement** via a multi-modal AI verification pipeline and 2-of-3 Oracle consensus. 

By eliminating subjective human dispute boards, VORTEX achieves deterministic logic resolution at a 1000x faster settlement velocity than legacy platforms like Upwork or Fiverr.

## ⚔️ The Problem
Centralized platforms suffer from subjective dispute resolution, high fees (up to 20%), and opaque performance metrics. Buyers "hope" the work is good, and solvers "hope" they get paid. Submissions are easily plagued by hidden AI prompt injections or buggy spaghetti code.

## 🌪️ The "10,000 Crore" VORTEX Solution
VORTEX creates a sovereign, trustless bridge utilizing next-generation cloud infrastructure:

1.  **Strict Financial Accounting**: Core ledger attributes operate purely on exact microAlgos (via `Numeric` PostgreSQL typing), eliminating completely floating-point bleed.
2.  **Multimodal "Godmode" Execution**: 
    *   **Layer 1 (Static)**: Automated AST analysis drops all dangerous execution imports.
    *   **Layer 2 (Isolation)**: Automated Docker execution spins up completely detached Serverless Sandboxes.
    *   **Layer 3 (AI Jury Engine)**: Multi-modal Native Vision evaluation utilizing Headless Playwright (live Web App screenshots) and binary PDF ingestion to pass deep insights into Gemini 2.5 Flash.
    *   **Layer 4 (Adversarial Firewall)**: Screens payloads dynamically against Prompt Injections and Jailbreaks.
3.  **Oracle Settlement**: A 2-of-3 decentralized Oracle node network executes the Algorand Smart Contract releases, mitigating central points of failure.
4.  **Edge Telemetry**: All UI telemetry is piped via `supabase-js` WebSockets, decoupling UI dashboards from database query latency.

---

## 📁 Project Structure

```
vortex_reva/
├── backend/                # FastAPI + Celery workers
│   ├── main.py             # API entrypoint (lifespan, middleware, routers)
│   ├── worker.py           # Celery worker — AI pipeline orchestration
│   ├── models.py           # SQLAlchemy ORM models
│   ├── database.py         # DB engine, session management
│   ├── algorand_client.py  # Algorand SDK integration
│   ├── oracle.py           # 2-of-3 Oracle consensus engine
│   ├── sandbox.py          # Docker sandbox for solver code execution
│   ├── security.py         # Prompt injection & adversarial firewall
│   ├── test_generator.py   # AI-powered test generation (Gemini)
│   ├── routers/            # Modular API routers
│   │   ├── identity.py     # Auth & user profiles
│   │   ├── marketplace.py  # Bounty CRUD & submissions
│   │   ├── pipeline.py     # AI verification pipeline
│   │   ├── governance.py   # Dispute resolution & voting
│   │   ├── telemetry.py    # Realtime SSE telemetry
│   │   ├── comments.py     # Bounty discussion threads
│   │   └── health.py       # Health checks
│   ├── migrations/         # Alembic database migrations
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/               # Next.js 16 (React 19, Turbopack)
│   ├── app/                # App Router pages
│   │   ├── bounties/       # Bounty listing & creation
│   │   ├── dashboard/      # User dashboard
│   │   ├── disputes/       # Dispute resolution UI
│   │   ├── governance/     # DAO governance panel
│   │   ├── profiles/       # Sovereign developer profiles
│   │   ├── protocol/       # Protocol analytics
│   │   ├── transactions/   # On-chain transaction feed
│   │   └── admin/          # Admin panel
│   ├── components/         # Reusable UI components
│   └── lib/                # Client utilities & stores
├── contracts/              # Algorand smart contracts
│   ├── escrow.py           # PyTEAL escrow contract
│   └── deploy.py           # Contract deployment script
├── docker-compose.yml      # Full-stack containerized deployment
└── .env.example            # Environment variable template
```

---

## 🚀 Getting Started

### Prerequisites
*   Python 3.11+
*   Node.js 18+
*   Docker & Docker Compose *(for sandbox execution & production deployment)*
*   Supabase Account *(for Realtime WebSockets)*
*   Google Gemini API Key

### 1. Clone & Configure

```bash
git clone https://github.com/sharonjoseph12/vortex_reva.git
cd vortex_reva

# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env with your keys (Gemini, Algorand, Supabase, etc.)
```

### 2. Local Development (Recommended)

**Backend** — uses SQLite by default, no Docker required:
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt

# Run API server
uvicorn main:app --reload --port 8000

# In a separate terminal — run Celery worker
celery -A celery_app worker --loglevel=info --pool=solo
```

**Frontend**:
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with Supabase URL and anon key
npm run dev
```

Access the application at **http://localhost:3000** with API docs at **http://localhost:8000/docs**.

### 3. Containerized Production

Spin up the full backend, worker nodes, and PostgreSQL with a single command:

```bash
docker-compose up -d
```

> **Note**: VORTEX uses Docker socket passthrough (`/var/run/docker.sock`) to allow Celery workers to spawn secure solver sandboxes.

### 4. Smart Contract Deployment (TestNet)

```bash
cd contracts
python deploy.py
# Deploys the escrow contract to Algorand and generates Oracle credentials.
```

---

## 🛠️ Stack Architecture

| Layer | Technology |
|---|---|
| **Blockchain** | Algorand (PyTEAL / Python Native) |
| **API & Workers** | FastAPI, Celery, Redis |
| **Database** | SQLite (dev) / PostgreSQL 15 (prod) — SQLAlchemy ORM, Alembic |
| **AI Engine** | Google Gemini 2.5 Flash (Multi-Agent Setup) |
| **Frontend** | Next.js 16 (Turbopack), React 19, Zustand, CSS Modules |
| **Realtime** | Supabase Realtime (WebSockets), SSE Telemetry |
| **Wallets** | Pera Wallet, Defly Wallet |
| **Sandbox** | Docker-in-Docker isolated execution |
| **Monitoring** | Sentry (opt-in), Structlog JSON logging |
| **Rate Limiting** | SlowAPI |

---

## 🔐 Environment Variables

See [`.env.example`](.env.example) for the full template. Key variables:

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for AI Jury engine |
| `ALGORAND_ALGOD_URL` | Algorand node endpoint |
| `ORACLE_[1-3]_MNEMONIC` | 2-of-3 Oracle node mnemonics |
| `DATABASE_URL` | SQLite (dev) or PostgreSQL (prod) connection string |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `SECRET_KEY` | JWT signing key |
| `VORTEX_DEMO_MODE` | `true` for demo, `false` for on-chain escrow |
| `SENTRY_DSN` | *(Optional)* Sentry error tracking |

---

<div align="center">
  <p>Engineered for unwavering trust and absolute execution.</p>
</div>
