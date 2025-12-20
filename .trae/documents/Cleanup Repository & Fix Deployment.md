I will perform a comprehensive cleanup and fix the deployment issues as requested.

### 1. Fix Deployment & GitHub Actions
- **Fix "Lock file not found" error**: Update the dashboard deployment workflow to explicitly point to `trading-dashboard/package-lock.json` for caching.
- **Rename & Organize Workflows**:
  - `pages.yml` → `deploy-dashboard.yml`
  - `deploy-supabase-functions.yml` → `deploy-backend.yml`
  - `intraday-reports.yml` → `run-reports.yml`
  - `strategy-decisions.yml` → `run-strategy.yml`

### 2. Frontend Architecture Cleanup
- Split the monolithic `trading-dashboard/src/services/supabase.ts` into modular services:
  - `auth.ts` (Authentication)
  - `market.ts` (Prices & Market Data)
  - `strategy.ts` (Strategies, Assets, Prompts, Decisions)
  - `orders.ts` (Orders, Positions)
  - `okx.ts` (Credentials)
  - `sessions.ts` (Trading Sessions)
- Update `api.ts` and `supabase.ts` to coordinate these services cleanly.

### 3. Documentation
- Update the root `README.md` to reflect the new monorepo structure:
  - `finance-agent-python/` (Python Agent)
  - `trading-dashboard/` (React Frontend)
  - `supabase/` (Backend Functions & DB)
  - `scripts/` (Node.js Automation)