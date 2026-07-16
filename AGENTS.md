# ISHASTRA WEB — AI AGENT INSTRUCTION FILE

> **Purpose:** This file gives an AI agent a complete map of the frontend codebase.
> Read this file first before making any changes. You should not need to re-explore
> the project structure after reading this.

---

## 1. PROJECT OVERVIEW

A **React single-page application** — the frontend for the Ishastra trading platform.

**Tech Stack:**
- **Framework:** React 18.2 (Create React App)
- **Router:** React Router DOM 7.6.2
- **UI:** Material-UI (MUI) 7.3.1 + TailwindCSS 4.1 + CSS Modules
- **HTTP:** Axios 1.10.0
- **Charts:** Chart.js 4.4.1, Recharts 3.0.2, Plotly.js 3.1.0, Lightweight-charts 5.0.8
- **Notifications:** react-toastify 10.0.5
- **Styling approach:** CSS Modules (`.module.css`) co-located with every component/page
- **Theme:** Light/Dark toggle via `ThemeContext`, persisted to localStorage

**Backend API:** communicates with `ishastra_backend` (default port 5000).  
**API base URL:** configured in `src/config/environment.js` → `API_ENDPOINT`

---

## 2. HOW TO START

```bash
# Development server (port 3000)
npm start

# Production build
npm run build

# Serve production build locally
npm run serve
```

**Entry point:** `src/index.js` → renders `<App />`  
**Router setup:** `src/App.js` (all routes defined here)

---

## 3. COMPLETE ROUTE MAP

All routes are defined in `src/App.js`. The app is wrapped: `ErrorBoundary → ThemeProvider → NotificationProvider → BrowserRouter`.

| Route | Component | File Location | Purpose |
|-------|-----------|--------------|---------|
| `/` | `Dashboard` | `src/pages/dashboard.js` | Main KPI dashboard — P&L, equity curve, sector breakdown, top holdings |
| `/analysis` | `TickerAnalysisNew` | `src/pages/TickerAnalysisNew.jsx` | AI-powered ticker analysis with multi-system signals |
| `/chart` | `Chart` | `src/pages/Chart.js` | Generic OHLC candlestick chart viewer |
| `/chart/:symbol` | `Chart` | `src/pages/Chart.js` | Symbol-specific chart |
| `/watchlist` | `Watchlist` | `src/pages/Watchlist.jsx` | Stock watchlist with BUY signals — filter by India/USA |
| `/scan` | `StockScan` | `src/pages/StockScan.jsx` | Market scanner — upload/paste symbols, get BUY signals + failed stocks |
| `/stock-detail/:symbol` | `StockDetail` | `src/pages/StockDetail.jsx` | Detailed per-stock info page |
| `/trades` | `TradeList` | `src/pages/trade/TradeList.jsx` | All trades — open/closed/partial, NASDAQ/NSE tabs |
| `/trades/new` | `TradeAdd` | `src/pages/trade/TradeAdd.jsx` | Create a new trade (entry price, SL, targets, charts) |
| `/trades/update/:id` | `TradeUpdate` | `src/pages/trade/TradeUpdate.jsx` | Close/partially exit a trade |
| `/trades/edit/:id` | `TradeEdit` | `src/pages/trade/TradeEdit.jsx` | Edit trade entry details |
| `/trades/review/:id` | `TradeReview` | `src/pages/trade/TradeReview.jsx` | Post-trade review — lessons, emotional state |
| `/journal` | `JournalList` | `src/pages/analysis/JournalList.jsx` | Pre-trade chart journal entries |
| `/journal/new` | `JournalLog` | `src/pages/analysis/JournalLog.jsx` | Create journal entry (trend, RSI, support/resistance) |
| `/journal/edit/:id` | `JournalLog` | `src/pages/analysis/JournalLog.jsx` | Edit journal entry |
| `/journal/update/:id` | `JournalLogUpdate` | `src/pages/analysis/JournalLogUpdate.jsx` | Add review notes to journal |
| `/risk-management` | `RiskManagement` | `src/pages/RiskManagement.jsx` | Position sizing + R:R calculator |
| `/recommendations` | `RecommendationList` | `src/pages/recommendation/RecommendationList.jsx` | Analyst recommendations list |
| `/recommendations/new` | `RecommendationForm` | `src/pages/recommendation/RecommendationForm.jsx` | Create recommendation |
| `/recommendations/edit/:id` | `RecommendationForm` | `src/pages/recommendation/RecommendationForm.jsx` | Edit recommendation |
| `/investments` | `InvestmentList` | `src/pages/investment/InvestmentList.jsx` | Long-term investments — group by ticker, filter by status |
| `/investments/new` | `InvestmentForm` | `src/pages/investment/InvestmentForm.jsx` | Create investment |
| `/investments/edit/:id` | `InvestmentForm` | `src/pages/investment/InvestmentForm.jsx` | Edit investment |
| `/investments/update/:id` | `UpdateInvestmentForm` | `src/pages/investment/UpdateInvestmentForm.jsx` | Update investment price/status |

