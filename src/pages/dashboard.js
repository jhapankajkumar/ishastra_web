import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllTrades } from '../api/tradeApi';
import { getDashboardSummary } from '../api/dashboardApi';
import { getAllInvestments, getInvestmentSummary } from '../api/investmentApi';
import EquityCurve from '../components/EquityCurve';
import PerformanceChart from '../components/PerformanceChart';
import DonutChart from '../components/DonutChart';

import PageHeader from '../components/PageHeader';
import ErrorPage from '../components/ErrorPage';
import InvestmentValueChart from '../components/InvestmentValueChart';
import SectorDonutChart from '../components/SectorDonutChart';
import TopHoldingsBarChart from '../components/TopHoldingsBarChart';
import MarketCapPieChart from '../components/MarketCapPieChart';
// import { useNotification } from '../components/NotificationProvider'; // Reserved for future use
import styles from './Dashboard.module.css';
import { getAllTags } from "../api/tagApi";

const Dashboard = () => {
  const navigate = useNavigate();
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [tags, setTags] = useState([]);
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
    Promise.all([getInvestmentSummary(), getAllInvestments()])
      .then(([summaryResponse, listResponse]) => {
        let summary = summaryResponse?.data || {};
        let list = listResponse.data || [];
        // Calculate values from investments if not present in summary
        let totalInvested = 0;
        let totalHoldings = 0;
        let unrealizedPnL = 0;
        let avgBuyPrice = 0;
        if (Array.isArray(list) && list.length > 0) {
          totalInvested = list.reduce((sum, inv) => sum + ((inv.avgBuyPrice || 0) * (inv.quantity || 0)), 0);
          totalHoldings = list.reduce((sum, inv) => sum + ((inv.currentPrice || 0) * (inv.quantity || 0)), 0);
          unrealizedPnL = list.reduce((sum, inv) => sum + ((inv.currentPrice - inv.avgBuyPrice) * (inv.quantity || 0)), 0);
          avgBuyPrice = totalInvested && list.length ? totalInvested / list.reduce((sum, inv) => sum + (inv.quantity || 0), 0) : 0;
        }

        let mappedSummary = {
          totalInvested,
          totalHoldings,
          unrealizedPnL,
          avgBuyPrice,
        };

        setInvestmentSummary(mappedSummary);
        // Debug log for investment summary
        // eslint-disable-next-line no-console
        // console.log('[Dashboard] investment summary loaded:', mappedSummary);
        setInvestments(list);
        console.log('Investments:', list);
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
        const [dashboardRes, tradesRes, tagsRes] = await Promise.allSettled([
          getDashboardSummary(),
          getAllTrades(),
          getAllTags()
        ]);

        if (dashboardRes.status === 'fulfilled') {
          setStats(dashboardRes.value.data);
        } else {
          console.error('Dashboard summary error:', dashboardRes.reason);
          if (dashboardRes.reason?.type === 'NETWORK_ERROR') {
            hasNetworkError = true;
          }
        }

        if (tradesRes.status === 'fulfilled') {
          setTrades(tradesRes.value.data);
        } else {
          console.error('Trades error:', tradesRes.reason);
          if (tradesRes.reason?.type === 'NETWORK_ERROR') {
            hasNetworkError = true;
          }
        }

        if (tagsRes.status === 'fulfilled') {
          setTags(tagsRes.value || []);
        } else {
          console.error('Tags error:', tagsRes.reason);
          if (tagsRes.reason?.type === 'NETWORK_ERROR') {
            hasNetworkError = true;
          }
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
    return trades.reduce((total, trade) => total + calculatePnl(trade), 0);
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
    .sort((a, b) => new Date(b.exit_date) - new Date(a.exit_date))
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
    if (!trade.exit_date) return;
    const date = new Date(trade.exit_date);
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
    if (!trade.exit_date) return false;
    const date = new Date(trade.exit_date);
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
    padding: '12px 32px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: 18,
    border: 'none',
    borderBottom: activeTab === tab ? '3px solid #3B82F6' : '3px solid transparent',
    background: 'none',
    color: activeTab === tab ? '#3B82F6' : '#9CA3AF',
    outline: 'none',
    transition: 'border 0.2s, color 0.2s'
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
        <PageHeader 
          title="Dashboard"
          subtitle="Track your trading and investment analytics"
        />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '200px',
          color: '#9CA3AF'
        }}>
          Loading dashboard...
        </div>
      </div>
    );
  }


  return (
    <div className={styles.dashboardContainer}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #2A3441', marginBottom: 32 }}>
        <button style={tabStyle('trading')} onClick={() => setActiveTab('trading')}>Trading</button>
        <button style={tabStyle('investment')} onClick={() => setActiveTab('investment')}>Investment</button>
      </div>
      {/* Tab Content */}
      {activeTab === 'trading' ? (
        <>
          {/* ...existing trading dashboard content... */}
          {/* Stats Cards */}
          // ...existing code...
        </>
      ) : (
        // Investment Tab Content
        <>
          {/* Investment Loading/Error States */}
          {investmentLoading ? (
            <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 40 }}>Loading investment dashboard...</div>
          ) : investmentError ? (
            <div style={{ color: '#EF4444', textAlign: 'center', padding: 40 }}>Failed to load investment data.</div>
          ) : (
            <>
              {/* Investment Summary Cards */}

              {/* Enhanced Investment Summary Cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 28,
                marginBottom: 40,
                background: "linear-gradient(90deg, #181F2A 60%, #1A2332 100%)",
                borderRadius: 18,
                padding: 16
              }}>
                {/* Card: Total Invested */}
                <div style={{
                  background: "linear-gradient(135deg, #233554 60%, #1A2332 100%)",
                  borderRadius: 16,
                  padding: 28,
                  border: "1px solid #2A3441",
                  textAlign: "center",
                  boxShadow: "0 4px 24px 0 rgba(59,130,246,0.08)",
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 18, left: 18,
                    fontSize: 28,
                    color: '#3B82F6',
                    opacity: 0.18
                  }}>💰</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#A1A7B3", marginBottom: 10 }}>Total Invested</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#3B82F6", letterSpacing: 1 }}>₹{investmentSummary?.totalInvested?.toLocaleString() ?? '-'}</div>
                </div>
                {/* Card: Total Holdings */}
                <div style={{
                  background: "linear-gradient(135deg, #1A2332 60%, #193C3A 100%)",
                  borderRadius: 16,
                  padding: 28,
                  border: "1px solid #2A3441",
                  textAlign: "center",
                  boxShadow: "0 4px 24px 0 rgba(16,185,129,0.08)",
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 18, left: 18,
                    fontSize: 28,
                    color: '#10B981',
                    opacity: 0.18
                  }}>📈</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#A1A7B3", marginBottom: 10 }}>Total Holdings</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#10B981", letterSpacing: 1 }}>₹{investmentSummary?.totalHoldings?.toLocaleString() ?? '-'}</div>
                </div>
                {/* Card: Unrealized P&L */}
                <div style={{
                  background: "linear-gradient(135deg, #1A2332 60%, #3B2F1A 100%)",
                  borderRadius: 16,
                  padding: 28,
                  border: "1px solid #2A3441",
                  textAlign: "center",
                  boxShadow: "0 4px 24px 0 rgba(245,158,11,0.08)",
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 18, left: 18,
                    fontSize: 28,
                    color: '#F59E0B',
                    opacity: 0.18
                  }}>💹</span>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#A1A7B3", marginBottom: 10 }}>Unrealized P&L</div>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "#F59E0B", letterSpacing: 1 }}>{investmentSummary?.unrealizedPnL >= 0 ? '+' : ''}₹{investmentSummary?.unrealizedPnL?.toLocaleString() ?? '-'}</div>
                </div>
                {/* Card: Avg Buy Price */}
                
              </div>

              {/* Investment Analytics Section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 32,
                marginBottom: 36,
                alignItems: 'stretch',
                flexWrap: 'wrap'
              }}>
                {/* Investment Value Over Time Chart */}
                <div style={{
                  background: "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 16,
                  padding: 36,
                  border: "1px solid #2A3441",
                  minHeight: 260,
                  maxWidth: 600,
                  maxHeight: 350,
                  width: '90%',
                  boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: '#3B82F6', fontSize: 22, marginBottom: 18, letterSpacing: 0.5 }}>Investment Value Over Time</div>
                  <InvestmentValueChart investments={Array.isArray(investments) ? investments : []} />
                </div>
                {/* Sector Allocation Donut Chart */}
                <div style={{
                  background: "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 16,
                  padding: 36,
                  border: "1px solid #2A3441",
                  minHeight: 260,
                  maxWidth: 600,
                  maxHeight: 350,
                  width: '90%',
                  boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: '#10B981', fontSize: 22, marginBottom: 18, letterSpacing: 0.5 }}>Sector Allocation</div>
                  <SectorDonutChart investments={Array.isArray(investments) ? investments : []} />
                </div>
              </div>

              {/* Deeper Analytics Section */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                gap: 32,
                marginBottom: 36,
                alignItems: 'stretch',
                flexWrap: 'wrap'
              }}>
                {/* Top Holdings Bar Chart */}
                <div style={{
                  background: "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 16,
                  padding: 36,
                  border: "1px solid #2A3441",
                  minHeight: 220,
                  maxWidth: 600,
                  maxHeight: 350,
                  width: '90%',
                  boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: '#F59E0B', fontSize: 20, marginBottom: 18, letterSpacing: 0.5 }}>Top Holdings by Value</div>
                  <TopHoldingsBarChart investments={Array.isArray(investments) ? investments : []} />
                </div>
                {/* Market Cap Pie Chart */}
                <div style={{
                  background: "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 16,
                  padding: 36,
                  border: "1px solid #2A3441",
                  minHeight: 220,
                  maxWidth: 600,
                  maxHeight: 350,
                  width: '80%',
                  boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center'
                }}>
                  <div style={{ fontWeight: 700, color: '#6366F1', fontSize: 20, marginBottom: 18, letterSpacing: 0.5 }}>Market Cap Allocation</div>
                  <MarketCapPieChart investments={Array.isArray(investments) ? investments : []} />
                </div>
                {/* Key Stats & CAGR */}
                <div style={{
                  background: "linear-gradient(120deg, #1A2332 70%, #233554 100%)",
                  borderRadius: 16,
                  padding: 36,
                  border: "1px solid #2A3441",
                  minHeight: 220,
                  maxWidth: 600,
                  maxHeight: 350,
                  width: '80%',
                  boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', color: '#E5E7EB'
                }}>
                  <div style={{ fontWeight: 700, color: '#3B82F6', fontSize: 20, marginBottom: 18, letterSpacing: 0.5 }}>Key Investment Stats <span title="Compound Annual Growth Rate" style={{cursor:'help',color:'#9CA3AF',fontSize:16,marginLeft:6}}>ℹ️</span></div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: 16 }}>
                    <li><b>Total Investments:</b> {Array.isArray(investments) ? investments.length : 0}</li>
                    <li><b>Total Return:</b> {(() => {
                      const arr = Array.isArray(investments) ? investments : [];
                      const invested = arr.reduce((sum, inv) => sum + (inv.avgBuyPrice || 0) * (inv.quantity || 0), 0);
                      const current = arr.reduce((sum, inv) => sum + (inv.currentPrice || 0) * (inv.quantity || 0), 0);
                      if (!invested) return '-';
                      const ret = ((current - invested) / invested) * 100;
                      return `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`;
                    })()}</li>
                    <li><b>CAGR:</b> {(() => {
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
                    })()}</li>
                    <li><b>Most Invested Sector:</b> {(() => {
                      const arr = Array.isArray(investments) ? investments : [];
                      const sectorMap = {};
                      arr.forEach(inv => {
                        const sector = inv.sector || 'Other';
                        const value = (inv.currentPrice || 0) * (inv.quantity || 0);
                        sectorMap[sector] = (sectorMap[sector] || 0) + value;
                      });
                      const sorted = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);
                      return sorted.length ? `${sorted[0][0]} (₹${sorted[0][1].toLocaleString()})` : '-';
                    })()}</li>
                    <li><b>Best Performer:</b> {(() => {
                      const arr = Array.isArray(investments) ? investments : [];
                      if (!arr.length) return '-';
                      const best = [...arr].sort((a, b) => ((b.currentPrice - b.avgBuyPrice) * b.quantity) - ((a.currentPrice - a.avgBuyPrice) * a.quantity))[0];
                      if (!best) return '-';
                      const pnl = (best.currentPrice - best.avgBuyPrice) * best.quantity;
                      return `${best.ticker} (${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString()})`;
                    })()}</li>
                    <li><b>Worst Performer:</b> {(() => {
                      const arr = Array.isArray(investments) ? investments : [];
                      if (!arr.length) return '-';
                      const worst = [...arr].sort((a, b) => ((a.currentPrice - a.avgBuyPrice) * a.quantity) - ((b.currentPrice - b.avgBuyPrice) * b.quantity))[0];
                      if (!worst) return '-';
                      const pnl = (worst.currentPrice - worst.avgBuyPrice) * worst.quantity;
                      return `${worst.ticker} (${pnl >= 0 ? '+' : ''}₹${pnl.toLocaleString()})`;
                    })()}</li>
                  </ul>
                </div>
              </div>

              {/* Top Gainers*/}
              <div style={{
                background: "linear-gradient(120deg, #1A2332 80%, #233554 100%)",
                borderRadius: 16,
                padding: 28,
                border: "1px solid #2A3441",
                marginBottom: 28,
                boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                color: '#E5E7EB',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: 0.5 }}>Top Gainers <span title="% return = (Current - Buy)/Buy" style={{cursor:'help',color:'#9CA3AF',fontSize:16,marginLeft:6}}>ℹ️</span></h3>
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
                      <tr style={{ background: 'rgba(21,27,40,0.98)' }}>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#60A5FA', textAlign: 'left', borderTopLeftRadius: 10 }}>Ticker</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#A7F3D0', textAlign: 'left' }}>Sector</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#F59E0B', textAlign: 'right' }}>% Return</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#E5E7EB', textAlign: 'right' }}>Unrealized P&L</th>
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
                            <tr key={inv.id || `gainer-${idx}`} style={{ background: '#182032' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 700 }}>{inv.ticker}</td>
                              <td style={{ padding: '12px 14px' }}>{inv.sector || '-'}</td>
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
                background: "linear-gradient(120deg, #1A2332 80%, #233554 100%)",
                borderRadius: 16,
                padding: 28,
                border: "1px solid #2A3441",
                marginBottom: 28,
                boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                color: '#E5E7EB',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: 0.5 }}>Top Gainers & Losers <span title="% return = (Current - Buy)/Buy" style={{cursor:'help',color:'#9CA3AF',fontSize:16,marginLeft:6}}>ℹ️</span></h3>
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
                      <tr style={{ background: 'rgba(21,27,40,0.98)' }}>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#60A5FA', textAlign: 'left', borderTopLeftRadius: 10 }}>Ticker</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#A7F3D0', textAlign: 'left' }}>Sector</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#F59E0B', textAlign: 'right' }}>% Return</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#E5E7EB', textAlign: 'right' }}>Unrealized P&L</th>
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
                        const bottom = sorted.slice(-3).reverse();
                        return [
                          <tr key="sep"><td colSpan={4} style={{ height: 8 }}></td></tr>,
                          ...bottom.map((inv, idx) => (
                            <tr key={inv.id || `loser-${idx}`} style={{ background: '#2A1A1A' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 700 }}>{inv.ticker}</td>
                              <td style={{ padding: '12px 14px' }}>{inv.sector || '-'}</td>
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
                background: "linear-gradient(120deg, #1A2332 80%, #233554 100%)",
                borderRadius: 16,
                padding: 28,
                border: "1px solid #2A3441",
                marginBottom: 28,
                boxShadow: "0 2px 16px 0 rgba(59,130,246,0.06)",
                position: 'relative'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: 0.5 }}>Recent Investments</h3>
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
                      <tr style={{ background: 'rgba(21,27,40,0.98)' }}>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#60A5FA', textAlign: 'left', borderTopLeftRadius: 10 }}>Ticker</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#A7F3D0', textAlign: 'left' }}>Sector</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#F59E0B', textAlign: 'right' }}>Quantity</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#E5E7EB', textAlign: 'right' }}>Avg Buy Price</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#E5E7EB', textAlign: 'right' }}>Current Price</th>
                        <th style={{ padding: '12px 14px', fontWeight: 700, color: '#F59E0B', textAlign: 'right', borderTopRightRadius: 10 }}>Unrealized P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {investments && investments.length > 0 ?  investments.slice().sort((a, b) => b.entryDate - a.entryDate).slice(0, 5).map((inv, idx) => {
                        const pnl = (inv.currentPrice - inv.avgBuyPrice) * inv.quantity;
                        return (
                          <tr key={inv.id || idx} style={{
                            borderBottom: '1px solid #232B3B',
                            background: idx % 2 === 0 ? 'rgba(26,35,50,0.98)' : 'rgba(21,27,40,0.98)',
                            transition: 'background 0.2s',
                            borderRadius: 8
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#232B3B'}
                          onMouseOut={e => e.currentTarget.style.background = idx % 2 === 0 ? 'rgba(26,35,50,0.98)' : 'rgba(21,27,40,0.98)'}
                          >
                            <td style={{ padding: '12px 14px', fontWeight: 700 }}>{inv.ticker}</td>
                            <td style={{ padding: '12px 14px' }}>{inv.sector || '-'}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>{inv.quantity}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>₹{inv.avgBuyPrice?.toLocaleString() ?? '-'}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right' }}>₹{inv.currentPrice?.toLocaleString() ?? '-'}</td>
                            <td style={{ padding: '12px 14px', textAlign: 'right', color: pnl >= 0 ? '#10B981' : '#EF4444', fontWeight: 800 }}>
                              {pnl >= 0 ? '+' : ''}₹{isNaN(pnl) ? '-' : pnl.toLocaleString()}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: '#9CA3AF', padding: 28 }}>No investments found</td></tr>
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
    trade.entry_price == null ||
    trade.exit_price == null ||
    trade.quantity == null ||
    !trade.direction
  ) return 0;
  const priceDiff =
    trade.direction.toLowerCase() === 'long'
      ? trade.exit_price - trade.entry_price
      : trade.entry_price - trade.exit_price;
  return priceDiff * trade.quantity;
}

// function formatYAxisTick(value) { // Reserved for future chart implementation
//   if (value >= 1000 || value <= -1000) return (value / 1000) + 'K';
//   return value;
// }

export default Dashboard;