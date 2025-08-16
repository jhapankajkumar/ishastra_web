import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWatchlist } from '../api/analysisApi';
import styles from './Watchlist.module.css';

const Watchlist = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('priority'); // priority, confidence, symbol
  const navigate = useNavigate();

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWatchlist();
      // Sort by priority by default (lower number = higher priority)
      const sortedStocks = response.stocks.sort((a, b) => a.priority - b.priority);
      setStocks(sortedStocks);
    } catch (err) {
      setError(err.message || 'Failed to fetch watchlist');
      console.error('Watchlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (sortType) => {
    setSortBy(sortType);
    const sortedStocks = [...stocks].sort((a, b) => {
      switch (sortType) {
        case 'priority':
          return a.priority - b.priority;
        case 'confidence':
          return b.decisionConfidence - a.decisionConfidence;
        case 'symbol':
          return a.symbol.localeCompare(b.symbol);
        default:
          return 0;
      }
    });
    setStocks(sortedStocks);
  };

  const handleStockClick = (symbol) => {
    navigate(`/stock-detail/${symbol}`);
  };

  const getDecisionBadgeClass = (action) => {
    switch (action) {
      case 'BUY':
        return styles.badgeBuy;
      case 'WATCH':
        return styles.badgeWatch;
      case 'HOLD':
        return styles.badgeHold;
      case 'AVOID':
        return styles.badgeAvoid;
      default:
        return styles.badgeDefault;
    }
  };

  const getGradeBadgeClass = (grade) => {
    if (grade >= 'A') return styles.gradeA;
    if (grade >= 'B') return styles.gradeB;
    if (grade >= 'C') return styles.gradeC;
    return styles.gradeD;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading watchlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error Loading Watchlist</h3>
          <p>{error}</p>
          <button onClick={fetchWatchlist} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Trading Watchlist</h1>
        <p>Monitor your high-priority trading opportunities</p>
        
        <div className={styles.sortControls}>
          <label>Sort by:</label>
          <button 
            className={`${styles.sortButton} ${sortBy === 'priority' ? styles.active : ''}`}
            onClick={() => handleSort('priority')}
          >
            Priority
          </button>
          <button 
            className={`${styles.sortButton} ${sortBy === 'confidence' ? styles.active : ''}`}
            onClick={() => handleSort('confidence')}
          >
            Confidence
          </button>
          <button 
            className={`${styles.sortButton} ${sortBy === 'symbol' ? styles.active : ''}`}
            onClick={() => handleSort('symbol')}
          >
            Symbol
          </button>
        </div>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Total Stocks</span>
          <span className={styles.statValue}>{stocks.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>BUY Signals</span>
          <span className={styles.statValue}>
            {stocks.filter(s => s.decisionAction === 'BUY').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>WATCH Signals</span>
          <span className={styles.statValue}>
            {stocks.filter(s => s.decisionAction === 'WATCH').length}
          </span>
        </div>
      </div>

      <div className={styles.stockList}>
        {stocks.map((stock) => (
          <div 
            key={stock.id} 
            className={styles.stockCard}
            onClick={() => handleStockClick(stock.symbol)}
          >
            <div className={styles.stockHeader}>
              <div className={styles.stockTitle}>
                <h3>{stock.symbol}</h3>
                <div className={styles.badges}>
                  <span className={`${styles.decisionBadge} ${getDecisionBadgeClass(stock.decisionAction)}`}>
                    {stock.decisionAction}
                  </span>
                  <span className={`${styles.gradeBadge} ${getGradeBadgeClass(stock.decisionGrade)}`}>
                    {stock.decisionGrade}
                  </span>
                  <span className={styles.priorityBadge}>
                    P{stock.priority}
                  </span>
                </div>
              </div>
              <div className={styles.stockPrice}>
                ₹{stock.currentPrice.toFixed(2)}
              </div>
            </div>

            <div className={styles.stockMetrics}>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Confidence</span>
                <span className={styles.metricValue}>{Math.round(stock.decisionConfidence * 100)}%</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Systems</span>
                <span className={styles.metricValue}>{stock.systemsAnalyzed}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Agreement</span>
                <span className={styles.metricValue}>{stock.systemsAgreement}</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricLabel}>Position Risk</span>
                <span className={styles.metricValue}>{stock.executionData?.positionSize?.risk || 'N/A'}</span>
              </div>
            </div>

            <div className={styles.nextStep}>
              <span className={styles.nextStepLabel}>Next Step:</span>
              <span className={styles.nextStepText}>{stock.nextStepSummary}</span>
            </div>

            {stock.executionData?.positionSize && (
              <div className={styles.positionInfo}>
                <div className={styles.positionItem}>
                  <span className={styles.positionLabel}>Shares:</span>
                  <span className={styles.positionValue}>{stock.executionData.positionSize.shares || 0}</span>
                </div>
                <div className={styles.positionItem}>
                  <span className={styles.positionLabel}>Value:</span>
                  <span className={styles.positionValue}>₹{(stock.executionData.positionSize.value || 0).toLocaleString()}</span>
                </div>
                <div className={styles.positionItem}>
                  <span className={styles.positionLabel}>Risk:</span>
                  <span className={styles.positionValue}>{stock.executionData.positionSize.risk || 'N/A'}</span>
                </div>
              </div>
            )}

            <div className={styles.stockFooter}>
              <span className={styles.lastAnalyzed}>
                Last analyzed: {new Date(stock.lastAnalyzedAt).toLocaleDateString()}
              </span>
              <span className={styles.clickHint}>Click for details →</span>
            </div>
          </div>
        ))}
      </div>

      {stocks.length === 0 && (
        <div className={styles.emptyState}>
          <h3>No stocks in watchlist</h3>
          <p>Your watchlist is empty. Add some stocks to get started!</p>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
