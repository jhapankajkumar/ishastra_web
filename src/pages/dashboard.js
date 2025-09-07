import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTrades, getTradeById, deleteTrade, getTradeTransactions } from "../api/tradeApi";
import { getDashboardSummary } from '../api/dashboardApi';
import { getAllInvestments, getInvestmentSummary } from '../api/investmentApi';
import EquityCurve from '../components/EquityCurve';
import SetupPerformanceChart from '../components/SetupPerformanceChart';
import TimeframePieChart from '../components/TimeframePieChart';
import PerformanceChart from '../components/PerformanceChart';
import DonutChart from '../components/DonutChart';

import PageHeader from '../components/PageHeader';
import ErrorPage from '../components/ErrorPage';
import InvestmentValueChart from '../components/InvestmentValueChart';
import SectorDonutChart from '../components/SectorDonutChart';
import TopHoldingsBarChart from '../components/TopHoldingsBarChart';
import MarketCapPieChart from '../components/MarketCapPieChart';
import { useTheme } from '../contexts/ThemeContext';
// import { useNotification } from '../components/NotificationProvider'; // Reserved for future use
import styles from './Dashboard.module.css';

import { getExitTransactions, getLastExitDate, getAverageExitPrice, getPartialPL, formatDate, getInvested } from '../common/Helper';
import { fetchSetups } from "../api/firebaseMetaApi";
import { getNasdaq } from "../data/tickerData";
import { getUnifiedAnalysis } from '../api/analysisApi';