---

## 4. API LAYER — `src/api/`

All API files use the shared Axios instance from `src/api/baseApi.js`.

### `baseApi.js`
- Axios instance with 60-second timeout
- Base URL from `src/config/environment.js` → `API_ENDPOINT`
- Request/response interceptors for error normalisation

### `analysisApi.js` — AI & Technical Analysis (120s timeout override)
| Function | Method | Endpoint | Notes |
|----------|--------|----------|-------|
| `getUnifiedAnalysis(symbol, period, capital)` | GET | `/trading/signal-analysis?symbol=X&period=3mo&capital=X&isRequiredChartData=true` | Full multi-system signal |
| `getChartData(symbol, period)` | GET | `/trading/chart?symbol=X&period=2y` | OHLC historical data |
| `reviewAISetup(payload)` | POST | `/trading/ai-setup-review` | OpenAI Vision on single chart |
| `reviewAISetupBulk(items)` | POST | `/trading/ai-setup-review/bulk` | Batch chart review |
| `getWatchlist()` | GET | `/watchlist` | Current watchlist from DB |
| `runWatchlistDailyScan(symbols)` | POST | `/watchlist/daily-scan` | Body: `{ stocksUniverse: string[] \| 'ALL' }` — returns `{ result: { scanned, buySignals, failedSymbols, failedCount, breakdown, avgConfidence } }` |

### `tradeApi.js` — Trade Management
| Function | Method | Endpoint | Notes |
|----------|--------|----------|-------|
| `getAllTrades(isPaperTrade)` | GET | `/trades` | |
| `getTradeById(id)` | GET | `/trades/:id` | |
| `editTrade(id, form)` | PUT | `/trades/:id/edit` | FormData |
| `updateTrade(id, form)` | PUT | `/trades/:id/exit` | Full/partial exit |
| `partialExitTrade(id, form)` | PUT | `/trades/:id/partial-exit` | Specific partial exit |
| `getTradeTransactions(id)` | GET | `/trades/:id/transactions` | Exit history |
| `addPostAnalysis(id, form)` | PUT | `/trades/:id/post-analysis` | Post-trade review |
| `createTrade(formOrData, options)` | POST | `/trades` | Accepts FormData or plain object |

### `journalApi.js` — Trading Journal
| Function | Method | Endpoint |
|----------|--------|----------|
| `getAllJournals()` | GET | `/journal` |
| `getJournalById(id)` | GET | `/journal/:id` |
| `createJournal(form)` | POST | `/journal` |
| `updateJournal(id, form)` | PUT | `/journal/:id` |
| `deleteJournal(id)` | DELETE | `/journal/:id` |

### `investmentApi.js` — Investments
| Function | Method | Endpoint | Notes |
|----------|--------|----------|-------|
| `getAllInvestments(isGroupByTicker, status, ticker)` | GET | `/api/investments` | |
| `getInvestmentById(id)` | GET | `/api/investments/:id` | |
| `createInvestment(data)` | POST | `/api/investments` | |
| `updateInvestment(id, data)` | PUT | `/api/investments/:id` | |
| `deleteInvestment(id)` | DELETE | `/api/investments/:id` | |
| `closeInvestment(id, closeData)` | PATCH | `/api/investments/:id/close` | |

