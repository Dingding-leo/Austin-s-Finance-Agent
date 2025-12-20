I will redesign the dashboard to be a professional, high-density financial terminal.

### 1. Refined Design System ("FinancePro")
- **Color Palette**: Shift from generic dark gray to a deep "midnight blue" (`bg-slate-950`) with high-contrast borders (`border-slate-800`).
- **Typography**: Use standard `Inter` but with tighter tracking and varying weights to establish hierarchy (e.g., small uppercase labels for metadata).
- **Cards**: Implement a reusable `Card` style with a subtle gradient background and distinct headers.

### 2. Layout Overhaul (Grid System)
I will restructure `Dashboard.tsx` to use a CSS Grid layout:
- **Header**: Compact branding, live connection status dot, and a prominent Account Value ticker.
- **Top Row (Market Context)**: 
  - `IntradayReportBar` redesigned as 2 side-by-side "Market Insight" cards (BTC & ETH) instead of a long text bar.
- **Main Content**:
  - **Left Col (Strategy Signals)**: A vertical feed of trading signals, redesigned as "Ticket" style cards with clear BUY/SELL badges.
  - **Right Col (Quick Actions/Settings)**: Move the Settings Panel and Prompt Editor here to clean up the vertical flow.

### 3. Component Redesign
- **`IntradayReportBar.tsx`**:
  - Convert to a grid of 2 cards.
  - Use colored badges for "Bullish"/"Bearish".
  - Truncate text with a "Read More" expander to save space.
- **`StrategySignals.tsx`**:
  - Remove the large blue borders. Use subtle top-borders for signal type (Green for Buy, Red for Sell).
  - Compact metadata into a grid (Reason | Tech | Risk).
  - Add a "Confidence Meter" visual (progress bar).

### 4. Global CSS
- Add utility classes for "glassmorphism" effects and cleaner scrollbars in `index.css`.

I will start by updating the global CSS, then the components, and finally the main dashboard layout.