import React, { useEffect, useState } from "react";
import { getAllTrades } from '../api/tradeApi';
import { getDashboardSummary } from '../api/dashboardApi';
import EquityCurve from '../components/EquityCurve';
import PerformanceChart from '../components/PerformanceChart';
import DonutChart from '../components/DonutChart';
import PageHeader from '../components/PageHeader';
import styles from './Dashboard.module.css';
import { getAllTags } from "../api/tagApi";

const Dashboard = () => {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    getDashboardSummary()
      .then(res => setStats(res.data))
      .catch(err => {
        console.error('Fetch error:', err);
        setStats(null);
      });

    getAllTrades()
      .then(res => setTrades(res.data))
      .catch(err => {
        console.error('Fetch trades error:', err);
        setTrades([]);
      });

    getAllTags()
      .then(res => setTags(res.data))
      .catch(err => {
        console.error('Fetch tags error:', err);
        setTags([]);
      });
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

  const pnlBuckets = [
    { label: '< -10K', min: -Infinity, max: -10000 },
    { label: '-10K', min: -10000, max: -5000 },
    { label: '-5K', min: -5000, max: -1000 },
    { label: '-1K', min: -1000, max: 0 },
    { label: '0', min: 0, max: 1000 },
    { label: '1K', min: 1000, max: 5000 },
    { label: '5K', min: 5000, max: 10000 },
    { label: '> 10K', min: 10000, max: Infinity }
  ];
  const perfData = pnlBuckets.map(bucket => {
    const count = trades.filter(t => {
      const pnl = calculatePnl(t);
      return pnl > bucket.min && pnl <= bucket.max;
    }).length;
    // Invert count for negative buckets
    return {
      label: bucket.label,
      count: bucket.max <= 0 ? -count : count
    };
  });

  // --- Recent Trades ---
  const recentTrades = trades
    .slice()
    .sort((a, b) => new Date(b.exit_date) - new Date(a.exit_date))
    .slice(0, 6);

  // --- Monthly PnL ---
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function getMonthKey(dateStr) {
    const date = new Date(dateStr);
    return MONTHS[date.getMonth()];
  }

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
  if (!stats) return <div>Loading...</div>;

  console.log("tags", tags);
  console.log("trades", trades);
  console.log("tagIdToName", tagIdToName);
  console.log("tagData", tagData);

  return (
    <div className={styles.dashboardContainer}>
      <PageHeader 
        title="Trading Dashboard"
        subtitle="Track your trading performance and analytics"
      />

      {/* Stats Cards */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginBottom: 32
      }}>
        {/* First Row - Financial Overview */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20
        }}>
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #2A3441",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8
            }}>
              Total Equity
            </div>
            <div style={{
              fontSize: "32px",
              fontWeight: "700",
              color: totalEquity >= 100000 ? "#10B981" : "#EF4444"
            }}>
              ${totalEquity.toLocaleString()}
            </div>
          </div>
          
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #2A3441",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8
            }}>
              Total P&L
            </div>
            <div style={{
              fontSize: "32px",
              fontWeight: "700",
              color: totalPnL >= 0 ? "#10B981" : "#EF4444"
            }}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Second Row - Performance Metrics */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 20
        }}>
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #2A3441",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8
            }}>
              Win Rate
            </div>
            <div style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#10B981"
            }}>
              {stats.winRate}%
            </div>
          </div>
          
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #2A3441",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8
            }}>
              Total Trades
            </div>
            <div style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#E5E7EB"
            }}>
              {stats.totalTrades || trades.length}
            </div>
          </div>
          
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #2A3441",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8
            }}>
              Profit Factor
            </div>
            <div style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#F59E0B"
            }}>
              {stats.profitFactor || "N/A"}
            </div>
          </div>
          
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #2A3441",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8
            }}>
              Avg Win
            </div>
            <div style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#10B981"
            }}>
              ${avgWin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          
          <div style={{
            backgroundColor: "#1A2332",
            borderRadius: 12,
            padding: 24,
            border: "1px solid #2A3441",
            textAlign: "center"
          }}>
            <div style={{
              fontSize: "14px",
              fontWeight: "500",
              color: "#9CA3AF",
              marginBottom: 8
            }}>
              Avg Loss
            </div>
            <div style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#EF4444"
            }}>
              ${avgLoss.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>
      </div>

      {/* Chart Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: 24,
        marginBottom: 24
      }}>
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #2A3441"
        }}>
          <h3 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#fff",
            margin: "0 0 20px 0"
          }}>
            Equity Curve
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <EquityCurve trades={tradesLast6Months} />
          </div>
        </div>
        
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #2A3441"
        }}>
          <h3 style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#fff",
            margin: "0 0 20px 0"
          }}>
            Monthly Performance
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <PerformanceChart data={monthlyPnlData} />
          </div>
        </div>
      </div>

      {/* Donut Charts Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
        gap: 24,
        marginBottom: 24
      }}>
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #2A3441"
        }}>
          <div style={{ width: '100%', height: 320 }}>
            <DonutChart data={setupData} title="Setup Breakdown" />
          </div>
        </div>
        
        <div style={{
          backgroundColor: "#1A2332",
          borderRadius: 12,
          padding: 24,
          border: "1px solid #2A3441"
        }}>
          <div style={{ width: '100%', height: 320 }}>
            <DonutChart data={tagData} title="Tag Distribution" />
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div style={{
        backgroundColor: "#1A2332",
        borderRadius: 12,
        padding: 24,
        border: "1px solid #2A3441",
        marginBottom: 24
      }}>
        <h3 style={{
          fontSize: "18px",
          fontWeight: "600",
          color: "#fff",
          margin: "0 0 20px 0"
        }}>
          Recent Trades
        </h3>
        <div style={{
          display: "grid",
          gap: 12
        }}>
          {recentTrades.length > 0 ? recentTrades.map((trade, index) => {
            const pnl = calculatePnl(trade);
            return (
              <div key={trade.id || index} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                backgroundColor: "#0F1419",
                borderRadius: 8,
                border: "1px solid #2A3441"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}>
                  <div style={{
                    fontWeight: "600",
                    color: "#fff",
                    fontSize: "16px"
                  }}>
                    {trade.ticker}
                  </div>
                  <div style={{
                    fontSize: "14px",
                    color: "#9CA3AF"
                  }}>
                    {trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : 'Open'}
                  </div>
                </div>
                <div style={{
                  fontWeight: "700",
                  fontSize: "16px",
                  color: pnl >= 0 ? "#10B981" : "#EF4444"
                }}>
                  {pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            );
          }) : (
            <div style={{
              textAlign: "center",
              color: "#9CA3AF",
              fontSize: "14px",
              padding: "20px"
            }}>
              No recent trades found
            </div>
          )}
        </div>
      </div>
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

function formatYAxisTick(value) {
  if (value >= 1000 || value <= -1000) return (value / 1000) + 'K';
  return value;
}

export default Dashboard;