### `recommendationApi.js` — Recommendations
| Function | Method | Endpoint |
|----------|--------|----------|
| `getAllRecommendations()` | GET | `/api/recommendations` |
| `getRecommendationById(id)` | GET | `/api/recommendations/:id` |
| `createRecommendation(data)` | POST | `/api/recommendations` |
| `updateRecommendation(id, data)` | PUT | `/api/recommendations/:id` |
| `deleteRecommendation(id)` | DELETE | `/api/recommendations/:id` |
| `archiveRecommendation(id, archive)` | PATCH | `/api/recommendations/:id/archive` |

### `tickerApi.js` — Ticker Search & Technical Data
| Function | Method | Endpoint | Notes |
|----------|--------|----------|-------|
| `searchTickers(query)` | GET | `/yahoo/search?q=X` | Autocomplete search |
| `getCurrentPrice(symbol)` | GET | `/yahoo/price?symbol=X` | |
| `getTechnicalIndicators(symbol)` | GET | `/yahoo/indicator?symbol=X` | ATR, EMA, SMA, RSI, support/resistance |
| `getATR(symbol, period1, period2)` | GET | `/yahoo/indicator?symbol=X` | Legacy wrapper |

### `dashboardApi.js`
| Function | Method | Endpoint |
|----------|--------|----------|
| `getDashboardSummary()` | GET | `/trades/dashboard/summary` |

### `marketApi.js`
| Function | Method | Endpoint |
|----------|--------|----------|
| `getMarketIndices()` | GET | `/market/indices` |

### `capitalApi.js`
| Function | Method | Endpoint | Notes |
|----------|--------|----------|-------|
| `getCapitalInfo()` | GET | `/capital` | All currencies |
| `getCapitalForCurrency(currency)` | — | — | Helper, filters from getCapitalInfo |

### `firebaseMetaApi.js` — Firebase Read-Only Metadata
| Function | Data Fetched |
|----------|-------------|
| `fetchExitTactics()` | `tradeMetadata/exitTactics.json` |
| `fetchSetups()` | `tradeMetadata/tradeSetups.json` |
| `fetchTags()` | `tradeMetadata/tags.json` |

### `tagApi.js`
Re-exports `fetchTags` from `firebaseMetaApi.js`.

---

## 5. PAGES — COMPLETE BREAKDOWN

### Top-Level Pages (`src/pages/`)

#### `dashboard.js` — Route: `/`
- Fetches: `getDashboardSummary()`, `getMarketIndices()`, `getAllInvestments()`
- Displays: total P&L, win rate, equity curve, sector donut, top holdings bar, market cap pie
- Components used: `EquityCurve`, `SectorDonutChart`, `TopHoldingsBarChart`, `MarketCapPieChart`, `TradeStats`, `DonutChart`

#### `TickerAnalysisNew.jsx` — Route: `/analysis`
- Ticker search via `TickerSearch` component
- Calls `getUnifiedAnalysis()` (2min timeout)
- Calls `reviewAISetup()` for OpenAI chart review
- Displays: signal action, confidence, grade, entry/stop/targets, pattern type, AI review
- CSS: `TickerAnalysis.module.css`

#### `Chart.js` — Route: `/chart`, `/chart/:symbol`
- Calls `getChartData()` for OHLC data
- Renders via `LightweightChart` component
- CSS: `Chart.module.css`

#### `Watchlist.jsx` — Route: `/watchlist`
- Calls `getWatchlist()` on mount
- Filter tabs: All / India / USA
- Refresh button triggers re-fetch
- Shows: symbol, price, decision (BUY/STRONG_BUY), confidence, entry/stop/targets
- CSS: `Watchlist.module.css`

