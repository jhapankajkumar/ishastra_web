import React, { useEffect, useState } from "react";
import { getAllTrades } from '../api/tradeApi';
import { getDashboardSummary } from '../api/dashboardApi';
import EquityCurve from '../components/EquityCurve';
import PerformanceChart from '../components/PerformanceChart';
import DonutChart from '../components/DonutChart';
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
      <div className={styles.statsCard}>
        <div className={styles.statsRow}>
          <div>
            <div className={styles.statLabel}>Win Rate</div>
            <div className={styles.statValue}>{stats.winRate}%</div>
          </div>
          <div>
            <div className={styles.statLabel}>Avg R</div>
            <div className={styles.statValue}>{stats.avgR}</div>
          </div>
          <div>
            <div className={styles.statLabel}>Total Trades</div>
            <div className={styles.statValue}>{stats.totalTrades}</div>
          </div>
          <div>
            <div className={styles.statLabel}>Profit Factor</div>
            <div className={styles.statValue}>{stats.profitFactor}</div>
          </div>
          <div>
            <div className={styles.statLabel}>Expectancy</div>
            <div className={styles.statValue}>{stats.expectancy}R</div>
          </div>
          <div>
            <div className={styles.statLabel}>
              Avg Hold
            </div>
            <div className={styles.statValue}>{stats.avgHoldTime}</div>
          </div>
        </div>
      </div>

      <div className={styles.topGrid}>
        <div className={styles.card}>
          <h3>Equity Curve</h3>
          <div style={{ width: '100%', height: 250 }}>
            <EquityCurve trades={tradesLast6Months} />
          </div>
        </div>
        <div className={styles.card}>
          <h3>Performance Chart</h3>
          <div style={{ width: '100%', height: 250 }}>
            <PerformanceChart data={monthlyPnlData} />
          </div>
        </div>
      </div>

      <div className={styles.bottomGrid}>
        <div className={styles.card}>
          <div style={{ width: '100%', height: 320 }}>
            <DonutChart data={setupData} title="Setup Breakdown" />
          </div>
        </div>
        <div className={styles.card}>
          <div style={{ width: '100%', height: 320 }}>
            <DonutChart data={tagData} title="Tag Distribution" />
          </div>
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