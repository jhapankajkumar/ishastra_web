import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTrades, deleteTrade, getTradeTransactions } from "../api/tradeApi";
import { getAllInvestments, getInvestmentSummary } from '../api/investmentApi';
import EquityCurve from '../components/EquityCurve';
import PerformanceChart from '../components/PerformanceChart';
import InvestmentValueChart from '../components/InvestmentValueChart';
import SectorDonutChart from '../components/SectorDonutChart';
import TopHoldingsBarChart from '../components/TopHoldingsBarChart';
import MarketCapPieChart from '../components/MarketCapPieChart';
import ErrorPage from '../components/ErrorPage';
import { useTheme } from '../contexts/ThemeContext';
import styles from './Dashboard.module.css';
import { getExitTransactions, getAverageExitPrice, getPartialPL, formatDate, getInvested } from '../common/Helper';
import { fetchSetups } from "../api/firebaseMetaApi";
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
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
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
const Dashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
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

  // Viewport listener
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Load trading data
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
        }

        setError(networkErr ? { type: 'NETWORK_ERROR', message: 'Unable to connect to server.' } : null);
      } catch (err) {
        setError({ type: 'UNKNOWN_ERROR', message: 'An unexpected error occurred.' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load investment data
  useEffect(() => {
    if (activeTab !== 'investment') return;
    setInvestmentLoading(true);
    setInvestmentError(null);
    Promise.all([getInvestmentSummary(), getAllInvestments(true)])
      .then(([summaryResponse, listResponse]) => {
        const list = listResponse.data || [];
        let totalInvested = 0, totalHoldings = 0, unrealizedPnL = 0, avgBuyPrice = 0, todaysPnL = 0;
        if (Array.isArray(list) && list.length > 0) {
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
        setInvestments(list);
      })
      .catch(setInvestmentError)
      .finally(() => setInvestmentLoading(false));
  }, [activeTab]);

  // ---- Derived trading data ----
  const currencySymbol = tradingCurrency === 'USD' ? '$' : '₹';
  const currencyTrades = React.useMemo(() =>
    trades.filter(t => (t.currency || 'INR').toUpperCase() === tradingCurrency),
    [trades, tradingCurrency]
  );

  const totalCommissions = React.useMemo(() =>
    currencyTrades.reduce((s, t) => s + (Number(t.entryCommission || 0) + Number(t.exitCommission || 0)), 0),
    [currencyTrades]
  );

  const capitalMetrics = React.useMemo(() => {
    const cap = capitalMap[tradingCurrency] || { total: 0 };
    const initialCap = Number(cap.total || 0);

    let closedTradePnl = 0, openTradePnl = 0, capitalDeployed = 0, currentVal = 0;
    let activeTrades = 0, closedCount = 0, wins = 0;
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
        closedTradePnl += getRealizedPnLSafe(t);
        if (getRealizedPnLSafe(t) > 0) wins++;
      }
    });

    const finalPnl = closedTradePnl + openTradePnl - totalCommissions;
    const portfolioValue = initialCap + finalPnl;
    const pnlPct = initialCap > 0 ? (finalPnl / initialCap) * 100 : 0;
    const winRate = closedCount > 0 ? (wins / closedCount) * 100 : null;
    const todayPct = todayBase > 0 ? (todayChange / todayBase) * 100 : null;
    const unrealizedPnl = currencyTrades.reduce((s, t) => {
      const rem = getRemainingQtySafe(t);
      return rem > 0 ? s + (Number(t.currentPrice || 0) - Number(t.entryPrice || 0)) * rem : s;
    }, 0);

    return {
      initialCap, portfolioValue, finalPnl, pnlPct,
      capitalDeployed, currentVal, closedTradePnl, openTradePnl,
      winRate, wins, closedCount, activeTrades,
      totalTrades: currencyTrades.length,
      todayChange, todayBase, todayPct, unrealizedPnl
    };
  }, [currencyTrades, capitalMap, tradingCurrency, totalCommissions]);

  const equityCurveInitial = capitalMetrics.initialCap > 0 ? capitalMetrics.initialCap : 0;

  // Equity curve total return — derived from realized exits only, matches the chart
  const equityReturn = React.useMemo(() => {
    const init = equityCurveInitial || 100000;
    let eq = init;
    currencyTrades.filter(t => t.exitDate).forEach(t => {
      if (t.entryPrice == null || t.quantity == null || !t.direction) return;
      const exit = t.exitPrice != null ? t.exitPrice : t.entryPrice;
      const diff = t.direction.toLowerCase() === 'long' ? exit - t.entryPrice : t.entryPrice - exit;
      eq += diff * t.quantity;
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
          winRate, totalTrades, activeTrades, closedCount,
          todayChange, todayBase, todayPct, unrealizedPnl } = capitalMetrics;

  // Recent trades (sorted by entry date desc)
  const recentTrades = [...currencyTrades]
    .sort((a, b) => new Date(b.entryDate || 0) - new Date(a.entryDate || 0))
    .slice(0, 8);

  return (
    <div className={styles.dashboardContainer}>

      {/* ========== TAB BAR ========== */}
      <div className={styles.tabBar}>
        {['trading', 'investment'].map(tab => (
          <button
            key={tab}
            className={`${styles.tabBtn} ${activeTab === tab ? styles.tabBtnActive : ''}`}
            onClick={() => { setActiveTab(tab); localStorage.setItem('dashboardActiveTab', tab); }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ========== TRADING TAB ========== */}
      {activeTab === 'trading' && (
        <>
          {/* Currency switcher */}
          <div className={styles.currencyBar}>
            {['INR', 'USD'].map(cur => (
              <button
                key={cur}
                className={`${styles.currencyBtn} ${tradingCurrency === cur ? styles.currencyBtnActive : ''}`}
                onClick={() => { setTradingCurrency(cur); localStorage.setItem('dashboardTradingCurrency', cur); }}
              >
                {cur}
              </button>
            ))}
          </div>

          {/* ---- PORTFOLIO OVERVIEW ---- */}
          <SectionLabel>Portfolio Overview</SectionLabel>
          <div className={styles.kpiGrid}>
            <KpiCard
              hero
              label="Portfolio Value"
              value={`${currencySymbol}${fmtNum(portfolioValue)}`}
              sub={`${finalPnl >= 0 ? '+' : ''}${currencySymbol}${fmtNum(Math.abs(finalPnl))} (${pnlPct.toFixed(2)}%)`}
              subColor={pnlPct >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
              theme={theme}
            />
            <KpiCard
              label="Today's P&L"
              value={todayBase > 0 ? `${todayChange >= 0 ? '+' : ''}${currencySymbol}${fmtNum(Math.abs(todayChange))}` : '—'}
              sub={todayPct != null && todayBase > 0 ? `${todayPct.toFixed(2)}%` : undefined}
              subColor={todayChange >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
              accent={todayChange >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
              theme={theme}
            />
            <KpiCard
              label="Unrealized P&L"
              value={`${unrealizedPnl >= 0 ? '+' : ''}${currencySymbol}${fmtNum(Math.abs(unrealizedPnl))}`}
              accent={unrealizedPnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
              theme={theme}
            />
            <KpiCard
              label="Win Rate"
              value={winRate != null ? `${winRate.toFixed(1)}%` : '—'}
              sub={`${capitalMetrics.wins}W / ${closedCount - capitalMetrics.wins}L`}
              subColor="var(--text-muted)"
              theme={theme}
            />
          </div>

          {/* ---- CAPITAL METRICS ---- */}
          <SectionLabel>Capital Metrics</SectionLabel>
          <div className={styles.kpiGrid}>
            <KpiCard
              label="Deployed Capital"
              value={`${currencySymbol}${fmtNum(capitalDeployed)}`}
              accent="var(--accent-primary)"
              sub={`${activeTrades} open position${activeTrades !== 1 ? 's' : ''}`}
              theme={theme}
            />
            <KpiCard
              label="Current Market Value"
              value={`${currencySymbol}${fmtNum(currentVal)}`}
              accent="var(--accent-primary)"
              theme={theme}
            />
            <KpiCard
              label="Commission Paid"
              value={`${currencySymbol}${fmtNum(totalCommissions)}`}
              accent="var(--loss-color)"
              theme={theme}
            />
            <KpiCard
              label="Total Trades"
              value={`${totalTrades}`}
              sub={`${activeTrades} open · ${closedCount} closed`}
              subColor="var(--text-muted)"
              theme={theme}
            />
          </div>

          {/* ---- CHARTS ---- */}
          <SectionLabel>Performance Charts</SectionLabel>
          <div className={styles.chartsGrid}>
            {/* Equity Curve — full width */}
            <ChartCard
              full
              title="Equity Curve"
              subtitle="Cumulative portfolio growth from realized trade P&L"
              badge={`${equityReturn >= 0 ? '▲ +' : '▼ '}${Math.abs(equityReturn).toFixed(2)}%`}
              badgeLoss={equityReturn < 0}
              height="tall"
            >
              <EquityCurve trades={currencyTrades} initialCapital={equityCurveInitial} />
            </ChartCard>

            {/* Monthly P&L */}
            <ChartCard title="Monthly P&L" subtitle="Realized profit/loss per month (last 12 months)">
              <PerformanceChart trades={currencyTrades} currency={tradingCurrency} />
            </ChartCard>

            {/* Portfolio Value Over Time */}
            <ChartCard title="Portfolio Growth" subtitle="Monthly portfolio value (realized P&L + current unrealized)">
              <InvestmentValueChart investments={currencyTrades} isTrade={true} initialCapital={equityCurveInitial} />
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
              {/* ---- INVESTMENT SUMMARY ---- */}
              <SectionLabel>Portfolio Summary</SectionLabel>
              <div className={styles.invSummaryGrid}>
                <KpiCard
                  hero
                  label="Total Invested"
                  value={`₹${fmtNum(investmentSummary?.totalInvested)}`}
                  theme={theme}
                />
                <KpiCard
                  label="Current Value"
                  value={`₹${fmtNum(investmentSummary?.totalHoldings)}`}
                  accent="var(--profit-color)"
                  theme={theme}
                />
                <KpiCard
                  label="Today's P&L"
                  value={`${(investmentSummary?.todaysPnL || 0) >= 0 ? '+' : ''}₹${fmtNum(Math.abs(investmentSummary?.todaysPnL || 0))}`}
                  sub={`${investmentSummary?.todaysPnLPercent?.toFixed(2) ?? '0.00'}%`}
                  accent={(investmentSummary?.todaysPnL || 0) >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
                  subColor={(investmentSummary?.todaysPnL || 0) >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
                  theme={theme}
                />
                <KpiCard
                  label="Unrealized P&L"
                  value={`${(investmentSummary?.unrealizedPnL || 0) >= 0 ? '+' : ''}₹${fmtNum(Math.abs(investmentSummary?.unrealizedPnL || 0))}`}
                  sub={`${investmentSummary?.pnlPercent?.toFixed(2) ?? '0.00'}%`}
                  accent={(investmentSummary?.unrealizedPnL || 0) >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
                  subColor={(investmentSummary?.unrealizedPnL || 0) >= 0 ? 'var(--profit-color)' : 'var(--loss-color)'}
                  theme={theme}
                />
              </div>

              {/* ---- CHARTS ---- */}
              <SectionLabel>Analytics</SectionLabel>
              <div className={styles.chartsGrid}>
                <ChartCard title="Investment Value Over Time" subtitle="Cumulative invested vs current market value">
                  <InvestmentValueChart investments={Array.isArray(investments) ? investments : []} />
                </ChartCard>
                <ChartCard title="Top Holdings by Value" subtitle="Largest positions by current market value">
                  <TopHoldingsBarChart investments={Array.isArray(investments) ? investments : []} />
                </ChartCard>
              </div>

              <SectionLabel>Allocation & Stats</SectionLabel>
              <div className={styles.analyticsGrid3}>
                <ChartCard title="Sector Allocation" subtitle="Portfolio weight by sector" height="small">
                  <SectorDonutChart investments={Array.isArray(investments) ? investments : []} />
                </ChartCard>
                <ChartCard title="Market Cap Allocation" subtitle="Large / Mid / Small cap breakdown" height="small">
                  <MarketCapPieChart investments={Array.isArray(investments) ? investments : []} />
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
                          const arr = investments;
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
                          const arr = investments;
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
                          const arr = investments;
                          if (!arr.length) return '—';
                          const best = [...arr].sort((a, b) => ((b.currentPrice - b.avgBuyPrice) * b.quantity) - ((a.currentPrice - a.avgBuyPrice) * a.quantity))[0];
                          const pnl = (best.currentPrice - best.avgBuyPrice) * best.quantity;
                          return `${best.ticker} (${pnl >= 0 ? '+' : ''}₹${fmtNum(pnl)})`;
                        })(),
                        color: '#10B981'
                      },
                      {
                        label: 'Worst Performer',
                        value: (() => {
                          const arr = investments;
                          if (!arr.length) return '—';
                          const worst = [...arr].sort((a, b) => ((a.currentPrice - a.avgBuyPrice) * a.quantity) - ((b.currentPrice - b.avgBuyPrice) * b.quantity))[0];
                          const pnl = (worst.currentPrice - worst.avgBuyPrice) * worst.quantity;
                          return `${worst.ticker} (${pnl >= 0 ? '+' : ''}₹${fmtNum(pnl)})`;
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
                <InvestmentTable investments={investments} type="gainers" theme={theme} />
              </div>

              {/* Top Losers */}
              <div className={styles.tableCard}>
                <div className={styles.tableHeader}>
                  <h3 className={styles.tableTitle}>Top Losers</h3>
                  <button className={styles.viewMoreBtn} onClick={() => navigate('/investments')}>View All</button>
                </div>
                <InvestmentTable investments={investments} type="losers" theme={theme} />
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
                      {investments.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No investments found</td></tr>
                      ) : investments.slice().sort((a, b) => (b.entryDate || 0) - (a.entryDate || 0)).slice(0, 6).map((inv, idx) => {
                        const pnl = (inv.currentPrice - inv.avgBuyPrice) * inv.quantity;
                        const todayPnl = (inv.currentPrice - (inv.lastDayPrice || inv.currentPrice)) * inv.quantity;
                        return (
                          <tr key={inv.id || idx} className={styles.tableTr}
                            style={{ background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                            <td className={styles.tableTd}><span className={styles.tickerPill}>{inv.ticker}</span></td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight}`}>{inv.quantity}</td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight}`}>₹{fmtNum(inv.avgBuyPrice)}</td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight}`}>₹{fmtNum(inv.currentPrice)}</td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                              style={{ color: todayPnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                              {todayPnl >= 0 ? '+' : ''}₹{isNaN(todayPnl) ? '—' : fmtNum(todayPnl)}
                            </td>
                            <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                              style={{ color: pnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                              {pnl >= 0 ? '+' : ''}₹{isNaN(pnl) ? '—' : fmtNum(pnl)}
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
const InvestmentTable = ({ investments, type, theme }) => {
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
              <td className={styles.tableTd}><span className={styles.tickerPill}>{inv.ticker}</span></td>
              <td className={styles.tableTd}>{inv.sector || '—'}</td>
              <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                style={{ color: inv.ret >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                {inv.ret >= 0 ? '+' : ''}{inv.ret.toFixed(2)}%
              </td>
              <td className={`${styles.tableTd} ${styles.tableTdRight} ${styles.tableTdBold}`}
                style={{ color: inv.pnl >= 0 ? 'var(--profit-color)' : 'var(--loss-color)' }}>
                {inv.pnl >= 0 ? '+' : ''}₹{isNaN(inv.pnl) ? '—' : inv.pnl.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Dashboard;