#### `StockScan.jsx` — Route: `/scan`
- Upload `.txt`/`.csv` file or paste comma-separated symbols
- `parseSymbols()` strips exchange prefixes (`NYSE:`, `NASDAQ:`) and adds `.NS`/`.BS` suffixes
- `removeExchangeSuffixes()` strips `.NS`/`.BS` for display
- Calls `runWatchlistDailyScan(symbols)`
- **Scan Result sections:**
  1. Stats grid: Scanned, Buy Signals, Strong Buy, Watch, Avg Confidence
  2. **Buy Signals row** — copyable comma-separated list (green theme)
  3. **Failed Stocks row** — copyable comma-separated list (red theme, shown only when `failedCount > 0`)
- State: `inputText`, `scanning`, `result`, `copied`, `copiedFailed`
- CSS: `StockScan.module.css`

#### `StockDetail.jsx` — Route: `/stock-detail/:symbol`
- Detailed per-stock page with charts and metrics
- CSS: `StockDetail.module.css`

#### `RiskManagement.jsx` — Route: `/risk-management`
- Position sizing calculator
- Inputs: capital, risk %, entry price, stop loss
- Computes: shares, R:R ratio, SL buffer, max loss, gate passes
- CSS: `RiskManagement.module.css`

---

### Trade Pages — `src/pages/trade/`

#### `TradeList.jsx` — Route: `/trades`
- Calls `getAllTrades()`
- Tabs: NASDAQ (US stocks) / NSE (Indian stocks)
- Sortable columns
- Actions per row: View (popup), Edit, Update (exit), Review, Delete
- Modals: `TradeDetailsPopup`, `CombinedPositionPopup`
- CSS: `TradeList.module.css`

#### `TradeAdd.jsx` — Route: `/trades/new`
- Multi-section form: trade info, plan, context, notes, risk management, charts
- Uses `TickerSearch` for symbol input
- Submits via `createTrade()` as `FormData` (supports file uploads)
- Sections: `TradePlanSection`, `TradeContextSection`, `NotesSection`, `RiskManagementSection`
- CSS: `TradeAdd.module.css`

#### `TradeUpdate.jsx` — Route: `/trades/update/:id`
- Close trade or record partial exit
- Calls `updateTrade()` (full exit) or `partialExitTrade()` (partial)
- CSS: `TradeUpdate.module.css`

#### `TradeEdit.jsx` — Route: `/trades/edit/:id`
- Edit entry details (price, SL, quantity, dates, notes)
- Calls `editTrade()`
- (No separate CSS module found — uses shared styles)

#### `TradeReview.jsx` — Route: `/trades/review/:id`
- Post-trade analysis form
- Fields: emotional state, lessons learned, execution grade, review notes, review charts
- Calls `addPostAnalysis()`
- Section: `PostTradeAnalysisSection`
- CSS: `TradeReview.module.css`

#### `TradeDetailsPopup.jsx` — Modal component
- Full trade details in a modal
- Opened from TradeList row
- CSS: `TradeDetailsPopup.module.css`

#### `CombinedPositionPopup.jsx` — Modal component
- Combined position summary for multi-fill trades
- CSS: `CombinedPositionPopup.module.css`

---

### Journal/Analysis Pages — `src/pages/analysis/`

#### `JournalList.jsx` — Route: `/journal`
- Lists all journal entries, sortable by date
- Actions: View (popup), Edit, Delete
- Modal: `JournalDetailsPopup`
- CSS: `JournalList.module.css`

#### `JournalLog.jsx` — Route: `/journal/new`, `/journal/edit/:id`
- Create/edit pre-trade chart analysis
- Fields: date, ticker, trend, candleType, support level, resistance level, EMA touch, volume spike, RSI value, setup confidence, setup type, action plan, notes
- CSS: `JournalLog.module.css`

#### `JournalLogUpdate.jsx` — Route: `/journal/update/:id`
- Add review notes to existing journal entry
- CSS: `JournalLogUpdate.module.css`

#### `JournalDetailsPopup.jsx` — Modal component
- Full journal details with attached chart images

---

### Recommendation Pages — `src/pages/recommendation/`