const Dashboard = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [tags, setTags] = useState([]);
  const [setups, setSetups] = useState([]); // <-- Add setups state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Tabs: 'trading' or 'investment'
  const [activeTab, setActiveTab] = useState('investment');
  // Investment tab state
  const [investmentSummary, setInvestmentSummary] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [investmentLoading, setInvestmentLoading] = useState(false);
  const [investmentError, setInvestmentError] = useState(null);
  // Load investment data when tab is switched to 'investment'
  useEffect(() => {
    if (activeTab !== 'investment') return;
    setInvestmentLoading(true);
    setInvestmentError(null);
    Promise.all([getInvestmentSummary(), getAllInvestments(true)])
      .then(([summaryResponse, listResponse]) => {
        let summary = summaryResponse?.data || {};
        let list = listResponse.data || [];
        // Calculate values from investments if not present in summary
        let totalInvested = 0;
        let totalHoldings = 0;
        let unrealizedPnL = 0;
        let avgBuyPrice = 0;
        let todaysPnL = 0;
        let todaysPnLPercent = 0;
        let pnlPercent = 0;
        if (Array.isArray(list) && list.length > 0) {
          totalInvested = list.reduce((sum, inv) => sum + ((inv.avgBuyPrice || 0) * (inv.quantity || 0)), 0);
          totalHoldings = list.reduce((sum, inv) => sum + ((inv.currentPrice || 0) * (inv.quantity || 0)), 0);
          unrealizedPnL = list.reduce((sum, inv) => sum + ((inv.currentPrice - inv.avgBuyPrice) * (inv.quantity || 0)), 0);
          avgBuyPrice = totalInvested && list.length ? totalInvested / list.reduce((sum, inv) => sum + (inv.quantity || 0), 0) : 0;
          const lastTotalHoldings = list.reduce((sum, inv) => sum + ((inv.lastDayPrice || 0) * (inv.quantity || 0)), 0);
          todaysPnL = totalHoldings - lastTotalHoldings;
          console.log('Today\'s P&L:', todaysPnL);
          pnlPercent = totalHoldings > 0 ? (unrealizedPnL / totalHoldings) * 100 : 0;
          todaysPnLPercent = totalHoldings > 0 ? (todaysPnL / totalHoldings) * 100 : 0;

        }

        let mappedSummary = {
          totalInvested: Math.floor(totalInvested),
          totalHoldings: Math.floor(totalHoldings),
          unrealizedPnL: Math.floor(unrealizedPnL),
          avgBuyPrice: Math.floor(avgBuyPrice),
          todaysPnL: Math.floor(todaysPnL),
          pnlPercent: pnlPercent,
          todaysPnLPercent: todaysPnLPercent
          
        };

        setInvestmentSummary(mappedSummary);
        // Debug log for investment summary
        // eslint-disable-next-line no-console
        // console.log('[Dashboard] investment summary loaded:', mappedSummary);
        setInvestments(list);
        // Debug log for investments data
        // eslint-disable-next-line no-console
        // console.log('[Dashboard] investments loaded:', list);
      })
      .catch((err) => {
        setInvestmentError(err);
      })
      .finally(() => setInvestmentLoading(false));
  }, [activeTab]);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      let hasNetworkError = false;
      try {
        const [dashboardRes, tradesRes, setupsRes] = await Promise.allSettled([
          getDashboardSummary(),
          getAllTrades(),
          fetchSetups() // <-- Fetch setups from API
        ]);

        if (dashboardRes.status === 'fulfilled') {
          setStats(dashboardRes.value.data);
        } else {

          if (dashboardRes.reason?.type === 'NETWORK_ERROR') {
            hasNetworkError = true;
          }
        }

        if (tradesRes.status === 'fulfilled') {
          const tradesWithExits = await Promise.all(tradesRes.value.data.map(async trade => {
            try {
              const txRes = await getTradeTransactions(trade.id);
              // Only keep exit transactions
              const exitTx = (txRes.data || []).filter(tx => tx.transactionType === 'Exit');
              return { ...trade, exitTransactions: exitTx };
            } catch (e) {
              return { ...trade, exitTransactions: [] };
            }
          }));
          setTrades(tradesWithExits);
        } else {
          console.error('Trades error:', tradesRes.reason);
          if (tradesRes.reason?.type === 'NETWORK_ERROR') {
            hasNetworkError = true;
          }
        }

        if (setupsRes.status === 'fulfilled') {
          setSetups(setupsRes.value || []);
        } else {
          console.error('Setups error:', setupsRes.reason);
        }

        if (hasNetworkError) {
          setError({
            type: 'NETWORK_ERROR',
            message: 'Unable to connect to server. Please check your internet connection.'
          });
        } else {
          setError(null);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setError({
          type: 'UNKNOWN_ERROR',
          message: 'An unexpected error occurred. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  // Calculate additional metrics
  const totalPnL = React.useMemo(() => {
    return trades.reduce((total, trade) => total + Number(getPartialPL(trade)), 0);
  }, [trades]);

  const totalEquity = React.useMemo(() => {
    // Assuming starting equity of $100,000 (you can adjust this)
    const startingEquity = 100000;
    return startingEquity + totalPnL;
  }, [totalPnL]);

  const winningTrades = React.useMemo(() => {
    return trades.filter(trade => calculatePnl(trade) > 0);
  }, [trades]);

  const losingTrades = React.useMemo(() => {
    return trades.filter(trade => calculatePnl(trade) < 0);
  }, [trades]);

  const avgWin = React.useMemo(() => {
    if (winningTrades.length === 0) return 0;
    const totalWins = winningTrades.reduce((sum, trade) => sum + calculatePnl(trade), 0);
    return totalWins / winningTrades.length;
  }, [winningTrades]);

  const avgLoss = React.useMemo(() => {
    if (losingTrades.length === 0) return 0;
    const totalLosses = losingTrades.reduce((sum, trade) => sum + calculatePnl(trade), 0);
    return totalLosses / losingTrades.length;
  }, [losingTrades]);

  // ---- Move all hooks above any return ----
  const tagIdToName = React.useMemo(
    () => Object.fromEntries(tags.map(tag => [tag.tag_id, tag.name])),
    [tags]
  );

  const tagCounts = React.useMemo(() => {
    const acc = {};
    trades.forEach(trade => {
      if (trade.tags && Array.isArray(trade.tags)) {
        trade.tags.forEach(tagId => {
          const tagName = tagIdToName[tagId] || tagId;
          acc[tagName] = (acc[tagName] || 0) + 1;
        });
      }
    });
    return acc;
  }, [trades, tagIdToName]);

  const tagData = React.useMemo(
    () => Object.entries(tagCounts).map(([label, value]) => ({ label, value })),
    [tagCounts]
  );

  const setupCounts = React.useMemo(() => {
    return trades.reduce((acc, trade) => {
      const setup = trade.setup || 'Other';
      acc[setup] = (acc[setup] || 0) + 1;
      return acc;
    }, {});
  }, [trades]);
  const setupData = React.useMemo(
    () => Object.entries(setupCounts).map(([label, value]) => ({ label, value })),
    [setupCounts]
  );
  // const pnlBuckets = [ // Reserved for future chart implementation
  //   { label: '< -10K', min: -Infinity, max: -10000 },
  //   { label: '-10K', min: -10000, max: -5000 },
  //   { label: '-5K', min: -5000, max: -1000 },
  //   { label: '-1K', min: -1000, max: 0 },
  //   { label: '0', min: 0, max: 1000 },
  //   { label: '1K', min: 1000, max: 5000 },
  //   { label: '5K', min: 5000, max: 10000 },
  //   { label: '> 10K', min: 10000, max: Infinity }
  // ];
  // const perfData = pnlBuckets.map(bucket => { // Reserved for future chart implementation
  // const count = trades.filter(t => {
  //   const pnl = calculatePnl(t);
  //   return pnl > bucket.min && pnl <= bucket.max;
  // }).length;
  // // Invert count for negative buckets
  // return {
  //   label: bucket.label,
  //   count: bucket.max <= 0 ? -count : count
  // };
  // });

  // --- Recent Trades ---
  const recentTrades = trades
    .slice()
    .sort((a, b) => new Date(b.exitDate) - new Date(a.exitDate))
    .slice(0, 6);

  // --- Monthly PnL ---
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // function getMonthKey(dateStr) { // Reserved for future use
  //   const date = new Date(dateStr);
  //   return MONTHS[date.getMonth()];
  // }

  // Get the last 6 months as Date objects
  const now = new Date();
  const last6Months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last6Months.push({ month: MONTHS[d.getMonth()], year: d.getFullYear(), key: `${d.getFullYear()}-${d.getMonth()}` });
  }

  // Build a map for last 6 months only
  const monthlyPnlMap = {};
  last6Months.forEach(({ key }) => {
    monthlyPnlMap[key] = 0;
  });
  trades.forEach(trade => {
    if (!trade.exitDate) return;
    const date = new Date(trade.exitDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (monthlyPnlMap.hasOwnProperty(key)) {
      const pnl = calculatePnl(trade);
      monthlyPnlMap[key] += pnl;
    }
  });
  const monthlyPnlData = last6Months.map(({ month, key }) => ({
    month,
    pnl: monthlyPnlMap[key] || 0
  }));

  // Filter trades for last 6 months for EquityCurve
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const tradesLast6Months = trades.filter(trade => {
    if (!trade.exitDate) return false;
    const date = new Date(trade.exitDate);
    return date >= sixMonthsAgo;
  });

  // ---- Now you can conditionally return ----
  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Reload page to retry all data
    window.location.reload();
  };

  // --- Tab UI ---
  const tabStyle = (tab) => ({
    padding: '12px 40px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 18,
    border: 'none',
    borderRadius: 24,
    marginRight: 12,
    background: activeTab === tab
      ? 'var(--gradient-primary)'
      : theme === 'light' 
        ? 'var(--bg-tertiary)'
        : 'linear-gradient(90deg, #232e42 60%, #1A2332 100%)',
    color: activeTab === tab 
      ? '#fff' 
      : theme === 'light'
        ? 'var(--text-secondary)'
        : '#A1A7B3',
    boxShadow: activeTab === tab ? 'var(--shadow-primary-btn)' : 'none',
    outline: 'none',
    transition: 'all 0.2s ease',
    borderBottom: 'none',
    position: 'relative',
    zIndex: 1
  });

  if (error && error.type === 'NETWORK_ERROR') {
    return (
      <ErrorPage
        title="Unable to Connect"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  if (loading) {
    return (
      <div className={styles.dashboardContainer}>
        {/* <PageHeader 
          title="Dashboard"
          subtitle="Track your trading and investment analytics"
        /> */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          color: 'var(--text-muted)'
        }}>
          Loading dashboard...
        </div>
      </div>
    );
  }


  return (
    <div className={styles.dashboardContainer}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 0,
        marginBottom: 36,
        background: theme === 'light' 
          ? 'var(--bg-secondary)'
          : 'linear-gradient(90deg, #181F2A 60%, #1A2332 100%)',
        borderRadius: 32,
        padding: '8px 0',
        boxShadow: 'var(--shadow-md)',
        border: theme === 'light' 
          ? '1px solid var(--border-primary)'
          : '1px solid #232e42',
        width: '100%',
        maxWidth: 480,
        marginLeft: 'auto',
        marginRight: 'auto',
        position: 'relative',
      }}>
        <button style={tabStyle('trading')} onClick={() => setActiveTab('trading')}>Trading</button>
        <button style={tabStyle('investment')} onClick={() => setActiveTab('investment')}>Investment</button>
      </div>
      {/* Tab Content */}
      {activeTab === 'trading' ? (
        <>
          {/* Trading Summary Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 28,
            marginBottom: 40,
            background: theme === 'light' 
              ? 'var(--bg-secondary)'
              : "linear-gradient(90deg, #181F2A 60%, #1A2332 100%)",
            borderRadius: 18,
            padding: 16,
            border: theme === 'light' ? '1px solid var(--border-primary)' : 'none'
          }}>
            {/* Card: Total Trades */}
            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(135deg, #233554 60%, #1A2332 100%)",
              borderRadius: 16,
              padding: 28,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden'
            }}>
              <span style={{
                position: 'absolute',
                top: 18, left: 18,
                fontSize: 28,
                color: 'var(--accent-secondary)',
                opacity: 0.18
              }}>🔄</span>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Total Trades</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent-secondary)", letterSpacing: 1 }}>{trades.length}</div>
            </div>
            {/* Card: Total Trade Value */}
            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(135deg, #1A2332 60%, #193C3A 100%)",
              borderRadius: 16,
              padding: 28,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden'
            }}>
              <span style={{
                position: 'absolute',
                top: 18, left: 18,
                fontSize: 28,
                color: 'var(--success-color)',
                opacity: 0.18
              }}>💰</span>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Total Invested</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--success-color)", letterSpacing: 1 }}>
                ₹{trades && trades.length ? trades.reduce((sum, t) => {
                  const originalQty = t.quantity !== undefined && t.quantity !== null ? Number(t.quantity) : 0;
                  return sum + (t.entryPrice ? t.entryPrice * originalQty : 0);
                }, 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}
              </div>
            </div>
            {/* Card: Current Value of All Investments */}
            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(135deg, #233554 60%, #1A2332 100%)",
              borderRadius: 16,
              padding: 28,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden'
            }}>
              <span style={{
                position: 'absolute',
                top: 18, left: 18,
                fontSize: 28,
                color: 'var(--accent-primary)',
                opacity: 0.18
              }}>📈</span>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Current Value</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent-primary)", letterSpacing: 1 }}>
                ₹{trades && trades.length ? trades.reduce((sum, t) => {
                  const originalQty = t.quantity !== undefined && t.quantity !== null ? Number(t.quantity) : 0;
                  const entryVal = originalQty * (t.entryPrice || 0);
                  const pnl = Number(getPartialPL(t));
                  const value = entryVal + pnl;
                  return sum + value;;
                }, 0).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '-'}
              </div>
            </div>
            {/* Card: Total P&L */}
            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(135deg, #1A2332 60%, #3B2F1A 100%)",
              borderRadius: 16,
              padding: 28,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden'
            }}>
              <span style={{
                position: 'absolute',
                top: 18, left: 18,
                fontSize: 28,
                color: 'var(--warning-color)',
                opacity: 0.18
              }}>💹</span>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Total P&L</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: totalPnL >= 0 ? "var(--profit-color)" : "var(--loss-color)", letterSpacing: 1 }}>{totalPnL >= 0 ? '+' : ''}₹{totalPnL.toLocaleString()}</div>
            </div>

          </div>

          {/* Trading Analytics Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
            marginBottom: 20,
            alignItems: 'stretch',
            flexWrap: 'wrap'
          }}>
            {/* Equity Curve Chart */}
            {/* <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
              borderRadius: 10,
              padding: 18,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              minHeight: 220,
              maxHeight: 220,
              width: '95%',
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 15, marginBottom: 10, letterSpacing: 0.3 }}>Equity Curve</div>
              <EquityCurve trades={trades} />
            </div> */}

            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
              borderRadius: 10,
              padding: 18,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              minHeight: 320,
              // maxWidth: 400,
              maxHeight: 220,
              width: '95%',
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 15, marginBottom: 10, letterSpacing: 0.3 }}>Trading Value Over Time</div>
              <InvestmentValueChart investments={Array.isArray(trades) ? trades : []} isTrade={true} />
            </div>
            {/* Performance Chart */}
            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
              borderRadius: 10,
              padding: 18,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              minHeight: 220,
              width: '95%',
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'center'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--warning-color)', fontSize: 15, marginBottom: 10, letterSpacing: 0.3 }}>Performance by Month</div>
              <PerformanceChart trades={Array.isArray(trades) ? trades : []} />
            </div>
            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
              borderRadius: 10,
              padding: 18,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              minHeight: 220,
              width: '95%',
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              marginTop: 18
            }}>
              <div style={{ fontWeight: 700, color: 'var(--success-color)', fontSize: 15, marginBottom: 10, letterSpacing: 0.3 }}>Trades by Setup</div>
              <SetupPerformanceChart trades={Array.isArray(trades) ? trades : []} setups={Array.isArray(setups) ? setups : []} />
            </div>
            <div style={{
              background: theme === 'light' 
                ? 'var(--bg-primary)'
                : "linear-gradient(120deg, #233554 70%, #1A2332 100%)",
              borderRadius: 10,
              padding: 18,
              border: theme === 'light' 
                ? '1px solid var(--border-primary)'
                : "1px solid #2A3441",
              minHeight: 220,
              width: '95%',
              boxShadow: "var(--shadow-lg)",
              position: 'relative',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
              marginTop: 18
            }}>
              <div style={{ fontWeight: 700, color: 'var(--accent-secondary)', fontSize: 15, marginBottom: 10, letterSpacing: 0.3 }}>Timeframe Distribution</div>
              <TimeframePieChart trades={Array.isArray(trades) ? trades : []} />
            </div>
          </div>

          {/* Recent Trades Table */}
          <div style={{
            background: theme === 'light' 
              ? 'var(--bg-primary)'
              : "linear-gradient(120deg, #1A2332 80%, #233554 100%)",
            borderRadius: 16,
            padding: 28,
            border: theme === 'light' 
              ? '1px solid var(--border-primary)'
              : "1px solid #2A3441",
            marginBottom: 28,
            boxShadow: "var(--shadow-lg)",
            color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: theme === 'light' ? 'var(--text-primary)' : "#fff", margin: 0, letterSpacing: 0.5 }}>Recent Trades</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'separate', 
                borderSpacing: 0, 
                color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB', 
                fontSize: 15 
              }}>
                <thead>
                  <tr style={{ 
                    background: theme === 'light' 
                      ? 'var(--bg-tertiary)' 
                      : 'rgba(21,27,40,0.98)' 
                  }}>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-primary)', textAlign: 'left', borderTopLeftRadius: 10 }}>Ticker</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--warning-color)', textAlign: 'left' }}>EntryDate</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--success-color)', textAlign: 'left' }}>EntryPrice</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--warning-color)', textAlign: 'left' }}>Original Quantity</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'left' }}>Sold Quantity</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--accent-primary)', textAlign: 'left' }}>Avg Exit Price</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--success-color)', textAlign: 'left' }}>Invested</th>
                    <th style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--success-color)', textAlign: 'left', borderTopRightRadius: 10 }}>P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades && recentTrades.length > 0 ? recentTrades.map((trade, idx) => {
                    const pnl = calculatePnl(trade);
                    const originalQty = trade.quantity !== undefined && trade.quantity !== null ? Number(trade.quantity) : 0;
                    const remainingQty = trade.remainingQuantity !== undefined && trade.remainingQuantity !== null ? Number(trade.remainingQuantity) : originalQty;
                    const soldQty = originalQty - remainingQty;
                    
                    const evenRowBg = theme === 'light' 
                      ? 'var(--bg-primary)' 
                      : 'rgba(26,35,50,0.98)';
                    const oddRowBg = theme === 'light' 
                      ? 'var(--bg-secondary)' 
                      : 'rgba(21,27,40,0.98)';
                    const hoverBg = theme === 'light' 
                      ? 'var(--bg-tertiary)' 
                      : '#232B3B';
                    
                    return (
                      <tr key={trade.id || idx} style={{
                        borderBottom: theme === 'light' 
                          ? '1px solid var(--border-primary)' 
                          : '1px solid #232B3B',
                        background: idx % 2 === 0 ? evenRowBg : oddRowBg,
                        transition: 'background 0.2s',
                        borderRadius: 8
                      }}
                        onMouseOver={e => e.currentTarget.style.background = hoverBg}
                        onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? evenRowBg : oddRowBg}
                      >
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{trade.ticker}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700 }}>{trade.entryDate ? formatDate(trade.entryDate) : "-"}</td>
                        <td style={{ padding: '12px 14px', }}>₹{trade.entryPrice?.toFixed(2).toLocaleString() ?? '-'}</td>
                        <td style={{ padding: '12px 14px', }}>{trade.quantity}</td>
                        <td style={{ padding: '12px 14px', }}>{soldQty}</td>
                        <td style={{ padding: '12px 14px', }}>{soldQty > 0 ? (getAverageExitPrice(trade) !== "-" ? getAverageExitPrice(trade) : (trade.exitPrice !== undefined && trade.exitPrice !== null ? Number(trade.exitPrice).toFixed(2) : "-")) : '-'}</td>
                        <td style={{ padding: '12px 14px', }}>{getInvested(trade) !== "-" ? `$${getInvested(trade)}` : "-"}</td>
                        <td style={{ 
                          padding: '12px 14px', 
                          color: soldQty > 0 && Number(getPartialPL(trade)) > 0 ? 'var(--profit-color)' : 'var(--loss-color)', 
                          fontWeight: 800 
                        }}>
                          {soldQty > 0 && getPartialPL(trade) !== "0" ? `$${getPartialPL(trade)}` : "0"}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 28 }}>No trades found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // Investment Tab Content
        <>
          {/* Investment Loading/Error States */}
          {investmentLoading ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 40 }}>Loading investment dashboard...</div>
          ) : investmentError ? (
            <div style={{ color: 'var(--error-color)', textAlign: 'center', padding: 40 }}>Failed to load investment data.</div>
          ) : (
            <>
              {/* Investment Summary Cards */}

              {/* Enhanced Investment Summary Cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 28,
                marginBottom: 40,
                background: theme === 'light' 
                  ? 'var(--bg-secondary)'
                  : "linear-gradient(90deg, #181F2A 60%, #1A2332 100%)",
                borderRadius: 18,
                padding: 16,
                border: theme === 'light' ? '1px solid var(--border-primary)' : 'none'
              }}>
                {/* Card: Total Invested */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(135deg, #233554 60%, #1A2332 100%)",
                  borderRadius: 16,
                  padding: 28,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  textAlign: "center",
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 18, left: 18,
                    fontSize: 28,
                    color: 'var(--accent-primary)',
                    opacity: 0.18
                  }}>💰</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Total Investment</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: "var(--accent-primary)", letterSpacing: 1 }}>₹{investmentSummary?.totalInvested?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? '-'}</div>
                </div>
                {/* Card: Total Holdings */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(135deg, #1A2332 60%, #193C3A 100%)",
                  borderRadius: 16,
                  padding: 28,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  textAlign: "center",
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 18, left: 18,
                    fontSize: 28,
                    color: 'var(--success-color)',
                    opacity: 0.18
                  }}>📈</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Current Value</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: "var(--success-color)", letterSpacing: 1 }}>₹{investmentSummary?.totalHoldings?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? '-'}</div>
                </div>
                {/* Card: Unrealized P&L */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(135deg, #1A2332 60%, #3B2F1A 100%)",
                  borderRadius: 16,
                  padding: 28,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  textAlign: "center",
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 18, left: 18,
                    fontSize: 28,
                    color: 'var(--warning-color)',
                    opacity: 0.18
                  }}>💹</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Today's P&L</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: investmentSummary?.todaysPnL >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', letterSpacing: 1 }}>{investmentSummary?.todaysPnL >= 0 ? '+' : ''}₹{investmentSummary?.todaysPnL?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? '-'}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: investmentSummary?.todaysPnLPercent >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', marginTop: 10 }}>({investmentSummary?.todaysPnLPercent?.toFixed(2) ?? '-'}%)</div>
                </div>
                {/* Card: Avg Buy Price */}
                {/* Card: Unrealized P&L */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(135deg, #1A2332 60%, #3B2F1A 100%)",
                  borderRadius: 16,
                  padding: 28,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  textAlign: "center",
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 18, left: 18,
                    fontSize: 28,
                    color: 'var(--warning-color)',
                    opacity: 0.18
                  }}>💹</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10 }}>Unrealized P&L</div>
                  <div style={{ fontSize: 30, fontWeight: 800, color: investmentSummary?.unrealizedPnL >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', letterSpacing: 1 }}>{investmentSummary?.unrealizedPnL >= 0 ? '+' : ''}₹{investmentSummary?.unrealizedPnL?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? '-'}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: investmentSummary?.pnlPercent >= 0 ? 'var(--profit-color)' : 'var(--loss-color)', marginTop: 10 }}>({investmentSummary?.pnlPercent?.toFixed(2) ?? '-'}%)</div>
                </div>
                {/* Card: Avg Buy Price */}

              </div>

              {/* Investment Analytics Section (compact) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 18,
                marginBottom: 20,
                alignItems: 'stretch',
                flexWrap: 'wrap'
              }}>
                {/* Investment Value Over Time Chart */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 10,
                  padding: 18,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  minHeight: 320,
                  // maxWidth: 400,
                  maxHeight: 220,
                  width: '95%',
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-primary)', fontSize: 15, marginBottom: 10, letterSpacing: 0.3 }}>Investment Value Over Time</div>
                  <InvestmentValueChart investments={Array.isArray(investments) ? investments : []} />
                </div>
                {/* Top Holdings Bar Chart */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 10,
                  padding: 16,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  minHeight: 320,
                  // maxWidth: 320,
                  maxHeight: 180,
                  width: '95%',
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--warning-color)', fontSize: 13, marginBottom: 8, letterSpacing: 0.2 }}>Top Holdings by Value</div>
                  <TopHoldingsBarChart investments={Array.isArray(investments) ? investments : []} />
                </div>

              </div>

              {/* Deeper Analytics Section (compact) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: 18,
                marginBottom: 20,
                alignItems: 'stretch',
                flexWrap: 'wrap'
              }}>
                {/* Sector Allocation Donut Chart */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 10,
                  padding: 18,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  minHeight: 120,
                  // maxWidth: 400,
                  maxHeight: 200,
                  width: '95%',
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--success-color)', fontSize: 13, marginBottom: 10, letterSpacing: 0.3 }}>Sector Allocation</div>
                  <SectorDonutChart investments={Array.isArray(investments) ? investments : []} />
                </div>
                {/* Market Cap Pie Chart */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 10,
                  padding: 16,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1px solid #2A3441",
                  minHeight: 120,
                  // maxWidth: 320,
                  maxHeight: 200,
                  width: '90%',
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--accent-secondary)', fontSize: 13, marginBottom: 8, letterSpacing: 0.2 }}>Market Cap Allocation</div>
                  <MarketCapPieChart investments={Array.isArray(investments) ? investments : []} />
                </div>
                {/* Key Stats & CAGR (compact) */}
                <div style={{
                  background: theme === 'light' 
                    ? 'var(--bg-primary)'
                    : "radial-gradient(ellipse at 80% 0%, #233554 0%, #1A2332 100%)",
                  borderRadius: 14,
                  padding: 16,
                  border: theme === 'light' 
                    ? '1px solid var(--border-primary)'
                    : "1.5px solid #2A3441",
                  minHeight: 120,
                  // maxWidth: 320,
                  maxHeight: 200,
                  width: '90%',
                  boxShadow: "var(--shadow-lg)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', 
                  color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB',
                  transition: 'box-shadow 0.2s',
                  backdropFilter: 'blur(2px)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 28, height: 28,
                      background: 'var(--gradient-primary)',
                      borderRadius: '50%',
                      marginRight: 8,
                      boxShadow: 'var(--shadow-primary-btn)',
                      fontSize: 15,
                      color: '#fff',
                      fontWeight: 700
                    }}>📊</span>
                    <span style={{ fontWeight: 800, color: '#3B82F6', fontSize: 14, letterSpacing: 0.2 }}>Key Investment Stats</span>
                    <span title="Compound Annual Growth Rate" style={{ cursor: 'help', color: '#9CA3AF', fontSize: 12, marginLeft: 6 }}>ℹ️</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>

                    <div style={{ fontSize: 11, color: '#A1A7B3', fontWeight: 600 }}>Total Return</div>
                    <div style={{ fontSize: 13, color: '#10B981', fontWeight: 800, textAlign: 'right' }}>{(() => {
                      const arr = Array.isArray(investments) ? investments : [];
                      const invested = arr.reduce((sum, inv) => sum + (inv.avgBuyPrice || 0) * (inv.quantity || 0), 0);
                      const current = arr.reduce((sum, inv) => sum + (inv.currentPrice || 0) * (inv.quantity || 0), 0);
                      if (!invested) return '-';
                      const ret = ((current - invested) / invested) * 100;
                      return `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
                    })()}</div>
                    <div style={{ fontSize: 11, color: '#A1A7B3', fontWeight: 600 }}>CAGR</div>
                    <div style={{ fontSize: 13, color: '#F59E0B', fontWeight: 800, textAlign: 'right' }}>{(() => {
                      const arr = Array.isArray(investments) ? investments : [];
                      if (!arr.length) return '-';
                      const invested = arr.reduce((sum, inv) => sum + (inv.avgBuyPrice || 0) * (inv.quantity || 0), 0);
                      const current = arr.reduce((sum, inv) => sum + (inv.currentPrice || 0) * (inv.quantity || 0), 0);
                      if (!invested) return '-';
                      // Use earliest createdAt as start date
                      const dates = arr.map(inv => inv.createdAt ? new Date(inv.createdAt) : null).filter(Boolean);
                      if (!dates.length) return '-';
                      const start = new Date(Math.min(...dates.map(d => d.getTime())));
                      const now = new Date();
                      const years = (now - start) / (365.25 * 24 * 3600 * 1000);
                      if (years <= 0) return '-';
                      const cagr = Math.pow(current / invested, 1 / years) - 1;
                      return `${(cagr * 100).toFixed(2)}%`;
                    })()}</div>
                    <div style={{ fontSize: 11, color: '#A1A7B3', fontWeight: 600 }}>Most Invested Sector</div>
                    <div style={{ fontSize: 13, color: '#60A5FA', fontWeight: 800, textAlign: 'right' }}>{(() => {
                      const arr = Array.isArray(investments) ? investments : [];
                      const sectorMap = {};
                      arr.forEach(inv => {
                        const sector = inv.sector || 'Other';
                        const value = (inv.currentPrice || 0) * (inv.quantity || 0);
                        sectorMap[sector] = (sectorMap[sector] || 0) + value;
                      });
                      const sorted = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
                      return sorted.length ? `${sorted[0][0]} (₹${sorted[0][1].toLocaleString()})` : '-';
                    })()}</div>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 8,
                    gap: 6
                  }}>
                    <div style={{
                      background: theme === 'light' 
                        ? 'linear-gradient(135deg, #F0FDF4 60%, #DCFCE7 100%)'
                        : 'linear-gradient(135deg, #1A2332 60%, #193C3A 100%)',
                      borderRadius: 8,
                      padding: '6px 8px',
                      flex: 1,
                      color: '#10B981',
                      fontWeight: 700,
                      fontSize: 11,
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      boxShadow: '0 1px 4px 0 rgba(16,185,129,0.08)'
                    }}>
                      <span style={{ 
                        color: theme === 'light' ? '#6B7280' : '#A1A7B3', 
                        fontWeight: 600, 
                        fontSize: 10, 
                        marginBottom: 1 
                      }}>Best Performer</span>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{(() => {
                        const arr = Array.isArray(investments) ? investments : [];
                        if (!arr.length) return '-';
                        const best = [...arr].sort((a, b) => ((b.currentPrice - b.avgBuyPrice) * b.quantity) - ((a.currentPrice - a.avgBuyPrice) * a.quantity))[0];
                        if (!best) return '-';
                        const pnl = (best.currentPrice - best.avgBuyPrice) * best.quantity;
                        return `${best.ticker} (${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString()})`;
                      })()}</span>
                    </div>
                    <div style={{
                      background: theme === 'light' 
                        ? 'linear-gradient(135deg, #FEF2F2 60%, #FEE2E2 100%)'
                        : 'linear-gradient(135deg, #1A2332 60%, #3B2F1A 100%)',
                      borderRadius: 8,
                      padding: '6px 8px',
                      flex: 1,
                      color: '#EF4444',
                      fontWeight: 700,
                      fontSize: 11,
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      boxShadow: '0 1px 4px 0 rgba(245,158,11,0.08)'
                    }}>
                      <span style={{ 
                        color: theme === 'light' ? '#6B7280' : '#A1A7B3', 
                        fontWeight: 600, 
                        fontSize: 10, 
                        marginBottom: 1 
                      }}>Worst Performer</span>
                      <span style={{ fontSize: 12, fontWeight: 800 }}>{(() => {
                        const arr = Array.isArray(investments) ? investments : [];
                        if (!arr.length) return '-';
                        const worst = [...arr].sort((a, b) => ((a.currentPrice - a.avgBuyPrice) * a.quantity) - ((b.currentPrice - b.avgBuyPrice) * b.quantity))[0];
                        if (!worst) return '-';
                        const pnl = (worst.currentPrice - worst.avgBuyPrice) * worst.quantity;
                        return `${worst.ticker} (${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString()})`;
                      })()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Gainers*/}
              <div style={{
                background: theme === 'light' 
                  ? 'var(--bg-secondary)' 
                  : "linear-gradient(120deg, #1A2332 80%, #233554 100%)",
                borderRadius: 16,
                padding: 28,
                border: theme === 'light' 
                  ? "1px solid var(--border-color)" 
                  : "1px solid #2A3441",
                marginBottom: 28,
                boxShadow: theme === 'light' 
                  ? "var(--shadow-card)" 
                  : "0 2px 16px 0 rgba(59,130,246,0.06)",
                color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h3 style={{ 
                    fontSize: 20, 
                    fontWeight: 700, 
                    color: theme === 'light' ? 'var(--text-primary)' : "#fff", 
                    margin: 0, 
                    letterSpacing: 0.5 
                  }}>Top Gainers <span title="% return = (Current - Buy)/Buy" style={{ cursor: 'help', color: '#9CA3AF', fontSize: 16, marginLeft: 6 }}>ℹ️</span></h3>
                  <button
                    style={{
                      background: 'linear-gradient(90deg, #3B82F6 60%, #6366F1 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 18px',
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px 0 rgba(59,130,246,0.10)',
                      transition: 'background 0.2s',
                      marginLeft: 12
                    }}
                    onClick={() => navigate('/investments')}
                  >View More</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: '#E5E7EB', fontSize: 15 }}>
                    <thead>
                      <tr style={{ 
                        background: theme === 'light' 
                          ? 'var(--bg-tertiary)' 
                          : 'rgba(21,27,40,0.98)' 
                      }}>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#2563EB' : '#60A5FA', 
                          textAlign: 'left', 
                          borderTopLeftRadius: 10 
                        }}>Ticker</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#059669' : '#A7F3D0', 
                          textAlign: 'left' 
                        }}>Sector</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#D97706' : '#F59E0B', 
                          textAlign: 'right' 
                        }}>% Return</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB', 
                          textAlign: 'right' 
                        }}>Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const arr = Array.isArray(investments) ? investments : [];
                        if (!arr.length) return <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>No data</td></tr>;
                        const sorted = [...arr]
                          .map(inv => {
                            const ret = inv.avgBuyPrice ? ((inv.currentPrice - inv.avgBuyPrice) / inv.avgBuyPrice) * 100 : 0;
                            const pnl = (inv.currentPrice - inv.avgBuyPrice) * inv.quantity;
                            return { ...inv, ret, pnl };
                          })
                          .sort((a, b) => b.ret - a.ret);
                        const top = sorted.slice(0, 3);
                        return [
                          ...top.map((inv, idx) => (
                            <tr key={inv.id || `gainer-${idx}`} style={{ 
                              background: theme === 'light' ? 'var(--bg-tertiary)' : '#182032' 
                            }}>
                              <td style={{ 
                                padding: '12px 14px', 
                                fontWeight: 700, 
                                color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB' 
                              }}>{inv.ticker}</td>
                              <td style={{ 
                                padding: '12px 14px', 
                                color: theme === 'light' ? 'var(--text-secondary)' : '#9CA3AF' 
                              }}>{inv.sector || '-'}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', color: inv.ret >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>{inv.ret >= 0 ? '+' : ''}{inv.ret.toFixed(2)}%</td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', color: inv.pnl >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>{inv.pnl >= 0 ? '+' : ''}₹{isNaN(inv.pnl) ? '-' : inv.pnl.toLocaleString()}</td>
                            </tr>
                          )),
                          <tr key="sep"><td colSpan={4} style={{ height: 8 }}></td></tr>,
                        ];
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Gainers/Losers Table */}
              <div style={{
                background: theme === 'light' 
                  ? 'var(--bg-secondary)' 
                  : "linear-gradient(120deg, #1A2332 80%, #233554 100%)",
                borderRadius: 16,
                padding: 28,
                border: theme === 'light' 
                  ? "1px solid var(--border-color)" 
                  : "1px solid #2A3441",
                marginBottom: 28,
                boxShadow: theme === 'light' 
                  ? "var(--shadow-card)" 
                  : "0 2px 16px 0 rgba(59,130,246,0.06)",
                color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h3 style={{ 
                    fontSize: 20, 
                    fontWeight: 700, 
                    color: theme === 'light' ? 'var(--text-primary)' : "#fff", 
                    margin: 0, 
                    letterSpacing: 0.5 
                  }}>Top Losers <span title="% return = (Current - Buy)/Buy" style={{ cursor: 'help', color: '#9CA3AF', fontSize: 16, marginLeft: 6 }}>ℹ️</span></h3>
                  <button
                    style={{
                      background: 'linear-gradient(90deg, #3B82F6 60%, #6366F1 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 18px',
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px 0 rgba(59,130,246,0.10)',
                      transition: 'background 0.2s',
                      marginLeft: 12
                    }}
                    onClick={() => navigate('/investments')}
                  >View More</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, color: '#E5E7EB', fontSize: 15 }}>
                    <thead>
                      <tr style={{ 
                        background: theme === 'light' 
                          ? 'var(--bg-tertiary)' 
                          : 'rgba(21,27,40,0.98)' 
                      }}>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#2563EB' : '#60A5FA', 
                          textAlign: 'left', 
                          borderTopLeftRadius: 10 
                        }}>Ticker</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#059669' : '#A7F3D0', 
                          textAlign: 'left' 
                        }}>Sector</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#D97706' : '#F59E0B', 
                          textAlign: 'right' 
                        }}>% Return</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB', 
                          textAlign: 'right' 
                        }}>Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const arr = Array.isArray(investments) ? investments : [];
                        if (!arr.length) return <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>No data</td></tr>;
                        const sorted = [...arr]
                          .map(inv => {
                            const ret = inv.avgBuyPrice ? ((inv.currentPrice - inv.avgBuyPrice) / inv.avgBuyPrice) * 100 : 0;
                            const pnl = (inv.currentPrice - inv.avgBuyPrice) * inv.quantity;
                            return { ...inv, ret, pnl };
                          })
                          .sort((a, b) => b.ret - a.ret);
                        sorted.filter(inv => inv.ret < 0);
                        if (sorted.length < 3) return <tr><td colSpan={4} style={{ textAlign: 'center', color: '#9CA3AF', padding: 24 }}>Not enough data</td></tr>;
                        const bottom = sorted.slice(-3).reverse();
                        return [
                          <tr key="sep"><td colSpan={4} style={{ height: 8 }}></td></tr>,
                          ...bottom.map((inv, idx) => (
                            <tr key={inv.id || `loser-${idx}`} style={{ 
                              background: theme === 'light' ? 'var(--bg-tertiary)' : '#2A1A1A' 
                            }}>
                              <td style={{ 
                                padding: '12px 14px', 
                                fontWeight: 700, 
                                color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB' 
                              }}>{inv.ticker}</td>
                              <td style={{ 
                                padding: '12px 14px', 
                                color: theme === 'light' ? 'var(--text-secondary)' : '#9CA3AF' 
                              }}>{inv.sector || '-'}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', color: inv.ret >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>{inv.ret >= 0 ? '+' : ''}{inv.ret.toFixed(2)}%</td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', color: inv.pnl >= 0 ? '#10B981' : '#EF4444', fontWeight: 700 }}>{inv.pnl >= 0 ? '+' : ''}₹{isNaN(inv.pnl) ? '-' : inv.pnl.toLocaleString()}</td>
                            </tr>
                          ))
                        ];
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Investments Table - Enhanced */}
              <div style={{
                background: theme === 'light' 
                  ? 'var(--bg-secondary)' 
                  : "linear-gradient(120deg, #1A2332 80%, #233554 100%)",
                borderRadius: 16,
                padding: 28,
                border: theme === 'light' 
                  ? "1px solid var(--border-color)" 
                  : "1px solid #2A3441",
                marginBottom: 28,
                boxShadow: theme === 'light' 
                  ? "var(--shadow-card)" 
                  : "0 2px 16px 0 rgba(59,130,246,0.06)",
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h3 style={{ 
                    fontSize: 20, 
                    fontWeight: 700, 
                    color: theme === 'light' ? 'var(--text-primary)' : "#fff", 
                    margin: 0, 
                    letterSpacing: 0.5 
                  }}>Recent Investments</h3>
                  <button
                    style={{
                      background: 'linear-gradient(90deg, #3B82F6 60%, #6366F1 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 18px',
                      fontWeight: 700,
                      fontSize: 15,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px 0 rgba(59,130,246,0.10)',
                      transition: 'background 0.2s',
                      marginLeft: 12
                    }}
                    onClick={() => navigate('/investments')}
                  >View More</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'separate', 
                    borderSpacing: 0, 
                    color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB', 
                    fontSize: 15 
                  }}>
                    <thead>
                      <tr style={{ 
                        background: theme === 'light' 
                          ? 'var(--bg-tertiary)' 
                          : 'rgba(21,27,40,0.98)' 
                      }}>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#2563EB' : '#60A5FA', 
                          textAlign: 'left', 
                          borderTopLeftRadius: 10 
                        }}>Ticker</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#D97706' : '#F59E0B', 
                          textAlign: 'right' 
                        }}>Quantity</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB', 
                          textAlign: 'right' 
                        }}>Avg Buy Price</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB', 
                          textAlign: 'right' 
                        }}>Current Price</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#059669' : '#A7F3D0', 
                          textAlign: 'right' 
                        }}>Today's P&L</th>
                        <th style={{ 
                          padding: '12px 14px', 
                          fontWeight: 700, 
                          color: theme === 'light' ? '#D97706' : '#F59E0B', 
                          textAlign: 'right', 
                          borderTopRightRadius: 10 
                        }}>Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments && investments.length > 0 ? investments.slice().sort((a, b) => b.entryDate - a.entryDate).slice(0, 5).map((inv, idx) => {
                        const pnl = (inv.currentPrice - inv.avgBuyPrice) * inv.quantity;
                        const currentValue = inv.currentPrice * inv.quantity;
                        const lastDayValue = inv.lastDayPrice * inv.quantity;
                        
                        const todaysPnL = currentValue - lastDayValue;
                        return (
                          <tr key={inv.id || idx} style={{
                            borderBottom: theme === 'light' 
                              ? '1px solid var(--border-color)' 
                              : '1px solid #232B3B',
                            background: theme === 'light' 
                              ? (idx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-tertiary)')
                              : (idx % 2 === 0 ? 'rgba(26,35,50,0.98)' : 'rgba(21,27,40,0.98)'),
                            transition: 'background 0.2s',
                            borderRadius: 8
                          }}
                            onMouseOver={e => e.currentTarget.style.background = theme === 'light' ? 'var(--bg-tertiary)' : '#232B3B'}
                            onMouseOut={e => e.currentTarget.style.background = theme === 'light' 
                              ? (idx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-tertiary)')
                              : (idx % 2 === 0 ? 'rgba(26,35,50,0.98)' : 'rgba(21,27,40,0.98)')
                            }
                          >
                            <td style={{ 
                              padding: '12px 14px', 
                              fontWeight: 700, 
                              color: theme === 'light' ? 'var(--text-primary)' : '#E5E7EB' 
                            }}>{inv.ticker}</td>
                            <td style={{ 
                              padding: '12px 14px', 
                              textAlign: 'right', 
                              color: theme === 'light' ? 'var(--text-secondary)' : '#9CA3AF' 
                            }}>{inv.quantity}</td>
                            <td style={{ 
                              padding: '12px 14px', 
                              textAlign: 'right', 
                              color: theme === 'light' ? 'var(--text-secondary)' : '#9CA3AF' 
                            }}>₹{inv.avgBuyPrice?.toLocaleString() ?? '-'}</td>
                            <td style={{ 
                              padding: '12px 14px', 
                              textAlign: 'right', 
                              color: theme === 'light' ? 'var(--text-secondary)' : '#9CA3AF' 
                            }}>₹{inv.currentPrice?.toLocaleString() ?? '-'}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: todaysPnL >= 0 ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                              {todaysPnL >= 0 ? '+' : ''}₹{isNaN(todaysPnL) ? '-' : todaysPnL.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: pnl >= 0 ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                              {pnl >= 0 ? '+' : ''}₹{isNaN(pnl) ? '-' : pnl.toLocaleString()}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={6} style={{ 
                          textAlign: 'center', 
                          color: theme === 'light' ? 'var(--text-muted)' : '#9CA3AF', 
                          padding: 28 
                        }}>No investments found</td></tr>
                      )}
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

function calculatePnl(trade) {
  if (
    trade.entryPrice == null ||
    trade.exitPrice == null ||
    trade.quantity == null ||
    !trade.direction
  ) return 0;
  const priceDiff =
    trade.direction.toLowerCase() === 'long'
      ? trade.exitPrice - trade.entryPrice
      : trade.entryPrice - trade.exitPrice;
  return priceDiff * trade.quantity;
}

// function formatYAxisTick(value) { // Reserved for future chart implementation
//   if (value >= 1000 || value <= -1000) return (value / 1000) + 'K';
//   return value;
// }

export default Dashboard;


