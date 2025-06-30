import React, { useEffect, useState } from "react";
import { getAllTrades } from '../api/tradeApi';
import { getDashboardSummary } from '../api/dashboardApi';
import EquityCurve from '../components/EquityCurve';
import styles from './Dashboard.module.css';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

const COLORS = ['#4f8cff', '#00c9a7', '#ffb347', '#ff5e57', '#a259ff'];

const Dashboard = () => {
  const [trades, setTrades] = useState([]);
  const [stats, setStats] = useState(null);

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
  }, []);

  if (!stats) return <div>Loading...</div>;

  // --- Real Setup Breakdown ---
  const setupCounts = trades.reduce((acc, trade) => {
    const setup = trade.setup || 'Other';
    acc[setup] = (acc[setup] || 0) + 1;
    return acc;
  }, {});
  const setupData = Object.entries(setupCounts).map(([label, value]) => ({ label, value }));

  // --- Real Tag Distribution ---
  const tagCounts = trades.reduce((acc, trade) => {
    if (trade.tags && Array.isArray(trade.tags)) {
      trade.tags.forEach(tag => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
    }
    return acc;
  }, {});
  const tagData = Object.entries(tagCounts).map(([label, value]) => ({ label, value }));

  // --- Performance Chart Data (R-multiple distribution) ---
  const rBuckets = [
    { label: '< -3R', min: -Infinity, max: -3 },
    { label: '-3R', min: -3, max: -2 },
    { label: '-2R', min: -2, max: -1 },
    { label: '-1R', min: -1, max: 0 },
    { label: '0R', min: 0, max: 1 },
    { label: '1R', min: 1, max: 2 },
    { label: '2R', min: 2, max: 3 },
    { label: '> 3R', min: 3, max: Infinity }
  ];
  const perfData = rBuckets.map(bucket => ({
    label: bucket.label,
    count: trades.filter(t => t.r_multiple !== undefined && t.r_multiple > bucket.min && t.r_multiple <= bucket.max).length
  }));

  // --- Recent Trades ---
  const recentTrades = trades
    .slice()
    .sort((a, b) => new Date(b.exit_date) - new Date(a.exit_date))
    .slice(0, 6);

  return (
    <div className={styles.dashboardContainer}>
      <h1 className={styles.heading}>Trade Dashboard</h1>
      <div className={styles.statsRow}>
        <div className={styles.statCard}>Win Rate<br /><span>{stats.winRate}%</span></div>
        <div className={styles.statCard}>Avg R<br /><span>{stats.avgR}</span></div>
        <div className={styles.statCard}>Total Trades<br /><span>{stats.totalTrades}</span></div>
        <div className={styles.statCard}>Profit Factor<br /><span>{stats.profitFactor}</span></div>
        <div className={styles.statCard}>Expectancy<br /><span>{stats.expectancy}R</span></div>
        <div className={styles.statCard}>Avg Hold Time<br /><span>{stats.avgHoldTime}</span></div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <h3>Equity Curve</h3>
          <EquityCurve trades={trades} />
        </div>
        <div className={styles.card}>
          <h3>Performance Chart</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={perfData}>
              <XAxis dataKey="label" stroke="#fff" />
              <YAxis stroke="#fff" />
              <Tooltip />
              <Bar dataKey="count" fill="#4f8cff" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.breakdownRow}>
        <div className={styles.card}>
          <h3>Setup Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={setupData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {setupData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.card}>
          <h3>Tag Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={tagData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {tagData.map((entry, idx) => (
                  <Cell key={`cell-tag-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className={styles.card}>
          <h3>Recent Trades</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Setup</th>
                <th>R</th>
                <th>Date</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {recentTrades.map((trade, idx) => (
                <tr key={idx}>
                  <td>{trade.ticker}</td>
                  <td>{trade.setup || '-'}</td>
                  <td>{trade.r_multiple}</td>
                  <td>{trade.exit_date ? new Date(trade.exit_date).toLocaleDateString() : '-'}</td>
                  <td>{trade.grade || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;