#### `RecommendationList.jsx` — Route: `/recommendations`
- Lists all recommendations
- Actions: archive/unarchive, edit, delete
- CSS: `RecommendationList.module.css`

#### `RecommendationForm.jsx` — Route: `/recommendations/new`, `/recommendations/edit/:id`
- Create/edit form: ticker, buyBelow, sector, source, marketCap
- CSS: `RecommendationForm.module.css`

---

### Investment Pages — `src/pages/investment/`

#### `InvestmentList.jsx` — Route: `/investments`
- Lists investments with filter (status, ticker) and group-by-ticker option
- Actions: view, edit, close, delete
- CSS: `InvestmentList.module.css`

#### `InvestmentForm.jsx` — Route: `/investments/new`, `/investments/edit/:id`
- Create/edit: ticker, quantity, avgBuyPrice, currency (USD/INR), sector
- Uses `InvestmentTickerSearch` for symbol lookup
- CSS: `InvestmentForm.module.css`

#### `UpdateInvestmentForm.jsx` — Route: `/investments/update/:id`
- Update investment current price or status
- No separate CSS module

---

## 6. COMPONENTS — `src/components/`

### Layout & Navigation

#### `Header.jsx` + `Header.module.css`
- Top navigation bar
- Auto-fetches market indices every 5 minutes via `getMarketIndices()`
- Displays: NIFTY, SENSEX, NASDAQ, DOW values
- Nav links to all major routes
- Theme toggle (light/dark)
- Mobile bottom navigation bar

#### `PageHeader.jsx`
- Reusable page title + optional breadcrumb

#### `ErrorBoundary.jsx`
- React error boundary — catches crashes, shows fallback
- Wraps entire app in `App.js`

#### `ErrorPage.jsx` + `ErrorPage.module.css`
- Renders when an API call fails (inline error state)

#### `NotificationProvider.jsx`
- Context provider for toast notifications
- Exposes `useNotification()` hook
- Methods: `notification.success(msg)`, `notification.error(msg)`, `notification.info(msg)`

#### `Notification.jsx` + `Notification.module.css`
- Toast display component (uses react-toastify under the hood)

---

### Chart Components

| Component | CSS Module | Purpose |
|-----------|-----------|---------|
| `EquityCurve.jsx` | `EquityCurve.module.css` | Cumulative P&L equity curve (Recharts LineChart) |
| `PerformanceChart.js` | — | Performance metrics (Recharts) |
| `CommonAddChart.js` | `CommonAddChart.module.css` | Reusable chart builder for trade/journal |
| `LightweightChart.jsx` | — | Lightweight-charts OHLC/candlestick renderer |
| `TechnicalIndicators.jsx` | `TechnicalIndicators.module.css` | Overlay RSI, EMA, SMA, ATR on charts |
| `DonutChart.js` | — | Portfolio allocation donut (Recharts PieChart) |
| `SectorDonutChart.jsx` | — | Sector allocation pie |
| `TimeframePieChart.js` | — | Timeframe distribution (day/swing/positional) |
| `TopHoldingsBarChart.jsx` | — | Top holdings by value (BarChart) |
| `MarketCapPieChart.jsx` | — | Market cap breakdown pie |
| `InvestmentValueChart.jsx` | — | Investment value over time |
| `SetupPerformanceChart.js` | — | Trade setup type performance |
| `TradeStats.jsx` | `TradeStats.module.css` | Win rate, avg P&L, streak stats |

---

### Search & Input

#### `TickerSearch.jsx` + `TickerSearch.module.css`
- Autocomplete input for stock symbols
- Calls `searchTickers(query)` (debounced)
- Used in TradeAdd, TickerAnalysis

#### `InvestmentTickerSearch.js`
- Variant of TickerSearch for investment forms

---

### Tables

#### `TradeTable.js`
- Reusable table for rendering trade rows (used in TradeList)

---

### Modals

#### `BuyMorePopup.jsx` + `BuyMorePopup.module.css`
- Modal to add to an existing open position
- Used from Watchlist or TradeList

---

### Miscellaneous

#### `ImageGallery.jsx`
- Lightbox gallery for trade/journal chart screenshots

