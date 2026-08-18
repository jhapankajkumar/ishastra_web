import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTrades, deleteTrade, getTradeTransactions } from "../api/tradeApi";
import { getAllInvestments } from '../api/investmentApi';
import EquityCurve from '../components/EquityCurve';
import PerformanceChart from '../components/PerformanceChart';
import InvestmentValueChart from '../components/InvestmentValueChart';
import SectorDonutChart from '../components/SectorDonutChart';
import TopHoldingsBarChart from '../components/TopHoldingsBarChart';
import MarketCapPieChart from '../components/MarketCapPieChart';
import DrawdownChart from '../components/DrawdownChart';
import RMultipleHistogram from '../components/RMultipleHistogram';
import CalendarHeatmap from '../components/CalendarHeatmap';
import ErrorPage from '../components/ErrorPage';
import PageToolbar from '../components/PageToolbar';
import CandlestickChartOutlined from '@mui/icons-material/CandlestickChartOutlined';
import AccountBalanceWalletOutlined from '@mui/icons-material/AccountBalanceWalletOutlined';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import styles from './Dashboard.module.css';
import { getExitTransactions, getAverageExitPrice, getPartialPL, formatDate, getInvested, displayTicker } from '../common/Helper';
import { getCapitalInfo } from '../api/capitalApi';

// ---- Pure helpers ----
function calculatePnl(trade) {
  if (trade.entryPrice == null || trade.exitPrice == null || trade.quantity == null || !trade.direction) return 0;
  const priceDiff = trade.direction.toLowerCase() === 'long'
    ? trade.exitPrice - trade.entryPrice
    : trade.entryPrice - trade.exitPrice;
  return priceDiff * trade.quantity;
}

function getRemainingQtySafe(trade) {
  if (trade.remainingQuantity != null) return Math.max(Number(trade.remainingQuantity), 0);
  const exits = getExitTransactions(trade) || [];
  const exited = exits.reduce((s, tx) => s + Number(tx.quantity || 0), 0);
  return Math.max(Number(trade.quantity || 0) - exited, 0);
}

function getRealizedPnLSafe(trade) {
  const entry = Number(trade.entryPrice || 0);
  const sign = (trade.direction || 'long').toLowerCase() === 'short' ? -1 : 1;
  const exits = getExitTransactions(trade) || [];
  let realized = 0;
  exits.forEach(tx => {
    realized += sign * ((Number(tx.price || 0) - entry) * Number(tx.quantity || 0));
  });
  return realized;
}

function getUnRealizedPnLSafe(trade) {
  const entry = Number(trade.entryPrice || 0);
  const price = Number(trade.currentPrice || 0);
  const qty = Number(trade.remainingQuantity || 0);
  return (price - entry) * qty;
}

function fmtNum(n, digits = 0) {
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: digits });
}

// Cumulative realized-equity series, commission-inclusive — feeds the hero
// sparkline. Same treatment as EquityCurve so the two never disagree.
function buildEquitySeries(trades, initialCap) {
  const exits = [];
  (trades || []).forEach(t => {
    const entry = Number(t.entryPrice || 0);
    const sign = (t.direction || 'long').toLowerCase() === 'short' ? -1 : 1;
    const txs = getExitTransactions(t) || [];
    const commission = Number(t.entryCommission || 0) + Number(t.exitCommission || 0);
    if (!txs.length) return;
    const lastIdx = txs.length - 1;
    txs.forEach((tx, i) => {
      const raw = tx.transactionDate || tx.transaction_date;
      if (!raw || tx.price == null || tx.quantity == null) return;
      exits.push({
        t: new Date(raw).getTime(),
        pnl: sign * (Number(tx.price) - entry) * Number(tx.quantity) - (i === lastIdx ? commission : 0),
      });
    });
  });
  exits.sort((a, b) => a.t - b.t);
  let eq = initialCap;
  const pts = [eq];
  exits.forEach(e => { eq += e.pnl; pts.push(eq); });
  return pts;
}

