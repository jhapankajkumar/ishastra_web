import React, { useState, useEffect } from 'react';
import BuyMorePopup from '../components/BuyMorePopup';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, runWatchlistDailyScan, deleteSymbolFromWatchlist, refreshStockInWatchlist } from '../api/analysisApi';
import { convertWatchlistToTradeEntryForm, validateWatchlistForConversion, hasBuySignal } from '../common/WatchlistToTradeConverter';
import { createTrade } from '../api/tradeApi';
import { getCurrentPrice } from '../api/tickerApi';
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
  // Popup state
  const [buyMoreOpen, setBuyMoreOpen] = useState(false);
  const [buyMoreMode, setBuyMoreMode] = useState('buyMore'); // 'buyMore' or 'createTrade'
  const [buyMoreStock, setBuyMoreStock] = useState(null);
  const [buyMoreInitial, setBuyMoreInitial] = useState({ quantity: 0, avgPrice: 0, riskPerShare: 0, riskPercent: 0, positionValue: 0, capitalLeft: 0, currency: '₹', symbol: '' });
  // Simulate available capital (should be fetched from user/account API in real app)
  const [capitalLeft, setCapitalLeft] = useState(1000000); // 10 lakh default
  // Open Buy More popup
  const handleBuyMore = (stock) => {
    const pos = stock.execution?.positionSizing || {};
    setBuyMoreStock(stock);
    setBuyMoreMode('buyMore');
    setBuyMoreInitial({
      quantity: pos.shares || 0,
      avgPrice: stock.price || stock.entryPrice || 0,
      riskPerShare: pos.riskPerShare || 0,
      riskPercent: pos.riskPercent || 0,
      positionValue: pos.positionValue || 0,
      capitalLeft,
      currency: stock.currency === 'INR' ? '₹' : '$',
      symbol: stock.symbol
    });
    setBuyMoreOpen(true);
  };

  // Open Create Trade popup
  const handleCreateTradePopup = (stock, event) => {
    event.stopPropagation();
    const pos = stock.execution?.positionSizing || {};
    setBuyMoreStock(stock);
    setBuyMoreMode('createTrade');
    setBuyMoreInitial({
      quantity: pos.shares || 0,
      avgPrice: stock.price || stock.entryPrice || 0,
      riskPerShare: pos.riskPerShare || 0,
      riskPercent: pos.riskPercent || 0,
      positionValue: pos.positionValue || 0,
      capitalLeft,
      currency: stock.currency === 'INR' ? '₹' : '$',
      symbol: stock.symbol
    });
    setBuyMoreOpen(true);
  };

  // Handle popup submit
  const handleBuyMoreSubmit = async ({ quantity, avgPrice }) => {
    if (!buyMoreStock) return;
    if (buyMoreMode === 'buyMore') {
      // Simulate buy more logic (update capital left, show notification)
      const totalValue = quantity * avgPrice;
      setCapitalLeft((prev) => prev - totalValue + (buyMoreInitial.quantity * buyMoreInitial.avgPrice));
      notification.success(`Bought ${quantity} shares of ${buyMoreStock.symbol} at ${buyMoreInitial.currency}${avgPrice}`);
      setBuyMoreOpen(false);
      // In real app, update backend/portfolio here
    } else if (buyMoreMode === 'createTrade') {
      // Create trade with entered values
      try {
        let currentPrice = avgPrice;
        let companyName = buyMoreStock.symbol;
        try {
          const priceResponse = await getCurrentPrice(buyMoreStock.symbol);
          currentPrice = priceResponse.data?.price || avgPrice;
          companyName = priceResponse.data?.companyName || buyMoreStock.symbol;
        } catch { }
        const stock = buyMoreStock;
        const tradeData = {
          ticker: stock.symbol,
          tickerName: companyName,
          direction: 'Long',
          instrumentType: 'Stocks',
          currency: stock.currency || 'INR',
          entryDate: new Date().toISOString().split('T')[0],
          entryPrice: avgPrice,
          quantity,
          stopLoss: stock.execution?.exitStrategy?.stopLoss?.initial || 0,
          target1: stock.execution?.exitStrategy?.targets?.conservative || 0,
          target2: stock.execution?.exitStrategy?.targets?.moderate || 0,
          target3: stock.execution?.exitStrategy?.targets?.aggressive || 0,
          confidence: Math.round(stock.decision?.confidence || 75),
          grade: stock.decision?.grade || 'A',
          tradeSetup: 20001,
          isPaperTrade: true,
          entryCommission: 0,
          reasonForEntry: stock.decision?.reasoning || `${stock.decision?.action} signal from ${stock.decision?.winningSystem}`,
          notes: `Auto-created from Watchlist Analysis\nStrategy: ${stock.execution?.entryStrategy?.type || 'Monitor'}\nSystem: ${stock.decision?.winningSystem || 'N/A'}\nConfidence: ${Math.round(stock.decision?.confidence || 0)}%\nRisk/Reward: ${stock.execution?.positionSizing?.riskReward || 'N/A'}:1\nEntry Zone: ${stock.currency === 'INR' ? '₹' : '$'}${stock.execution?.entryStrategy?.entryZone?.optimal?.toFixed(2) || 'N/A'} - ${stock.currency === 'INR' ? '₹' : '$'}${stock.execution?.entryStrategy?.entryZone?.maximum?.toFixed(2) || 'N/A'}\nVolume Required: Min ${(stock.execution?.entryStrategy?.volumeRequirements?.minimum / 1000000)?.toFixed(1) || 'N/A'}M\nTime Window: ${stock.execution?.entryStrategy?.timeWindows?.primary || 'Any time'}\nMax Hold: ${stock.execution?.exitStrategy?.timeBasedExits?.maxHoldPeriod || 'N/A'} days`,
          systemAnalysisResult: JSON.stringify(stock)
        };
        await createTrade(tradeData, { useDirectObject: true });
        notification.success(
          `Trade created for ${stock.symbol}!`,
          {
            action: {
              label: 'View Trades',
              onClick: () => navigate('/trades')
            },
            duration: 5000
          }
        );
        setBuyMoreOpen(false);
        navigate('/trades');
      } catch (error) {
        notification.error(`Failed to create trade for ${buyMoreStock.symbol}. Please try again.`);
      }
    }
  };
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('grade'); // grade, confidence, symbol
  const [refreshing, setRefreshing] = useState(false);
  // Refresh handler for daily scan
  const handleRefresh = async () => {
    setRefreshing(true);
    notification.info('Running daily scan. This may take a few seconds...');
    try {
      await runWatchlistDailyScan();
      notification.success('Daily scan complete! Watchlist refreshed.');
      await fetchWatchlist();
    } catch (err) {
      notification.error('Failed to run daily scan. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('watchlistActiveTab') || 'INDIA';
  });
  // Responsive compact mode controls
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth <= 700 : false);
  const [expandedCards, setExpandedCards] = useState({});
  const navigate = useNavigate();
  const notification = useNotification();

  const setActiveTabWithPersist = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('watchlistActiveTab', tab);
  };

  // Filter stocks based on active tab
  const getFilteredStocks = () => {
    switch (activeTab) {
      case 'INDIA':
        return stocks.filter(stock => stock.currency === 'INR' && stock.decision?.action === 'BUY');
      case 'USA':
        return stocks.filter(stock => stock.currency === 'USD' && stock.decision?.action === 'BUY');
      default:
        return stocks;
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 700);
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
    return stocksData.sort((a, b) => {
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
      // Apply multi-level sorting
      const sortedStocks = sortStocks(stocksData);
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
    let sortedStocks = [...stocks];

    sortedStocks = sortedStocks.sort((a, b) => {
      const gradeA = getGradeValue(a.decision?.grade);
      const gradeB = getGradeValue(b.decision?.grade);

      if (gradeA !== gradeB) {
        return gradeB - gradeA; // Higher grade first
      }

      // Secondary sort by confidence  
      const confidenceA = a.decision?.confidence || 0;
      const confidenceB = b.decision?.confidence || 0;
      return confidenceB - confidenceA; // Higher confidence first
    });


    setStocks(sortedStocks);
  };

  const handleStockClick = (symbol) => {
    navigate(`/stock-detail/${symbol}`);
  };


  const getDecisionBadgeClass = (action) => {
    switch (action) {
      case 'STRONG_BUY':
        return styles.badgeBuy;
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
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Trading Watchlist</h1>
        <p>Monitor your high-priority trading opportunities</p>

        {/* <div className={styles.sortControls}>
          <label>Sort by:</label>
          <button
            className={`${styles.sortButton} ${sortBy === 'grade' ? styles.active : ''}`}
            onClick={() => handleSort('grade')}
          >
            Grade
          </button>
          <button
            className={`${styles.sortButton} ${sortBy === 'symbol' ? styles.active : ''}`}
            onClick={() => handleSort('symbol')}
          >
            Symbol
          </button>
        </div> */}
      </div>

      {/* Watchlist Tabs */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tab} ${activeTab === 'INDIA' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('INDIA')}
        >
          📊 India Stocks
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'USA' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('USA')}
        >
          📊 US Stocks
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
                <div className={styles.badgeGroup}>
                  <span className={`${styles.actionBadge} ${getDecisionBadgeClass(stock.decision?.action)}`}>
                    {stock.decision?.action || 'N/A'}
                  </span>
                  <span className={`${styles.gradeBadge} ${getGradeBadgeClass(stock.decision?.grade)}`}>
                    {stock.decision?.grade || 'N/A'}
                  </span>
                  <div className={styles.chartLink} onClick={(e) => { e.stopPropagation(); handleChartClick(stock.symbol); }}>
                    <span className={styles.chartIcon}>📈</span>
                  </div>
                </div>
              </div>

              
              {/* <div className={styles.priceSection}>
                <span className={styles.metricLabel}>Price:</span>
                <span className={styles.metricValue}>
                  {stock.currency === 'INR' ? '₹' : '$'}{(stock.price || 0).toFixed(2)}
                </span>
              </div> */}
              <button
                onClick={e => refreshStockData(stock, e)}
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                title="Refresh"
              >
                🔄
              </button>
              <button
                onClick={e => handleDeleteClick(stock, e)}
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                title="Delete"
              >
                🗑️
              </button>
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

            {/* Footer */}
            <div className={styles.cardFooter}>
              {/* <span className={styles.addedDate}>
                Added: {new Date(stock.createdAt).toLocaleDateString()}
              </span> */}
              <div className={styles.footerActions}>
                {/* Actions: Buy More, Create Trade, Delete */}
                {stock.decision?.action === 'BUY' && (
                  <>
                    {stock.inTrade && (
                      <button
                        className={styles.createTradeButton}
                        onClick={(e) => { e.stopPropagation(); handleBuyMore(stock); }}
                        title="Buy more shares"
                        style={{ marginRight: 8 }}
                      >
                        ➕ Buy More
                      </button>
                    )}
                    {!stock.inTrade && (
                      <button
                        className={styles.createTradeButton}
                        onClick={(e) => handleCreateTradePopup(stock, e)}
                        title="Create trade entry from this BUY signal"
                        style={{ marginRight: 8 }}
                      >
                        📝 Create Trade
                      </button>
                    )}
                  </>
                )}
                {/* Delete button for all stocks (restored, but already present above) */}
                {!isMobile && (
                  <span className={styles.createTradeButton}>Details →</span>
                )}
                {isMobile && index === currentFilteredStocks.length - 1 && (
                  <span className={styles.createTradeButton}>Details →</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {currentFilteredStocks.length === 0 && (
        <div className={styles.emptyState}>
          <h3>
            No BUY signals found
          </h3>
          <p>
            No stocks currently have BUY signals. Check back later!
          </p>
        </div>
      )}

      {/* Buy More / Create Trade Popup */}
      <BuyMorePopup
        open={buyMoreOpen}
        onClose={() => setBuyMoreOpen(false)}
        onSubmit={handleBuyMoreSubmit}
        initialQuantity={buyMoreInitial.quantity}
        initialAvgPrice={buyMoreInitial.avgPrice}
        riskPerShare={buyMoreInitial.riskPerShare}
        riskPercent={buyMoreInitial.riskPercent}
        positionValue={buyMoreInitial.positionValue}
        capitalLeft={buyMoreInitial.capitalLeft}
        currency={buyMoreInitial.currency}
        symbol={buyMoreInitial.symbol}
        mode={buyMoreMode}
      />

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

      {/* Buy More / Create Trade Popup */}
      <BuyMorePopup
        open={buyMoreOpen}
        onClose={() => setBuyMoreOpen(false)}
        onSubmit={handleBuyMoreSubmit}
        initialQuantity={buyMoreInitial.quantity}
        initialAvgPrice={buyMoreInitial.avgPrice}
        riskPerShare={buyMoreInitial.riskPerShare}
        riskPercent={buyMoreInitial.riskPercent}
        positionValue={buyMoreInitial.positionValue}
        capitalLeft={buyMoreInitial.capitalLeft}
        currency={buyMoreInitial.currency}
        symbol={buyMoreInitial.symbol}
        mode={buyMoreMode}
      />
    </div>
  );
};

export default Watchlist;
