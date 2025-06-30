// src/components/TradeStats.jsx
import React from 'react';
import styles from './TradeStats.module.css';

const TradeStats = ({ trades }) => {
  const winCount = trades.filter(t => t.result === 'win').length;
  const total = trades.length || 1;
  const winRate = ((winCount / total) * 100).toFixed(1);

  const avgR = (
    trades.reduce((sum, t) => sum + (t.r_multiple || 0), 0) / total
  ).toFixed(2);

  return (
    <div className={styles.statsContainer}>
      <div className={styles.card}>
        <h3>Win %</h3>
        <p>{winRate}%</p>
      </div>
      <div className={styles.card}>
        <h3>Avg R</h3>
        <p>{avgR}</p>
      </div>
      <div className={styles.card}>
        <h3>Total Trades</h3>
        <p>{trades.length}</p>
      </div>
    </div>
  );
};

export default TradeStats;