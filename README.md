VORTEX is an elite, fault-tolerant bounty escrow system built on **Algorand**. It replaces traditional "hope-based" escrow with **Code-is-Law Enforcement** via a multi-modal AI verification pipeline and 2-of-3 Oracle consensus.

## ⚔️ The Problem
Centralized freelancing platforms suffer from subjective dispute resolution, high fees, and opaque performance metrics. Buyers "hope" the work is good, and solvers "hope" they get paid.

## 🌪️ The VORTEX Solution
VORTEX creates a trustless bridge between Buyers and Solvers:
1.  **AI Sealer**: Translates ambiguous descriptions into objective, mathematically verifiable constraints.
2.  **Forensic Pipeline**: Every submission passes through:
    *   **Layer 1 (Static)**: AST analysis for security and logic discordance.
    *   **Layer 2 (Sandbox)**: Isolated Docker execution with automated test suites.
    *   **Layer 3 (AI Jury)**: Multi-modal vision/language evaluation via Gemini AI.
3.  **Oracle Settlement**: A 2-of-3 decentralized Oracle consensus triggers on-chain releases via Algorand Smart Contracts.
4.  **Mastery NFTs**: On-chain credentials (ASAs) provide sovereign proof of performance.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+ & npm
*   Python 3.10+
*   Docker (for Solver Sandbox)
*   AlgoKit (for local deployment)

### 1. Repository Setup
```bash
git clone https://github.com/sharonjoseph12/vortex_reva.git
cd vortex_reva
```

### 2. Backend Initialization
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Update .env with your GEMINI_API_KEY
uvicorn main:app --reload
```

### 3. Frontend Initialization
```bash
cd ../frontend
npm install
cp .env.example .env
npm run dev
```

### 4. Smart Contract Deployment (LocalNet)
```bash
cd ../contracts
python deploy.py
# This will deploy the escrow contract and generate Oracle credentials in backend/.env
```

---

## 🛠️ Tech Stack
*   **Blockchain**: Algorand (PyTEAL / Puya)
*   **Backend**: FastAPI, SQLAlchemy, SQLite
*   **AI**: Google Gemini (Pro 2.0 / Flash)
*   **Forensics**: Docker SDK (Sandbox Execution)
*   **Frontend**: Next.js 14, Lucide, Sonner

## 📄 Submission Details
*   **App ID**: 1001
*   **GitHub**: [sharonjoseph12/vortex_reva](https://github.com/sharonjoseph12/vortex_reva)
*   **Submission Date**: April 11, 2026