---

### Trade Log Sections — `src/components/tradeLogSections/`

Used inside `TradeAdd.jsx` and `TradeReview.jsx` to break the long form into logical sections:

| Component | Section Contents |
|-----------|----------------|
| `TradePlanSection.jsx` | Entry price, stop loss, targets, R:R |
| `TradeContextSection.jsx` | Market context, reasoning for entry |
| `NotesSection.jsx` | Free-text notes |
| `RiskManagementSection.jsx` | Position size, risk %, capital allocation |
| `PostTradeAnalysisSection.jsx` | Execution grade, lessons, emotional state |

---

## 7. CONTEXTS — `src/contexts/`

#### `ThemeContext.js`
- Provides global `theme` state (`'light'` | `'dark'`)
- Hook: `useTheme()` → returns `{ theme, toggleTheme }`
- Persists to `localStorage` key `ishastra-theme`
- Wraps entire app via `ThemeProvider` in `App.js`

---

## 8. UTILITIES — `src/utils/` and `src/common/`

### `src/utils/`

#### `chartImageCapture.js`
- `captureElementCanvasesAsDataUrl(element)` — capture Chart.js canvas as base64
- `captureElementVisualAsDataUrl(element)` — capture any DOM element visual
- Used when submitting trade/journal forms with chart screenshots

#### `setupReportHtml.js`
- Generates HTML report string for a trade setup
- Used for print/export functionality

### `src/common/`

#### `Helper.js`
- `getExitTransactions(trade)` — extracts exit transaction list from trade object
- `getAverageExitPrice(trade)` — computes weighted average exit price
- `getPartialPL(trade)` — P&L for partial positions
- `formatDate(date)` — date formatting utility
- `getInvested(trade)` — total capital invested calculation

#### `WatchlistToTradeConverter.js`
- `convertWatchlistToTradeEntryForm(watchlistStock)` — maps WatchlistStock → TradeAdd form values
- `validateWatchlistForConversion(stock)` — checks if a watchlist stock has enough data to convert
- `hasBuySignal(stock)` — boolean check for BUY/STRONG_BUY decision

#### `WatchlistToTradeConverterExample.js`
- Usage examples for `WatchlistToTradeConverter`

---

## 9. CONFIG — `src/config/`

#### `environment.js`
- `API_ENDPOINT` — backend base URL (e.g. `http://localhost:5000/api`)
- `FRONTEND_URL` — frontend URL
- `DEFAULT_THEME` — `'light'`
- `ENV` — `development` | `production`
- Helper methods: `isDevelopment()`, `isProduction()`

---

## 10. DATA — `src/data/`

#### `tickerData.js`
- Ticker name/exchange lookup utilities

---

## 11. STYLES — `src/styles/`

#### `themes.css`
- Global CSS custom properties for light/dark themes
- Variables: `--bg-primary`, `--text-primary`, `--accent-color`, etc.
- Applied to `:root` (light) and `[data-theme='dark']`

---

## 12. CSS MODULE PATTERN

**Convention:** every page and component has a co-located `.module.css` file.  
Import pattern:
```jsx
import styles from './ComponentName.module.css';
// usage:
<div className={styles.container}>
```

**All CSS Module files:**

*Pages:*
- `Dashboard.module.css`, `Chart.module.css`, `Watchlist.module.css`
- `StockScan.module.css`, `StockDetail.module.css`, `RiskManagement.module.css`, `TickerAnalysis.module.css`

*Trade pages:*
- `TradeList.module.css`, `TradeAdd.module.css`, `TradeUpdate.module.css`
- `TradeReview.module.css`, `TradeDetailsPopup.module.css`, `CombinedPositionPopup.module.css`

*Journal pages:*
- `JournalList.module.css`, `JournalLog.module.css`, `JournalLogUpdate.module.css`

*Investment pages:*
- `InvestmentList.module.css`, `InvestmentForm.module.css`

*Recommendation pages:*
- `RecommendationList.module.css`, `RecommendationForm.module.css`

