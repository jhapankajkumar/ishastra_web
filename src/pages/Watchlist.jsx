import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, deleteSymbolFromWatchlist, refreshStockInWatchlist } from '../api/analysisApi';
import { convertWatchlistToTradeEntryForm, validateWatchlistForConversion, hasBuySignal } from '../common/WatchlistToTradeConverter';
import { useNotification } from '../components/NotificationProvider';
import styles from './Watchlist.module.css';

const Watchlist = () => {
  // Delete dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stockToDelete, setStockToDelete] = useState(null);
  // Delete button handler

  // Delete button handler (restored)
  const handleDeleteClick = (stock, event) => {
    console.log('Delete clicked for', stock);
    if (event) event.stopPropagation();
    setStockToDelete(stock);
    setShowDeleteConfirm(true);
    
  };

  // Confirm delete
  // Confirm delete (restored)
  const handleDeleteConfirm = async () => {
    if (!stockToDelete) return;
    try {
      await deleteSymbolFromWatchlist(stockToDelete.symbol);
      notification.success(`Deleted ${stockToDelete.symbol} from watchlist.`);
      setStocks(prev => prev.filter(s => s.symbol !== stockToDelete.symbol));
    } catch (err) {
      notification.error(`Failed to delete ${stockToDelete.symbol}. Please try again.`);
    }
    setShowDeleteConfirm(false);
    setStockToDelete(null);
  };

  const refreshStockData = async (symbol, event) => {
    try {
      if (event) event.stopPropagation();
      await refreshStockInWatchlist(symbol);
      await fetchWatchlist();
    } catch (error) {
      console.error('Error refreshing stock data:', error);
    }
  };

  // Cancel delete
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setStockToDelete(null);
  };
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('watchlistActiveTab') || 'INDIA';
  });
  // Responsive compact mode controls
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  const [expandedCards, setExpandedCards] = useState({});
  const navigate = useNavigate();
  const notification = useNotification();

  const setActiveTabWithPersist = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('watchlistActiveTab', tab);
  };

  // Filter stocks based on active tab and search term
  const getFilteredStocks = () => {
    let filteredStocks = [];
    switch (activeTab) {
      case 'INDIA':
        filteredStocks = stocks.filter(stock => stock.currency === 'INR' && stock.decision?.action === 'BUY');
        break;
      case 'USA':
        filteredStocks = stocks.filter(stock => stock.currency === 'USD' && stock.decision?.action === 'BUY');
        break;
      default:
        filteredStocks = stocks;
    }

    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) {
      return filteredStocks;
    }

    return filteredStocks.filter(stock => {
      const symbol = stock.symbol?.toLowerCase() || '';
      const companyName = stock.companyName?.toLowerCase() || '';
      const tickerName = stock.tickerName?.toLowerCase() || '';
      return symbol.includes(normalizedSearch) || companyName.includes(normalizedSearch) || tickerName.includes(normalizedSearch);
    });
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Grade value mapping for proper sorting
  const getGradeValue = (grade) => {
    const gradeMap = {
      'A+': 6,
      'A': 5,
      'A-': 4,
      'B+': 3,
      'B': 2,
      'B-': 1,
      'C': 0
    };
    return gradeMap[grade] || 0;
  };

  // Multi-level sorting function
  const sortStocks = (stocksData) => {
    return [...stocksData].sort((a, b) => {
      // Level 1: Sort by action (BUY first, then WATCH, then others)
      const actionA = a.decision?.action || 'UNKNOWN';
      const actionB = b.decision?.action || 'UNKNOWN';

      if (actionA === 'BUY' && actionB !== 'BUY') return -1;
      if (actionA !== 'BUY' && actionB === 'BUY') return 1;
      if (actionA === 'WATCH' && actionB !== 'WATCH' && actionB !== 'BUY') return -1;
      if (actionA !== 'WATCH' && actionB === 'WATCH' && actionA !== 'BUY') return 1;

      // Level 2: Sort by grade (higher grade first)
      const gradeA = getGradeValue(a.decision?.grade);
      const gradeB = getGradeValue(b.decision?.grade);

      if (gradeA !== gradeB) {
        return gradeB - gradeA; // Higher grade first
      }

      // Level 3: Sort by confidence (higher confidence first)
      const confidenceA = a.decision?.confidence || 0;
      const confidenceB = b.decision?.confidence || 0;

      return confidenceB - confidenceA; // Higher confidence first
    });
  };

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWatchlist();
      const stocksData = response.stocks || response.data || [];
      setStocks(sortStocks(stocksData));
    } catch (err) {
      setError(err.message || 'Failed to fetch watchlist');
      console.error('Watchlist error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockClick = (symbol) => {
    navigate(`/stock-detail/${symbol}`);
  };


  const handleChartClick = (symbol) => {
    navigate(`/chart/${symbol}`);
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
  const currentFilteredStocks = getFilteredStocks();
  const indiaWatchlistCount = stocks.filter(stock => stock.currency === 'INR' && stock.decision?.action === 'BUY').length;
  const usaWatchlistCount = stocks.filter(stock => stock.currency === 'USD' && stock.decision?.action === 'BUY').length;
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Trading Watchlist</h1>
        <p>Monitor your high-priority trading opportunities</p>
      </div>

      <div className={styles.controlBar}>
        <div className={styles.searchContainer}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by symbol or company"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Watchlist Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'INDIA' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('INDIA')}
        >
          📊 India Stocks ({indiaWatchlistCount})
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'USA' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('USA')}
        >
          📊 US Stocks ({usaWatchlistCount})
        </button>
      </div>

      <div className={styles.stockList}>
        {currentFilteredStocks.map((stock, index) => (
          <div
            key={stock.symbol}
            className={styles.stockCard}
            onClick={() => handleStockClick(stock.symbol)}
          >
            {/* Header with Symbol and Price */}
            <div className={styles.cardHeader}>
              <div className={styles.symbolSection}>
                <h4 className={styles.stockSymbol}>{stock.symbol}</h4>
              </div>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  className={styles.chartLink}
                  onClick={(e) => { e.stopPropagation(); handleChartClick(stock.symbol); }}
                  title="Open chart"
                >
                  📈
                </button>
                <button
                  type="button"
                  onClick={e => refreshStockData(stock, e)}
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  title="Refresh"
                >
                  🔄
                </button>
                <button
                  type="button"
                  onClick={e => handleDeleteClick(stock, e)}
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Metrics Row */}
            {/* <div className={styles.metricsRow}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>CONFIDENCE</span>
                <span className={styles.metricValue}>{Math.round((stock.decision?.confidence || 0))}%</span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>SYSTEM</span>
                <span className={styles.metricValue} title={stock.decision?.winningSystem}>
                  {stock.decision?.winningSystem?.split(' ')[0] || 'N/A'}
                </span>
              </div>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>RISK/REWARD</span>
                <span className={styles.metricValue}>{stock.execution?.positionSizing?.riskReward || 'N/A'}</span>
              </div>
            </div> */}

            {/* Entry Strategy Section */}
            {stock.execution?.entryStrategy && stock.execution?.positionSizing && (
              <div className={styles.entrySection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Entry & Position</span>
                </div>

                <div className={styles.positionRow}>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Entry</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{stock.execution.entryStrategy.entryZone?.optimal?.toFixed(0) || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>SHARES</span>
                    <span className={styles.positionValue}>{stock.execution.positionSizing.shares?.toLocaleString() || 0}</span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>VALUE</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.positionSizing.positionValue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {/* <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Risk</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.positionSizing.riskAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Per Share</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.positionSizing.riskPerShare || 0).toLocaleString()}
                    </span>
                  </div> */}
                </div>
              </div>
            )}

            {/* Position Info */}
            {/* {stock.execution?.positionSizing && (
              <div className={styles.positionSection}>
                <div className={styles.triggerHeader}>
                  <span className={styles.triggerTitle}>Posistions</span>
                </div>
                <div className={styles.positionRow}>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>SHARES:</span>
                    <span className={styles.positionValue}>{stock.execution.positionSizing.shares?.toLocaleString() || 0}</span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>VALUE:</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.positionSizing.positionValue || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Risk Amount:</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.positionSizing.riskAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Risk Per Share:</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.positionSizing.riskPerShare || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>RISK:</span>
                    <span className={styles.positionValue}>{stock.execution.positionSizing.riskPercent || 'N/A'}%</span>
                  </div>
                </div>
              </div>
            )} */}

            {/* Position Info */}
            {stock.execution?.exitStrategy && (
              <div className={styles.positionSection}>
                <div className={styles.triggerHeader}>
                  <span className={styles.triggerTitle}>Exit</span>
                </div>

                <div className={styles.positionRow}>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Stop</span>
                    <span className={styles.stopValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{stock.execution?.exitStrategy?.stopLoss?.initial || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Distance</span>
                    <span className={styles.positionValue}>
                      {(stock.execution.positionSizing.stopDistance || 0).toLocaleString()}%
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Risk</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.positionSizing.riskAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {/* <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Target1</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.exitStrategy.targets.conservative || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Target2</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.exitStrategy.targets.moderate || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Target3</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.exitStrategy.targets.aggressive || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div> */}
                </div>
              </div>
            )}

          </div>
        ))}
      </div>

      {currentFilteredStocks.length === 0 && (
        <div className={styles.emptyState}>
          <h3>
            {searchTerm ? 'No matching stocks' : 'No BUY signals found'}
          </h3>
          <p>
            {searchTerm
              ? 'Try a different ticker or clear the search filter.'
              : 'No stocks currently have BUY signals. Check back later!'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Dialog (ensure this is rendered after all popups) */}
      {showDeleteConfirm && stockToDelete && (
        <div className={styles.deleteConfirmOverlay}>
          <div className={styles.deleteConfirmDialog}>
            <h3 className={styles.deleteConfirmTitle}>Delete Stock</h3>
            <p className={styles.deleteConfirmMessage}>
              Are you sure you want to delete <strong>{stockToDelete.symbol}</strong> from your watchlist?<br />
              This action cannot be undone and will permanently remove all analysis and data for this stock.
            </p>
            <div className={styles.deleteConfirmActions}>
              <button
                onClick={handleDeleteCancel}
                className={styles.deleteConfirmCancel}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className={styles.deleteConfirmButton}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Watchlist;
