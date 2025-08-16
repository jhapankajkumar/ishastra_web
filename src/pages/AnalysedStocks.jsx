import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TickerAnalysis.module.css';
import { stringify } from 'postcss';

const RECENT_KEY = 'recentAnalysedStocks';

const AnalysedStocks = () => {
  const [recent, setRecent] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_KEY);
    if (stored) {
      setRecent(JSON.parse(stored));
      const list = JSON.parse(stored);

      console.log('Recent stocks loaded:',list );
    }
    console.log('Recent stocks loaded:', stored ? JSON.parse(stored) : 'No recent stocks found');
  }, []);

  const handleClick = (item) => {
    navigate(`/analysis?ticker=${item.symbol}`);
  };

  return (
    <div className={styles.container}>
      <h1>Recently Analysed Stocks</h1>
      {recent.length === 0 ? (
        <p>No stocks analysed yet.</p>
      ) : (
        <ul className={styles.recentList}>
          {recent.map((item, idx) => (
            <li key={idx} className={styles.recentItem} onClick={() => handleClick(item)}>
              <div className={styles.ticker}>{item.symbol}</div>
              <div className={styles.price}>Last Price: ${item.currentPrice}</div>
              <div className={styles.date}>Analysed: {item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnalysedStocks;