*Components:*
- `Header.module.css`, `EquityCurve.module.css`, `CommonAddChart.module.css`
- `TechnicalIndicators.module.css`, `TradeStats.module.css`, `TickerSearch.module.css`
- `BuyMorePopup.module.css`, `Notification.module.css`, `ErrorPage.module.css`

---

## 13. KEY PATTERNS & CONVENTIONS

### API Calls
- Always import from `src/api/<module>Api.js`
- Never make raw `axios.get/post` calls inline in components
- Use `useNotification()` to show success/error after API calls

### Notification Usage
```jsx
const notification = useNotification();
notification.success('Trade created!');
notification.error('Failed to save.');
```

### Symbol Conventions
- Indian stocks have `.NS` (NSE) or `.BS` (BSE) suffix internally
- When displaying to the user, strip these suffixes with `removeExchangeSuffixes()`
- When sending to the backend scanner, add suffixes from exchange prefixes using `parseSymbols()`

### File Uploads
- Trade and journal forms support chart image uploads
- Use `FormData` when submitting forms with files
- `chartImageCapture.js` utilities capture Chart.js canvases before submit

### Theme
- Check current theme with `useTheme()` from `ThemeContext`
- Use CSS variable `var(--bg-primary)` etc. for theme-aware colours
- Theme class `data-theme='dark'` is applied to `<body>`

### React Router
- Use `useNavigate()` for programmatic navigation
- Use `useParams()` for `:id` and `:symbol` route params
- Use `useLocation()` for reading query strings

---

## 14. DATA FLOW SUMMARY

### Trade Entry to Exit
1. `TradeAdd` → `createTrade()` → `POST /trades`
2. `TradeList` → `getAllTrades()` → `GET /trades`
3. `TradeUpdate` → `updateTrade()` or `partialExitTrade()` → `PUT /trades/:id/exit`
4. `TradeReview` → `addPostAnalysis()` → `PUT /trades/:id/post-analysis`
5. `Dashboard` → `getDashboardSummary()` → aggregated stats

### Watchlist Scan Flow
1. User uploads file or pastes symbols in `StockScan`
2. `parseSymbols()` normalises symbols
3. `runWatchlistDailyScan(symbols)` → `POST /watchlist/daily-scan`
4. Response includes `buySignals` (string), `failedSymbols` (string), `failedCount`
5. UI shows two copyable rows: Buy Signals (green) and Failed Stocks (red)

### Ticker Analysis Flow
1. User searches symbol via `TickerSearch`
2. `getUnifiedAnalysis()` called (2min timeout)
3. `reviewAISetup()` called with captured chart image
4. Results displayed: action, grade, confidence, entry, stop, targets, AI narrative

### Investment Flow
1. `InvestmentForm` → `createInvestment()` → `POST /api/investments`
2. `InvestmentList` → `getAllInvestments()` with optional grouping/filters
3. Close → `closeInvestment()` → `PATCH /api/investments/:id/close`

---

## 15. FILES THAT DO NOT EXIST / THINGS TO NOTE

- `src/hooks/` directory exists but is **empty** — no custom hooks yet
- Firebase is only used for read-only metadata (`exitTactics`, `tradeSetups`, `tags`)
- `public/` folder contains standard CRA assets (index.html, favicon, manifest)
- `build/` is git-ignored — generated by `npm run build`
- `node_modules/` is git-ignored

---

## 16. PACKAGE.JSON — KEY DEPENDENCIES

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^7.6.2",
  "@mui/material": "^7.3.1",
  "@emotion/react": "^11.x",
  "@emotion/styled": "^11.x",
  "tailwindcss": "^4.1.x",
  "axios": "^1.10.0",
  "chart.js": "^4.4.1",
  "recharts": "^3.0.2",
  "plotly.js": "^3.1.0",
  "lightweight-charts": "^5.0.8",
  "react-toastify": "^10.0.5",
  "technicalindicators": "^3.1.0",
  "lodash": "^4.17.21"
}
```

Scripts: `start` | `start:prod` | `build` | `serve` | `serve:prod` | `test`