// Inline SVG sparkline — stretches to its container, stroke stays hairline.
const Sparkline = ({ points, up }) => {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = (max - min) || 1;
  const W = 1000, H = 100;
  const coords = points.map((p, i) => [
    (i / (points.length - 1)) * W,
    H - ((p - min) / range) * H,
  ]);
  const line = coords.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const color = up ? 'var(--profit-color)' : 'var(--loss-color)';
  const gid = up ? 'heroSparkUp' : 'heroSparkDn';
  return (
    <svg className={styles.heroSparkSvg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

// ---- Live position risk math ----
// How much risk was originally accepted (off the untouched stopLoss), how
// much is actually still at stake right now (off the live trailingStopLoss —
// which trailing a stop up reduces), and how deployed the account is.
function computeRisk(trades) {
  const openTrades = (trades || []).filter(t => getRemainingQtySafe(t) > 0);

  const positions = openTrades.map(t => {
    const rem = getRemainingQtySafe(t);
    const entry = Number(t.entryPrice || 0);
    const current = Number(t.currentPrice || entry);
    const isShort = (t.direction || 'long').toLowerCase() === 'short';
    const sign = isShort ? -1 : 1;
    const initialStop = Number(t.stopLoss || 0);
    const liveStop = Number(t.trailingStopLoss || t.stopLoss || 0);

    const value = current * rem;
    const unrealized = sign * (current - entry) * rem;

    // Distance from current price down to the live stop — if it's already
    // been breached (price past stop but not yet exited), risk from here
    // is 0, not negative; the loss beyond the stop is already realized-ish.
    const distanceToLiveStop = isShort ? (liveStop - current) : (current - liveStop);
    const openRiskAmt = liveStop > 0 ? Math.max(distanceToLiveStop, 0) * rem : 0;

    const distanceToInitialStop = isShort ? (initialStop - entry) : (entry - initialStop);
    const initialRiskAmt = initialStop > 0 ? Math.max(distanceToInitialStop, 0) * rem : 0;

    return { id: t.id, ticker: t.ticker, value, unrealized, openRiskAmt, initialRiskAmt };
  });


  return {
    positions,
    totalValue: positions.reduce((s, p) => s + p.value, 0),
    totalUnrealized: positions.reduce((s, p) => s + p.unrealized, 0),
    totalOpenRisk: positions.reduce((s, p) => s + p.openRiskAmt, 0),
    totalInitialRisk: positions.reduce((s, p) => s + p.initialRiskAmt, 0),
  };
}

function riskLevelFor(openRiskPct) {
  if (openRiskPct < 5) return { label: 'Low Risk', color: 'var(--profit-color)', bg: 'rgba(16,185,129,0.12)' };
  if (openRiskPct < 10) return { label: 'Medium Risk', color: 'var(--warning-color, #F59E0B)', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'High Risk', color: 'var(--loss-color)', bg: 'rgba(239,68,68,0.12)' };
}

// ---- Hero ----
// One object answering the two questions that matter on open: what is the
// account worth, and how much of it is exposed right now. Everything that
// used to be a separate KPI box lives here as supporting detail.
const HeroPanel = ({
  currencySymbol, portfolioValue, finalPnl, pnlPct,
  todayChange, todayPct, todayBase,
  winRate, wins, breakEvens, losses,
  totalTrades, activeTrades, closedCount, totalCommissions,
  initialCap, risk, equityPoints,
}) => {
  const pct = (amt) => initialCap > 0 ? (amt / initialCap) * 100 : 0;
  const openRiskPct = pct(risk.totalOpenRisk);
  const level = riskLevelFor(openRiskPct);
  const hasOpen = risk.positions.length > 0;
  const up = pnlPct >= 0;

  const stat = (label, value, sub, color) => (
    <div className={styles.heroStat}>
      <div className={styles.heroStatLabel}>{label}</div>
      <div className={styles.heroStatValue} style={color ? { color } : undefined}>{value}</div>
      {sub && <div className={styles.heroStatSub}>{sub}</div>}
    </div>
  );

  return (
    <section className={styles.hero}>
      <div className={styles.heroTop}>
        <div>
          <div className={styles.heroLabel}>Portfolio Value</div>
          <div className={styles.heroValue}>{currencySymbol}{fmtNum(portfolioValue)}</div>
          <div className={styles.heroDeltaRow}>
            <span className={up ? styles.heroDeltaUp : styles.heroDeltaDown}>
              {up ? '▲' : '▼'} {currencySymbol}{fmtNum(Math.abs(finalPnl))} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)
            </span>
            <span className={styles.heroDeltaSep}>·</span>
            <span className={styles.heroDeltaMuted}>
              Today {todayBase > 0
                ? `${todayChange >= 0 ? '+' : '−'}${currencySymbol}${fmtNum(Math.abs(todayChange))}${todayPct != null ? ` (${todayPct >= 0 ? '+' : ''}${todayPct.toFixed(2)}%)` : ''}`
                : '—'}
            </span>
          </div>
        </div>
        {hasOpen && (
          <span className={styles.heroBadge} style={{ color: level.color, background: level.bg }}>
            <span className={styles.heroBadgeDot} style={{ background: level.color }} />
            {level.label}
          </span>
        )}
      </div>

      <div className={styles.heroSpark}>
        <Sparkline points={equityPoints} up={up} />
      </div>

      <div className={styles.heroStats}>
        {stat('Allocated', `${pct(risk.totalValue).toFixed(1)}%`,
          `${currencySymbol}${fmtNum(risk.totalValue)} in ${activeTrades} position${activeTrades !== 1 ? 's' : ''}`)}
        {stat('Open Risk @ SL', hasOpen ? `${openRiskPct.toFixed(2)}%` : '—',
          hasOpen ? `${currencySymbol}${fmtNum(risk.totalOpenRisk)} still at risk` : 'No open positions',
          hasOpen ? level.color : undefined)}
        {stat('Open P&L', `${risk.totalUnrealized >= 0 ? '+' : ''}${pct(risk.totalUnrealized).toFixed(2)}%`,
          `${risk.totalUnrealized >= 0 ? '+' : '−'}${currencySymbol}${fmtNum(Math.abs(risk.totalUnrealized))} unrealized`,
          risk.totalUnrealized >= 0 ? 'var(--profit-color)' : 'var(--loss-color)')}
        {stat('Win Rate', winRate != null ? `${winRate.toFixed(1)}%` : '—',
          `${wins}W · ${breakEvens}BE · ${losses}L`)}
      </div>

      <div className={styles.heroFoot}>
        <span>{totalTrades} trades · {activeTrades} open · {closedCount} closed</span>
        <span>{currencySymbol}{fmtNum(totalCommissions)} commission paid · {currencySymbol}{fmtNum(risk.totalInitialRisk)} risk originally accepted</span>
      </div>
    </section>
  );
};

// ---- Open positions (live risk per ticker) ----
const OpenPositionsCard = ({ risk, initialCap, currencySymbol }) => {
  if (!risk.positions.length) return null;
  const pct = (amt) => initialCap > 0 ? (amt / initialCap) * 100 : 0;
  const maxAlloc = Math.max(...risk.positions.map(p => pct(p.value)), 1);
  const rows = [...risk.positions].sort((a, b) => pct(b.value) - pct(a.value));

  return (
    <div className={styles.panel}>
      <div className={styles.panelHead}>
        <h3 className={styles.panelTitle}>Open Positions</h3>
        <span className={styles.panelMeta}>{rows.length} position{rows.length !== 1 ? 's' : ''}</span>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead className={styles.tableThead}>
            <tr>
              <th className={styles.tableTh}>Stock</th>
              <th className={`${styles.tableTh} ${styles.tableThRight}`}>Running Impact</th>
              <th className={`${styles.tableTh} ${styles.tableThRight}`}>Risk if Stopped</th>
              <th className={`${styles.tableTh} ${styles.tableThRight}`}>Allocation</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, idx) => {
              const impactPct = pct(p.unrealized);
              const riskPct = pct(p.openRiskAmt);
              const allocPct = pct(p.value);
              return (
                <tr key={p.id || idx} className={styles.tableTr}>
                  <td className={styles.tableTd}>
                    <span className={styles.posTicker}>
                      <span className={styles.posDot} style={{ background: impactPct >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }} />
                      <span className={styles.tickerPill}>{displayTicker(p.ticker)}</span>
                    </span>
                  </td>
                  <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                    style={{ color: impactPct >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                    {impactPct >= 0 ? '+' : ''}{impactPct.toFixed(2)}%
                  </td>
                  <td className={`${styles.tableTd} ${styles.tableTdRight}`} style={{ color: 'var(--warning-color, #F59E0B)', fontWeight: 700 }}>
                    {riskPct.toFixed(2)}%
                  </td>
                  <td className={`${styles.tableTd} ${styles.tableTdRight}`}>
                    <span className={styles.allocCell}>
                      <span className={styles.allocPct}>{allocPct.toFixed(1)}%</span>
                      <span className={styles.allocTrack}>
                        <span className={styles.allocFill} style={{ width: `${Math.min((allocPct / maxAlloc) * 100, 100)}%` }} />
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


// ---- Investment hero ----
// Mirrors the trading hero, but the visual is an allocation bar rather than a
// sparkline: we only hold current prices for holdings, not a price history,
// so a "value over time" line here would be invented. Weight-by-holding is
// the honest thing this data can actually show.
const ALLOC_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#64748B'];

const InvestmentHero = ({ investments, summary, currencySymbol }) => {
  const list = Array.isArray(investments) ? investments : [];
  const invested = summary?.totalInvested || 0;
  const value = summary?.totalHoldings || 0;
  const unrealized = summary?.unrealizedPnL || 0;
  const today = summary?.todaysPnL || 0;
  const up = unrealized >= 0;

  const holdings = list
    .map(i => ({
      ticker: i.ticker,
      value: Number(i.currentPrice || i.avgBuyPrice || 0) * Number(i.quantity || 0),
      pnl: (Number(i.currentPrice || 0) - Number(i.avgBuyPrice || 0)) * Number(i.quantity || 0),
    }))
    .filter(h => h.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalVal = holdings.reduce((s, h) => s + h.value, 0) || 1;
  const top = holdings.slice(0, 6);
  const otherVal = holdings.slice(6).reduce((s, h) => s + h.value, 0);
  const segments = otherVal > 0 ? [...top, { ticker: 'Other', value: otherVal }] : top;

  const best = holdings.length ? [...holdings].sort((a, b) => b.pnl - a.pnl)[0] : null;
  const worst = holdings.length ? [...holdings].sort((a, b) => a.pnl - b.pnl)[0] : null;

  const stat = (label, val, sub, color) => (
    <div className={styles.heroStat}>
      <div className={styles.heroStatLabel}>{label}</div>
      <div className={styles.heroStatValue} style={color ? { color } : undefined}>{val}</div>
      {sub && <div className={styles.heroStatSub}>{sub}</div>}
    </div>
  );

  return (
    <section className={styles.hero}>
      <div className={styles.heroTop}>
        <div>
          <div className={styles.heroLabel}>Portfolio Value</div>
          <div className={styles.heroValue}>{currencySymbol}{fmtNum(value)}</div>
          <div className={styles.heroDeltaRow}>
            <span className={up ? styles.heroDeltaUp : styles.heroDeltaDown}>
              {up ? '▲' : '▼'} {currencySymbol}{fmtNum(Math.abs(unrealized))} ({summary?.pnlPercent >= 0 ? '+' : ''}{(summary?.pnlPercent ?? 0).toFixed(2)}%)
            </span>
            <span className={styles.heroDeltaSep}>·</span>
            <span className={styles.heroDeltaMuted}>
              Today {today >= 0 ? '+' : '−'}{currencySymbol}{fmtNum(Math.abs(today))} ({(summary?.todaysPnLPercent ?? 0).toFixed(2)}%)
            </span>
          </div>
        </div>
        <span className={styles.heroBadge} style={{ color: 'var(--accent-primary)', background: 'color-mix(in srgb, var(--accent-primary) 13%, transparent)' }}>
          <span className={styles.heroBadgeDot} style={{ background: 'var(--accent-primary)' }} />
          {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
        </span>
      </div>

      {segments.length > 0 && (
        <div className={styles.allocWrap}>
          <div className={styles.allocBar}>
            {segments.map((seg, i) => (
              <span
                key={seg.ticker}
                className={styles.allocSeg}
                style={{ width: `${(seg.value / totalVal) * 100}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                title={`${seg.ticker} — ${((seg.value / totalVal) * 100).toFixed(1)}%`}
              />
            ))}
          </div>
          <div className={styles.allocLegend}>
            {segments.map((seg, i) => (
              <span key={seg.ticker} className={styles.allocLegendItem}>
                <span className={styles.allocDot} style={{ background: ALLOC_COLORS[i % ALLOC_COLORS.length] }} />
                {displayTicker(seg.ticker)}
                <span className={styles.allocLegendPct}>{((seg.value / totalVal) * 100).toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.heroStats}>
        {stat('Invested', `${currencySymbol}${fmtNum(invested)}`, 'Cost basis at purchase')}
        {stat('Unrealized P&L', `${unrealized >= 0 ? '+' : ''}${currencySymbol}${fmtNum(Math.abs(unrealized))}`,
          `${(summary?.pnlPercent ?? 0).toFixed(2)}% on cost`,
          unrealized >= 0 ? 'var(--profit-color)' : 'var(--loss-color)')}
        {stat("Today's P&L", `${today >= 0 ? '+' : ''}${currencySymbol}${fmtNum(Math.abs(today))}`,
          `${(summary?.todaysPnLPercent ?? 0).toFixed(2)}% today`,
          today >= 0 ? 'var(--profit-color)' : 'var(--loss-color)')}
        {stat('Largest Position', displayTicker(segments[0]?.ticker) || '—',
          segments[0] ? `${((segments[0].value / totalVal) * 100).toFixed(1)}% of portfolio` : 'No holdings')}
      </div>

      <div className={styles.heroFoot}>
        <span>{best ? `Best: ${displayTicker(best.ticker)} ${best.pnl >= 0 ? '+' : '−'}${currencySymbol}${fmtNum(Math.abs(best.pnl))}` : ''}</span>
        <span>{worst && worst.ticker !== best?.ticker ? `Worst: ${displayTicker(worst.ticker)} ${worst.pnl >= 0 ? '+' : '−'}${currencySymbol}${fmtNum(Math.abs(worst.pnl))}` : ''}</span>
      </div>
    </section>
  );
};

// ---- Sub-components ----

const KpiCard = ({ label, value, sub, subColor, accent, hero, theme }) => (
  <div className={`${styles.kpiCard} ${hero ? styles.kpiCardHero : ''}`}>
    <div className={styles.kpiLabel}>{label}</div>
    <div className={styles.kpiValue} style={accent ? { color: accent } : {}}>
      {value}
    </div>
    {sub && (
      <div className={styles.kpiSub} style={{ color: subColor || 'var(--text-muted)' }}>{sub}</div>
    )}
  </div>
);

const SectionLabel = ({ children }) => (
  <div className={styles.sectionLabel}>{children}</div>
);

const ChartCard = ({ title, subtitle, badge, badgeLoss, full, children, height = 'normal' }) => (
  <div className={`${styles.chartCard} ${full ? styles.chartCardFull : ''}`}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
      <div className={styles.chartTitle}>{title}</div>
      {badge && (
        <span className={`${styles.equityBadge} ${badgeLoss ? styles.equityBadgeLoss : ''}`}>
          {badge}
        </span>
      )}
    </div>
    {subtitle && <div className={styles.chartSubtitle}>{subtitle}</div>}
    <div className={height === 'tall' ? styles.chartContainerTall : height === 'small' ? styles.chartContainerSmall : styles.chartContainer}>
      {children}
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const cls = s === 'open' ? styles.badgeOpen : s === 'closed' ? styles.badgeClosed : styles.badgePartial;
  return <span className={`${styles.badge} ${cls}`}>{status}</span>;
};

// ============================================================
const CURRENCY_TABS = [
  { code: 'INR', label: 'INR', flag: '🇮🇳' },
  { code: 'USD', label: 'USD', flag: '🇺🇸' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [capitalMap, setCapitalMap] = useState({});

  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('dashboardActiveTab') || 'trading' : 'trading'
  );
  const [tradingCurrency, setTradingCurrency] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('dashboardTradingCurrency') || 'INR' : 'INR'
  );

  const [investmentSummary, setInvestmentSummary] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [investmentLoading, setInvestmentLoading] = useState(false);
  const [investmentError, setInvestmentError] = useState(null);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('ishastra-welcomed') === 'true' : true
  );

  // Viewport listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load trading data — re-runs on login/logout (`user` changes identity),
  // not just on mount. Without this, logging out left the previous user's
  // (or guest's) cached trades/capital on screen until a manual page
  // reload, since nothing else ever told this effect to refetch.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let networkErr = false;
      try {
        const [tradesRes, capitalRes] = await Promise.allSettled([
          getAllTrades(),
          getCapitalInfo()
        ]);

        if (tradesRes.status === 'fulfilled') {
          const tradesWithExits = await Promise.all(tradesRes.value.data.map(async trade => {
            try {
              const txRes = await getTradeTransactions(trade.id);
              const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
              return { ...trade, exitTransactions: exitTx };
            } catch { return { ...trade, exitTransactions: [] }; }
          }));
          setTrades(tradesWithExits);
        } else if (tradesRes.reason?.type === 'NETWORK_ERROR') {
          networkErr = true;
        }

        if (capitalRes.status === 'fulfilled') {
          const arr = Array.isArray(capitalRes.value?.data) ? capitalRes.value.data : [];
          const map = {};
          arr.forEach(item => { if (item?.currency) map[item.currency.toUpperCase()] = item; });
          setCapitalMap(map);
        } else {
          setCapitalMap({});
        }

        setError(networkErr ? { type: 'NETWORK_ERROR', message: 'Unable to connect to server.' } : null);
      } catch (err) {
        setError({ type: 'UNKNOWN_ERROR', message: 'An unexpected error occurred.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const dismissWelcome = () => {
    setWelcomeDismissed(true);
    if (typeof window !== 'undefined') localStorage.setItem('ishastra-welcomed', 'true');
  };

  // Load investment data — raw list only; currency-scoped summary is
  // derived below via useMemo so switching currency doesn't need a refetch.
  useEffect(() => {
    if (activeTab !== 'investment') return;
    setInvestmentLoading(true);
    setInvestmentError(null);
    getAllInvestments(true)
      .then((listResponse) => {
        setInvestments(listResponse.data || []);
      })
      .catch(setInvestmentError)
      .finally(() => setInvestmentLoading(false));
  }, [activeTab, user]);

  // Investments scoped to the active currency tab — mirrors currencyTrades.
  const investmentsCurrency = React.useMemo(() =>
    (Array.isArray(investments) ? investments : []).filter(
      inv => (inv.currency || 'INR').toUpperCase() === tradingCurrency
    ),
    [investments, tradingCurrency]
  );

  React.useEffect(() => {
    const list = investmentsCurrency;
    let totalInvested = 0, totalHoldings = 0, unrealizedPnL = 0, avgBuyPrice = 0, todaysPnL = 0;
    if (list.length > 0) {
      totalInvested = list.reduce((s, inv) => s + (inv.avgBuyPrice || 0) * (inv.quantity || 0), 0);
      totalHoldings = list.reduce((s, inv) => s + (inv.currentPrice || 0) * (inv.quantity || 0), 0);
      unrealizedPnL = totalHoldings - totalInvested;
      const totalQty = list.reduce((s, inv) => s + (inv.quantity || 0), 0);
      avgBuyPrice = totalQty ? totalInvested / totalQty : 0;
      const lastHoldings = list.reduce((s, inv) => s + (inv.lastDayPrice || 0) * (inv.quantity || 0), 0);
      todaysPnL = totalHoldings - lastHoldings;
    }
    setInvestmentSummary({
      totalInvested: Math.floor(totalInvested),
      totalHoldings: Math.floor(totalHoldings),
      unrealizedPnL: Math.floor(unrealizedPnL),
      avgBuyPrice: Math.floor(avgBuyPrice),
      todaysPnL: Math.floor(todaysPnL),
      pnlPercent: totalHoldings > 0 ? (unrealizedPnL / totalHoldings) * 100 : 0,
      todaysPnLPercent: totalHoldings > 0 ? (todaysPnL / totalHoldings) * 100 : 0
    });
  }, [investmentsCurrency]);

  // ---- Derived trading data ----
  const currencySymbol = tradingCurrency === 'USD' ? '$' : '₹';
  // For a logged-in user, excludes isPaperTrade=true rows from all dashboard
  // analytics (KPIs, equity curve, drawdown, R-multiple, calendar, recent
  // trades) — those are still visible/manageable on the Trades list, just
  // not counted toward real performance numbers here. This must NOT apply
  // to guests: every guest-sandbox row is isPaperTrade=true by definition
  // (that's the guest-sandbox signal itself), so applying the same filter
  // there would strip 100% of the guest dashboard's data.
  const currencyTrades = React.useMemo(() =>
    trades.filter(t =>
      (t.currency || 'INR').toUpperCase() === tradingCurrency && (!user || t.isPaperTrade !== true)
    ),
    [trades, tradingCurrency, user]
  );

  const totalCommissions = React.useMemo(() =>
    currencyTrades.reduce((s, t) => s + (Number(t.entryCommission || 0) + Number(t.exitCommission || 0)), 0),
    [currencyTrades]
  );

  const capitalMetrics = React.useMemo(() => {
    const cap = capitalMap[tradingCurrency] || { total: 0 };
    const initialCap = Number(cap.total || 0);

    let closedTradePnl = 0, openTradePnl = 0, capitalDeployed = 0, currentVal = 0;
    let activeTrades = 0, closedCount = 0, wins = 0, breakEvens = 0, losses = 0;
    let todayChange = 0, todayBase = 0;

    currencyTrades.forEach(t => {
      const rem = getRemainingQtySafe(t);
      const status = (t.status || '').toLowerCase();
      const isOpen = rem > 0 || status === 'open' || status === 'partially closed';

      if (isOpen) {
        activeTrades++;
        capitalDeployed += Number(t.entryPrice || 0) * rem;
        if (t.currentPrice) currentVal += Number(t.currentPrice) * rem;
        openTradePnl += getUnRealizedPnLSafe(t);

        if (rem > 0 && t.lastDayPrice != null && t.currentPrice != null) {
          const sign = (t.direction || 'long').toLowerCase() === 'short' ? -1 : 1;
          todayChange += sign * (Number(t.currentPrice) - Number(t.lastDayPrice)) * rem;
          todayBase += Number(t.lastDayPrice) * rem;
        }
      } else {
        closedCount++;
        const realizedPnL = getRealizedPnLSafe(t);
        closedTradePnl += realizedPnL;
        const invested = Number(t.entryPrice || 0) * Number(t.quantity || 0);
        const tradePnlPct = invested > 0 ? (realizedPnL / invested) * 100 : 0;
        if (tradePnlPct > 1) wins++;
        else if (tradePnlPct >= -1) breakEvens++;
        else losses++;
      }
    });

    const finalPnl = closedTradePnl + openTradePnl - totalCommissions;
    const portfolioValue = initialCap + finalPnl;
    const pnlPct = initialCap > 0 ? (finalPnl / initialCap) * 100 : 0;
    const decidedCount = wins + losses;
    const winRate = decidedCount > 0 ? (wins / decidedCount) * 100 : null;
    const todayPct = todayBase > 0 ? (todayChange / todayBase) * 100 : null;
    const unrealizedPnl = currencyTrades.reduce((s, t) => {
      const rem = getRemainingQtySafe(t);
      return rem > 0 ? s + (Number(t.currentPrice || 0) - Number(t.entryPrice || 0)) * rem : s;
    }, 0);

    return {
      initialCap, portfolioValue, finalPnl, pnlPct,
      capitalDeployed, currentVal, closedTradePnl, openTradePnl,
      winRate, wins, breakEvens, losses, closedCount, activeTrades,
      totalTrades: currencyTrades.length,
      todayChange, todayBase, todayPct, unrealizedPnl
    };
  }, [currencyTrades, capitalMap, tradingCurrency, totalCommissions]);

  const equityCurveInitial = capitalMetrics.initialCap > 0 ? capitalMetrics.initialCap : 0;

  const risk = React.useMemo(() => computeRisk(currencyTrades), [currencyTrades]);
  const equityPoints = React.useMemo(
    () => buildEquitySeries(currencyTrades, capitalMetrics.initialCap),
    [currencyTrades, capitalMetrics.initialCap]
  );

  // Equity curve total return — derived from realized exits only, matches the chart.
  // Commission is subtracted per trade so this agrees with capitalMetrics.finalPnl,
  // which already deducts totalCommissions.
  const equityReturn = React.useMemo(() => {
    const init = equityCurveInitial || 100000;
    let eq = init;
    currencyTrades.filter(t => t.exitDate).forEach(t => {
      if (t.entryPrice == null || t.quantity == null || !t.direction) return;
      const exit = t.exitPrice != null ? t.exitPrice : t.entryPrice;
      const diff = t.direction.toLowerCase() === 'long' ? exit - t.entryPrice : t.entryPrice - exit;
      const commission = Number(t.entryCommission || 0) + Number(t.exitCommission || 0);
      eq += diff * t.quantity - commission;
    });
    return ((eq - init) / init) * 100;
  }, [currencyTrades, equityCurveInitial]);

  if (error?.type === 'NETWORK_ERROR') {
    return <ErrorPage title="Unable to Connect" message={error.message} onRetry={() => window.location.reload()} />;
  }

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--border-primary)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading dashboard…</span>
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const { portfolioValue, finalPnl, pnlPct, capitalDeployed, currentVal,
          winRate, totalTrades, activeTrades, closedCount, breakEvens,
          todayChange, todayBase, todayPct, unrealizedPnl } = capitalMetrics;

  // Recent trades (sorted by entry date desc)
  const recentTrades = [...currencyTrades]
    .sort((a, b) => new Date(b.entryDate || 0) - new Date(a.entryDate || 0))
    .slice(0, 8);

  return (
    <div className={styles.dashboardContainer}>

      {/* ========== PAGE TOOLBAR (view tabs + currency scope) ========== */}
      <PageToolbar
        title="Dashboard"
        subtitle={activeTab === 'trading'
          ? 'Live exposure, realized performance and trade analytics'
          : 'Long-term holdings, allocation and portfolio growth'}
        tabs={[
          { key: 'trading', label: 'Trading', Icon: CandlestickChartOutlined },
          { key: 'investment', label: 'Investment', Icon: AccountBalanceWalletOutlined },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); localStorage.setItem('dashboardActiveTab', tab); }}
        scope={CURRENCY_TABS.map(c => ({ key: c.code, label: c.code, flag: c.flag }))}
        activeScope={tradingCurrency}
        onScopeChange={(code) => { setTradingCurrency(code); localStorage.setItem('dashboardTradingCurrency', code); }}
      />

      {/* ========== WELCOME CARD (guest visitors only) ========== */}
      {!welcomeDismissed && !user && (
        <div className={styles.welcomeCard}>
          <button className={styles.welcomeClose} onClick={dismissWelcome} aria-label="Dismiss">✕</button>
          <h3 className={styles.welcomeTitle}>👋 Welcome to Ishastra</h3>
          <p className={styles.welcomeText}>
            This is a trade journal and review tool — not a trading signal system. A few things to try first:
          </p>
          <div className={styles.welcomeActions}>
            <button className={styles.welcomeActionBtn} onClick={() => navigate('/trades/new')}>+ Add a Trade</button>
            <button className={styles.welcomeActionBtn} onClick={() => navigate('/scan')}>🔎 Run a Scan</button>
            <button className={styles.welcomeActionBtn} onClick={() => navigate('/chart')}>📈 Try Chart Review</button>
          </div>
        </div>
      )}

      {/* ========== TRADING TAB ========== */}
      {activeTab === 'trading' && (
        <>
          <HeroPanel
            currencySymbol={currencySymbol}
            portfolioValue={portfolioValue}
            finalPnl={finalPnl}
            pnlPct={pnlPct}
            todayChange={todayChange}
            todayPct={todayPct}
            todayBase={todayBase}
            winRate={winRate}
            wins={capitalMetrics.wins}
            breakEvens={breakEvens}
            losses={capitalMetrics.losses}
            totalTrades={totalTrades}
            activeTrades={activeTrades}
            closedCount={closedCount}
            totalCommissions={totalCommissions}
            initialCap={capitalMetrics.initialCap}
            risk={risk}
            equityPoints={equityPoints}
          />

          <OpenPositionsCard risk={risk} initialCap={capitalMetrics.initialCap} currencySymbol={currencySymbol} />

          {/* ---- CHARTS ---- */}
          <SectionLabel>Performance Charts</SectionLabel>
          <div className={styles.chartsGrid}>
            {/* Row 1 — equity growth paired with the drawdown it hides */}
            <ChartCard
              title="Equity Curve"
              subtitle="Cumulative portfolio growth from realized trade P&L"
              badge={`${equityReturn >= 0 ? '▲ +' : '▼ '}${Math.abs(equityReturn).toFixed(2)}%`}
              badgeLoss={equityReturn < 0}
              height="tall"
            >
              <EquityCurve trades={currencyTrades} initialCapital={equityCurveInitial} currencySymbol={currencySymbol} />
            </ChartCard>

            <ChartCard
              title="Drawdown"
              subtitle="How far equity has fallen from its running peak"
              height="tall"
            >
              <DrawdownChart trades={currencyTrades} initialCapital={equityCurveInitial} currencySymbol={currencySymbol} />
            </ChartCard>

            {/* Row 2 — period performance */}
            <ChartCard title="Monthly P&L" subtitle="Realized profit/loss per month (last 12 months)">
              <PerformanceChart trades={currencyTrades} currency={tradingCurrency} />
            </ChartCard>

            <ChartCard title="Portfolio Growth" subtitle="Monthly portfolio value (realized P&L + current unrealized)">
              <InvestmentValueChart investments={currencyTrades} isTrade={true} initialCapital={equityCurveInitial} currencySymbol={currencySymbol} />
            </ChartCard>

            {/* Row 3 — trade-level distribution */}
            <ChartCard title="R-Multiple Distribution" subtitle="Are you a few big winners, or death by 1000 cuts?">
              <RMultipleHistogram trades={currencyTrades} />
            </ChartCard>

            <ChartCard title="Daily P&L Calendar" subtitle="Trailing 12 months, colored by realized P&L">
              <CalendarHeatmap trades={currencyTrades} currencySymbol={currencySymbol} />
            </ChartCard>
          </div>

          {/* ---- RECENT TRADES ---- */}
          <SectionLabel>Recent Trades</SectionLabel>
          <div className={styles.tableCard}>
            <div className={styles.tableHeader}>
              <h3 className={styles.tableTitle}>Recent Trades</h3>
              <button className={styles.viewMoreBtn} onClick={() => navigate('/trades')}>View All</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead className={styles.tableThead}>
                  <tr>
                    <th className={styles.tableTh}>Ticker</th>
                    <th className={`${styles.tableTh} ${styles.hideOnMobile}`}>Status</th>
                    <th className={`${styles.tableTh} ${styles.hideOnMobile}`}>Entry Date</th>
                    <th className={`${styles.tableTh} ${styles.tableThRight} ${styles.hideOnMobile}`}>Entry Price</th>
                    <th className={`${styles.tableTh} ${styles.tableThRight} ${styles.hideOnMobile}`}>Qty</th>
                    <th className={`${styles.tableTh} ${styles.tableThRight} ${styles.hideOnMobile}`}>Sold</th>
                    <th className={`${styles.tableTh} ${styles.tableThRight} ${styles.hideOnMobile}`}>Avg Exit</th>
                    <th className={`${styles.tableTh} ${styles.tableThRight}`}>P&L</th>
                    <th className={`${styles.tableTh} ${styles.tableThRight}`}>R</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No trades found</td>
                    </tr>
                  ) : recentTrades.map((trade, idx) => {
                    const originalQty = Number(trade.quantity || 0);
                    const remainingQty = trade.remainingQuantity != null ? Number(trade.remainingQuantity) : originalQty;
                    const soldQty = originalQty - remainingQty;
                    const pnl = getPartialPL(trade);
                    const pnlNum = Number(pnl);
                    const avgExit = getAverageExitPrice(trade);
                    // R-Multiple: actual P&L ÷ initial risk per unit (entryPrice - stopLoss) × soldQty
                    let rMultiple = null;
                    if (trade.rMultiple != null) {
                      rMultiple = Number(trade.rMultiple).toFixed(2);
                    } else if (trade.stopLoss != null && trade.entryPrice != null && soldQty > 0) {
                      const riskPerUnit = Math.abs(Number(trade.entryPrice) - Number(trade.stopLoss));
                      if (riskPerUnit > 0) rMultiple = (pnlNum / (riskPerUnit * soldQty)).toFixed(2);
                    }

                    return (
                      <tr key={trade.id || idx} className={styles.tableTr}
                        style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td className={styles.tableTd}>
                          <span className={styles.tickerPill}>{trade.ticker}</span>
                        </td>
                        <td className={`${styles.tableTd} ${styles.hideOnMobile}`}><StatusBadge status={trade.status} /></td>
                        <td className={`${styles.tableTd} ${styles.hideOnMobile}`}>{trade.entryDate ? formatDate(trade.entryDate) : '—'}</td>
                        <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.hideOnMobile}`}>
                          {trade.entryPrice != null ? `${currencySymbol}${Number(trade.entryPrice).toFixed(2)}` : '—'}
                        </td>
                        <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.hideOnMobile}`}>{originalQty}</td>
                        <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.hideOnMobile}`}>{soldQty || '—'}</td>
                        <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.hideOnMobile}`}>
                          {soldQty > 0 && avgExit !== '—' ? avgExit : '—'}
                        </td>
                        <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                          style={{ color: pnlNum > 0 ? 'var(--profit-color)' : pnlNum < 0 ? 'var(--loss-color)' : 'var(--text-muted)' }}>
                          {soldQty > 0 && pnl !== '0' ? `${pnlNum >= 0 ? '+' : ''}${currencySymbol}${pnl}` : '—'}
                        </td>
                        <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                          style={{ color: rMultiple == null ? 'var(--text-muted)' : rMultiple >= 1 ? 'var(--profit-color)' : rMultiple >= 0 ? 'var(--warning-color)' : 'var(--loss-color)' }}>
                          {rMultiple != null ? `${rMultiple}R` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========== INVESTMENT TAB ========== */}
      {activeTab === 'investment' && (
        <>
          {investmentLoading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 60 }}>Loading investment dashboard…</div>
          ) : investmentError ? (
            <div style={{ color: 'var(--error-color)', textAlign: 'center', padding: 60 }}>Failed to load investment data.</div>
          ) : (
            <>
              <InvestmentHero
                investments={investmentsCurrency}
                summary={investmentSummary}
                currencySymbol={currencySymbol}
              />

              {/* ---- CHARTS ---- */}
              <SectionLabel>Analytics</SectionLabel>
              <div className={styles.chartsGrid}>
                <ChartCard title="Investment Value Over Time" subtitle="Cumulative invested vs current market value">
                  <InvestmentValueChart investments={investmentsCurrency} currencySymbol={currencySymbol} />
                </ChartCard>
                <ChartCard title="Top Holdings by Value" subtitle="Largest positions by current market value">
                  <TopHoldingsBarChart investments={investmentsCurrency} currencySymbol={currencySymbol} />
                </ChartCard>
              </div>

              <SectionLabel>Allocation & Stats</SectionLabel>
              <div className={styles.analyticsGrid3}>
                <ChartCard title="Sector Allocation" subtitle="Portfolio weight by sector" height="small">
                  <SectorDonutChart investments={investmentsCurrency} currencySymbol={currencySymbol} />
                </ChartCard>
                <ChartCard title="Market Cap Allocation" subtitle="Large / Mid / Small cap breakdown" height="small">
                  <MarketCapPieChart investments={investmentsCurrency} currencySymbol={currencySymbol} />
                </ChartCard>

                {/* Key Stats Card */}
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Key Stats</div>
                  <div className={styles.chartSubtitle}>CAGR, returns and top performers</div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                    {[
                      {
                        label: 'Total Return',
                        value: (() => {
                          const arr = investmentsCurrency;
                          const inv = arr.reduce((s, x) => s + (x.avgBuyPrice || 0) * (x.quantity || 0), 0);
                          const cur = arr.reduce((s, x) => s + (x.currentPrice || 0) * (x.quantity || 0), 0);
                          if (!inv) return '—';
                          const r = ((cur - inv) / inv) * 100;
                          return `${r >= 0 ? '+' : ''}${r.toFixed(2)}%`;
                        })(),
                        color: '#10B981'
                      },
                      {
                        label: 'CAGR',
                        value: (() => {
                          const arr = investmentsCurrency;
                          const inv = arr.reduce((s, x) => s + (x.avgBuyPrice || 0) * (x.quantity || 0), 0);
                          const cur = arr.reduce((s, x) => s + (x.currentPrice || 0) * (x.quantity || 0), 0);
                          if (!inv || !arr.length) return '—';
                          const dates = arr.map(x => x.createdAt ? new Date(x.createdAt) : null).filter(Boolean);
                          if (!dates.length) return '—';
                          const years = (Date.now() - Math.min(...dates.map(d => d.getTime()))) / (365.25 * 86400000);
                          if (years <= 0) return '—';
                          return `${((Math.pow(cur / inv, 1 / years) - 1) * 100).toFixed(2)}%`;
                        })(),
                        color: '#F59E0B'
                      },
                      {
                        label: 'Best Performer',
                        value: (() => {
                          const arr = investmentsCurrency;
                          if (!arr.length) return '—';
                          const best = [...arr].sort((a, b) => ((b.currentPrice - b.avgBuyPrice) * b.quantity) - ((a.currentPrice - a.avgBuyPrice) * a.quantity))[0];
                          const pnl = (best.currentPrice - best.avgBuyPrice) * best.quantity;
                          return `${displayTicker(best.ticker)} (${pnl >= 0 ? '+' : ''}${currencySymbol}${fmtNum(pnl)})`;
                        })(),
                        color: '#10B981'
                      },
                      {
                        label: 'Worst Performer',
                        value: (() => {
                          const arr = investmentsCurrency;
                          if (!arr.length) return '—';
                          const worst = [...arr].sort((a, b) => ((a.currentPrice - a.avgBuyPrice) * a.quantity) - ((b.currentPrice - b.avgBuyPrice) * b.quantity))[0];
                          const pnl = (worst.currentPrice - worst.avgBuyPrice) * worst.quantity;
                          return `${displayTicker(worst.ticker)} (${pnl >= 0 ? '+' : ''}${currencySymbol}${fmtNum(pnl)})`;
                        })(),
                        color: '#EF4444'
                      }
                    ].map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-primary)' }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                        <span style={{ fontSize: 13, color: row.color, fontWeight: 800 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ---- TABLES ---- */}
              <SectionLabel>Positions</SectionLabel>

              {/* Top Gainers */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>Top Gainers</h3>
                  <button className={styles.viewMoreBtn} onClick={() => navigate('/investments')}>View All</button>
                </div>
                <InvestmentTable investments={investmentsCurrency} type="gainers" theme={theme} currencySymbol={currencySymbol} />
              </div>

              {/* Top Losers */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>Top Losers</h3>
                  <button className={styles.viewMoreBtn} onClick={() => navigate('/investments')}>View All</button>
                </div>
                <InvestmentTable investments={investmentsCurrency} type="losers" theme={theme} currencySymbol={currencySymbol} />
              </div>

              {/* Recent Investments */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>Recent Investments</h3>
                  <button className={styles.viewMoreBtn} onClick={() => navigate('/investments')}>View All</button>
                </div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead className={styles.tableThead}>
                      <tr>
                        <th className={styles.tableTh}>Ticker</th>
                        <th className={`${styles.tableTh} ${styles.tableThRight}`}>Qty</th>
                        <th className={`${styles.tableTh} ${styles.tableThRight}`}>Avg Buy</th>
                        <th className={`${styles.tableTh} ${styles.tableThRight}`}>Current</th>
                        <th className={`${styles.tableTh} ${styles.tableThRight}`}>Today's P&L</th>
                        <th className={`${styles.tableTh} ${styles.tableThRight}`}>Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investmentsCurrency.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No investments found</td></tr>
                      ) : investmentsCurrency.slice().sort((a, b) => (b.entryDate || 0) - (a.entryDate || 0)).slice(0, 6).map((inv, idx) => {
                        const pnl = (inv.currentPrice - inv.avgBuyPrice) * inv.quantity;
                        const todayPnl = (inv.currentPrice - (inv.lastDayPrice || inv.currentPrice)) * inv.quantity;
                        return (
                          <tr key={inv.id || idx} className={styles.tableTr}
                            style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td className={styles.tableTd}><span className={styles.tickerPill}>{displayTicker(inv.ticker)}</span></td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight}`}>{inv.quantity}</td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight}`}>{currencySymbol}{fmtNum(inv.avgBuyPrice)}</td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight}`}>{currencySymbol}{fmtNum(inv.currentPrice)}</td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                              style={{ color: todayPnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                              {todayPnl >= 0 ? '+' : ''}{currencySymbol}{isNaN(todayPnl) ? '—' : fmtNum(todayPnl)}
                            </td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                              style={{ color: pnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                              {pnl >= 0 ? '+' : ''}{currencySymbol}{isNaN(pnl) ? '—' : fmtNum(pnl)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

// ---- Investment Gainers/Losers sub-table ----
const InvestmentTable = ({ investments, type, theme, currencySymbol = '₹' }) => {
  const arr = Array.isArray(investments) ? investments : [];
  if (!arr.length) return <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No data</div>;

  const enriched = arr
    .map(inv => ({
      ...inv,
      ret: inv.avgBuyPrice ? ((inv.currentPrice - inv.avgBuyPrice) / inv.avgBuyPrice) * 100 : 0,
      pnl: (inv.currentPrice - inv.avgBuyPrice) * inv.quantity
    }))
    .sort((a, b) => b.ret - a.ret);

  const rows = type === 'gainers' ? enriched.slice(0, 3) : enriched.slice(-3).reverse();

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead className={styles.tableThead}>
          <tr>
            <th className={styles.tableTh}>Ticker</th>
            <th className={styles.tableTh}>Sector</th>
            <th className={`${styles.tableTh} ${styles.tableThRight}`}>% Return</th>
            <th className={`${styles.tableTh} ${styles.tableThRight}`}>Unrealized P&L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((inv, idx) => (
            <tr key={inv.id || idx} className={styles.tableTr}
              style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
              <td className={styles.tableTd}><span className={styles.tickerPill}>{displayTicker(inv.ticker)}</span></td>
              <td className={styles.tableTd}>{inv.sector || '—'}</td>
              <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                style={{ color: inv.ret >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                {inv.ret >= 0 ? '+' : ''}{inv.ret.toFixed(2)}%
              </td>
              <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                style={{ color: inv.pnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                {inv.pnl >= 0 ? '+' : ''}{currencySymbol}{isNaN(inv.pnl) ? '—' : inv.pnl.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
