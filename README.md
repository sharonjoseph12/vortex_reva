<div align="center">
  <img src="frontend/public/icon.svg" width="120" alt="VORTEX Logo" />
  <h1>VORTEX Protocol</h1>
  <p><strong>The Sovereign Escrow & Fault-Tolerant Resolution Engine for Web3</strong></p>
  
  [![Algorand](https://img.shields.io/badge/Blockchain-Algorand-black?style=flat-square&logo=algorand)]()
  [![AI](https://img.shields.io/badge/AI_Engine-Gemini_2.5_Flash-blue?style=flat-square)]()
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

## 🚀 Deployment (Containerized Production)

VORTEX operates utilizing industry-standard infrastructure multiplexing. You can spin up the full backend, worker nodes, and PostgreSQL architecture instantly.

### Prerequisites
*   Docker & Docker Compose
*   Node.js 18+ (For Frontend)
*   Supabase Account (For Realtime WebSockets)

### 1. Unified Backend Initialization
```bash
git clone https://github.com/sharonjoseph12/vortex_reva.git
cd vortex_reva

# Spin up Postgres, Redis, the API server, and Celery Workers
docker-compose up -d
```
> *Note: VORTEX uses Docker socket passthrough (`/var/run/docker.sock`) to allow Celery workers to spawn secure solver sandboxes.*

### 2. Frontend Edge Initialization
```bash
cd frontend
npm install
cp .env.example .env.local
npx next build
npm start
```

### 3. Smart Contract Deployment (LocalNet)
```bash
cd contracts
python deploy.py
# This will deploy the escrow contract to Algorand and generate Oracle credentials.
```

## 🛠️ Stack Architecture

*   **Network Level**: Algorand (PyTEAL / Python Native)
*   **API & Worker Layer**: FastAPI, Celery, Redis
*   **Database**: PostgreSQL 15 (SQLAlchemy ORM)
*   **AI Engine**: Google Gemini 2.5 Flash (Multi-Agent Setup)
*   **Frontend**: Next.js 16 (Turbopack), Tailwind CSS, Supabase Realtime
*   **Godmode Tools**: Playwright Chromium, httpx

---
<div align="center">
  <p>Engineered for unwavering trust and absolute execution.</p>
</div>
