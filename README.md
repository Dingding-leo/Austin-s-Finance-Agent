# FinanceAI - Autonomous Trading System

A comprehensive, modular trading system featuring an autonomous Python agent, a real-time React dashboard, and a Supabase backend with Edge Functions.

## 🏗 Architecture

This repository is organized as a monorepo with the following components:

### 1. Python Agent (`/finance-agent-python`)
The core trading logic and autonomous agent.
- **Key Features**: Market analysis, strategy execution, order management, risk control.
- **Tech Stack**: Python, Pandas, TA-Lib (or similar), OKX API.
- **Structure**:
  - `src/`: Source code.
  - `configs/`: Configuration files.
  - `logs/`: Operation logs.

### 2. Trading Dashboard (`/trading-dashboard`)
A modern web interface for monitoring and manual intervention.
- **Key Features**: Real-time price charts, portfolio tracking, strategy management, manual order entry.
- **Tech Stack**: React, Vite, TailwindCSS, Supabase Client.
- **Deployment**: Deployed via GitHub Pages (Workflow: `deploy-dashboard.yml`).

### 3. Backend & Database (`/supabase`)
Serverless backend and database layer.
- **Key Features**: User authentication, data persistence, secure API endpoints (Edge Functions).
- **Tech Stack**: Supabase (PostgreSQL), Deno (Edge Functions).
- **Functions**:
  - `account-value`: Securely fetches account balance/value.
  - `execute-strategy`: Handles trade execution requests.
- **Deployment**: Deployed via Supabase CLI (Workflow: `deploy-backend.yml`).

### 4. Automation Scripts (`/scripts`)
Node.js scripts for scheduled tasks and report generation.
- **Key Features**: Intraday market reports, strategy decision generation.
- **Workflows**:
  - `run-reports.yml`: Generates intraday BTC/ETH reports.
  - `run-strategy.yml`: Generates strategy decisions using DeepSeek.

## 🚀 Getting Started

### Prerequisites
- Node.js v20+
- Python 3.10+
- Supabase CLI
- OKX Account (for live trading)

### Setup

#### 1. Environment Variables
Create `.env` files in the respective directories based on the `.env.example` files (if available) or the documentation.

**Root `.env` (for scripts/agent):**
```bash
DEEPSEEK_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OKX_API_KEY=...
OKX_SECRET_KEY=...
OKX_PASSPHRASE=...
```

**Dashboard `.env` (`trading-dashboard/.env`):**
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

#### 2. Install Dependencies

**Python Agent:**
```bash
cd finance-agent-python
pip install -r requirements.txt
```

**Dashboard:**
```bash
cd trading-dashboard
npm install
```

### 📦 Deployment

The project uses GitHub Actions for CI/CD:

- **Deploy Dashboard**: Automatically builds and deploys the React app to GitHub Pages on push to `main`.
- **Deploy Backend**: Deploys Supabase Edge Functions.
- **Scheduled Tasks**: Runs analysis and report generation scripts hourly.

## 🛡 Security Note
- Never commit `.env` files or API keys.
- Ensure Supabase Row Level Security (RLS) is enabled for all tables.
- Use `supabase secrets set` for Edge Function environment variables.
