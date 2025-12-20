# Repository Cleanup and Reorganization Plan

## 1. GitHub Actions Consolidation
The current workflow list is cluttered. I will consolidate related tasks and improve naming conventions.

- **Frontend Deployment:**
  - Rename `.github/workflows/pages.yml` to `.github/workflows/deploy-frontend.yml` for clarity.
  - This workflow already handles building and deploying the React app to GitHub Pages.

- **Backend Deployment:**
  - Rename `.github/workflows/deploy-supabase-functions.yml` to `.github/workflows/deploy-backend.yml`.
  - This workflow handles deploying Supabase Edge Functions (`account-value` and `execute-strategy`).

- **Scheduled Tasks:**
  - Keep `intraday-reports.yml` but rename to `schedule-intraday-reports.yml`.
  - Keep `strategy-decisions.yml` but rename to `schedule-strategy-decisions.yml`.
  - Ensure both use consistent Node.js setup and environment variable naming.

## 2. Project Architecture Cleanup
The root directory is a mix of Python scripts, Node.js scripts, and project folders. I will organize this into a clearer monorepo-style structure.

- **Move Python Core:** Move `check_balance.py`, `main.py`, `requirements.txt`, `configs/`, `logs/`, `src/` (Python source), `tests/`, and `charts/` into a new `finance-agent-python/` directory. This separates the Python trading bot from the web dashboard and cloud functions.
- **Scripts:** Move `scripts/` (Node.js scripts for scheduled tasks) into `supabase/scripts/` or keep as `scripts/` but ensure they are clearly documented as cloud-task scripts. I'll keep them in `scripts/` for now but update documentation.
- **Frontend:** `trading-dashboard/` is already well-isolated.
- **Backend:** `supabase/` contains functions and migrations.

## 3. Frontend Refactoring
The `trading-dashboard/src/services/supabase.ts` file is a monolith containing Auth, Market Data, Strategy, and Order logic. I will split this into modular services.

- Create `trading-dashboard/src/services/auth.ts`
- Create `trading-dashboard/src/services/market.ts`
- Create `trading-dashboard/src/services/strategy.ts`
- Create `trading-dashboard/src/services/orders.ts`
- Create `trading-dashboard/src/services/api.ts` (shared Supabase client)
- Refactor `supabase.ts` to export from these new modules to maintain backward compatibility during the transition, then update imports.

## 4. Backend Refactoring
The Supabase Edge Functions (`account-value` and `execute-strategy`) share identical crypto logic (`decryptBundle`, `deriveKey`).

- Create a shared utility file `supabase/functions/_shared/crypto.ts`.
- Update both functions to import from this shared file. *Note: Supabase Edge Functions support a `_shared` directory for this exact purpose.*

## 5. Documentation Update
Rewrite the root `README.md` to serve as a master index.

- **Architecture Overview:** Explain the three parts (React Dashboard, Python Agent, Supabase Backend).
- **Setup Guide:** Clear steps for each part.
- **Deployment:** Explain the GitHub Actions pipelines.
- **Security:** Document the Master Password and Encryption architecture.

## Execution Order
1. **Rearrange Files:** Move Python files to `finance-agent-python/`.
2. **Refactor Backend:** Create `_shared/crypto.ts` and update functions.
3. **Refactor Frontend:** Split `supabase.ts` services.
4. **Rename Workflows:** Update `.github/workflows` filenames.
5. **Update Docs:** Rewrite `README.md`.
