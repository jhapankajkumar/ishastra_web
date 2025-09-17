import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWatchlist, runWatchlistDailyScan } from '../api/analysisApi';
import { convertWatchlistToTradeEntryForm, validateWatchlistForConversion, hasBuySignal } from '../common/WatchlistToTradeConverter';
import { createTrade } from '../api/tradeApi';
import { getCurrentPrice } from '../api/tickerApi';
import { useNotification } from '../components/NotificationProvider';
import styles from './Watchlist.module.css';

const Watchlist = () => {
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
    return localStorage.getItem('watchlistActiveTab') || 'ALL';
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
      case 'BUY':
        return stocks.filter(stock => stock.decision?.action === 'BUY');
      case 'WATCH':
        return stocks.filter(stock => stock.decision?.action === 'WATCH');
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
    
    switch (sortType) {
      case 'confidence':
        // Sort by confidence first, then by grade as secondary
        sortedStocks = sortedStocks.sort((a, b) => {
          const confidenceA = a.decision?.confidence || 0;
          const confidenceB = b.decision?.confidence || 0;
          
          if (confidenceA !== confidenceB) {
            return confidenceB - confidenceA; // Higher confidence first
          }
          
          // Secondary sort by grade
          const gradeA = getGradeValue(a.decision?.grade);
          const gradeB = getGradeValue(b.decision?.grade);
          return gradeB - gradeA; // Higher grade first
        });
        break;
      case 'grade':
        // Sort by grade first, then by confidence as secondary
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
        break;
      case 'symbol':
        sortedStocks = sortedStocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
        break;
      default:
        // Default to grade then confidence sorting
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
        break;
    }
    
    setStocks(sortedStocks);
  };

  const handleStockClick = (symbol) => {
    navigate(`/stock-detail/${symbol}`);
  };

  const handleCreateTrade = async (stock, event) => {
    event.stopPropagation();
    
    // Show loading state on the button
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '⏳ Creating...';
    button.disabled = true;
    
    try {
      // Get current price and ticker info first
      let currentPrice = stock.currentPrice;
      let companyName = stock.symbol; // Fallback to symbol
      
      try {
        const priceResponse = await getCurrentPrice(stock.symbol);
        currentPrice = priceResponse.data?.price || 0;
        companyName = priceResponse.data?.companyName || stock.symbol;
      } catch (priceError) {
        console.warn('Could not fetch current price:', priceError);
        // Use price from watchlist if available
        currentPrice = stock.price || stock.currentPrice || 0;
      }

      // Create comprehensive trade data from watchlist item
      const tradeData = {
        // Basic info - matching createTrade requirements
        ticker: stock.symbol,
        tickerName: companyName,
        direction: 'Long', // Hardcoded as per tradeApi.js
        instrumentType: 'Stocks', // Hardcoded as per tradeApi.js
        currency: stock.currency || 'INR', // Default to INR as per tradeApi.js
        
        // Entry details
        entryDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
        entryPrice: currentPrice || stock.execution?.entryStrategy?.entryZone?.optimal || 0,
        quantity: stock.execution?.positionSizing?.shares || 0,
        
        // Risk management from watchlist execution data
        stopLoss: stock.execution?.exitStrategy?.stopLoss?.initial || 0,
        target1: stock.execution?.exitStrategy?.targets?.conservative || 0,
        target2: stock.execution?.exitStrategy?.targets?.moderate || 0,
        target3: stock.execution?.exitStrategy?.targets?.aggressive || 0,
        
        // Hardcoded values as per tradeApi.js
        confidence: Math.round(stock.decision?.confidence || 75), // Convert percentage to number
        grade: stock.decision?.grade || "A", // Default to A as per tradeApi.js
        tradeSetup: 20001, // Hardcoded as per tradeApi.js
        isPaperTrade: true, // Hardcoded as per tradeApi.js
        
        // Entry commission and notes
        entryCommission: 0, // Default as per tradeApi.js
        reasonForEntry: stock.decision?.reasoning || `${stock.decision?.action} signal from ${stock.decision?.winningSystem}`,
        
        // Notes with complete strategy summary
        notes: `Auto-created from Watchlist Analysis
Strategy: ${stock.execution?.entryStrategy?.type || 'Monitor'}
System: ${stock.decision?.winningSystem || 'N/A'}
Confidence: ${Math.round(stock.decision?.confidence || 0)}%
Risk/Reward: ${stock.execution?.positionSizing?.riskReward || 'N/A'}:1
Entry Zone: ${stock.currency === 'INR' ? '₹' : '$'}${stock.execution?.entryStrategy?.entryZone?.optimal?.toFixed(2) || 'N/A'} - ${stock.currency === 'INR' ? '₹' : '$'}${stock.execution?.entryStrategy?.entryZone?.maximum?.toFixed(2) || 'N/A'}
Volume Required: Min ${(stock.execution?.entryStrategy?.volumeRequirements?.minimum / 1000000)?.toFixed(1) || 'N/A'}M
Time Window: ${stock.execution?.entryStrategy?.timeWindows?.primary || 'Any time'}
Max Hold: ${stock.execution?.exitStrategy?.timeBasedExits?.maxHoldPeriod || 'N/A'} days`,
        
        // Special field: Full watchlist data as JSON
        systemAnalysisResult: JSON.stringify(stock)
      };
      
      console.log('🚀 Creating trade directly from watchlist:', tradeData);
      
      // Create the trade using direct object (not FormData)
      await createTrade(tradeData, { useDirectObject: true });
      
      // Show success notification with action to view trades
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
      
      // Navigate to trade list after successful creation
      navigate('/trades');
      
    } catch (error) {
      console.error('Error creating trade from watchlist:', error);
      notification.error(`Failed to create trade for ${stock.symbol}. Please try again.`);
    } finally {
      // Reset button state
      button.textContent = originalText;
      button.disabled = false;
    }
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📊 Trading Watchlist</h1>
        <p>Monitor your high-priority trading opportunities</p>
        
        <div className={styles.sortControls}>
          <label>Sort by:</label>
          <button 
            className={`${styles.sortButton} ${sortBy === 'grade' ? styles.active : ''}`}
            onClick={() => handleSort('grade')}
          >
            Grade
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

      {/* Watchlist Tabs */}
      <div className={styles.tabContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'ALL' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('ALL')}
        >
          📊 All Stocks
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'BUY' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('BUY')}
        >
          🟢 BUY Signals
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'WATCH' ? styles.active : ''}`}
          onClick={() => setActiveTabWithPersist('WATCH')}
        >
          👁️ WATCH List
        </button>
      </div>

      <div className={styles.statsBar}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>
            {activeTab === 'ALL' ? 'Total Stocks' : 
             activeTab === 'BUY' ? 'BUY Signals' : 
             'WATCH Signals'}
          </span>
          <span className={styles.statValue}>{getFilteredStocks().length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>All BUY Signals</span>
          <span className={styles.statValue}>
            {stocks.filter(s => s.decision?.action === 'BUY').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>All WATCH Signals</span>
          <span className={styles.statValue}>
            {stocks.filter(s => s.decision?.action === 'WATCH').length}
          </span>
        </div>
      </div>

      <div className={styles.stockList}>
        {getFilteredStocks().map((stock, index) => (
          <div 
            key={stock.symbol} 
            className={styles.stockCard}
            onClick={() => handleStockClick(stock.symbol)}
          >
            {/* Header with Symbol and Price */}
            <div className={styles.cardHeader}>
              <div className={styles.symbolSection}>
                <h2 className={styles.stockSymbol}>{stock.symbol}</h2>
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
              
              <div className={styles.priceSection}>
                <span className={styles.metricLabel}>Analysis Price:</span>
                <span className={styles.metricValue}>
                  {stock.currency === 'INR' ? '₹' : '$'}{(stock.entryPrice || 0).toFixed(2)}
                </span>
              </div>
              <div className={styles.priceSection}>
                <span className={styles.metricLabel}>Current Price:</span>
                <span className={styles.metricValue}>
                  {stock.currency === 'INR' ? '₹' : '$'}{(stock.price || 0).toFixed(2)}
                </span>
              </div>
              <div className={styles.priceSection}>
                <span className={styles.metricValue}>{stock.inTrade? 'P&L:' : 'Potential P&L:'}</span>
                <span className={styles.currentPrice}>
                  {stock.currency === 'INR' ? '₹' : '$'}{((stock.inTrade ? (stock.price || 0) - (stock.entryPrice || 0) : 0) * stock.execution.positionSizing.shares).toFixed(0)}
                </span>
              </div>
            </div>

            {/* Metrics Row */}
            <div className={styles.metricsRow}>
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
            </div>

            {/* Entry Strategy Section */}
            {stock.execution?.entryStrategy && (
              <div className={styles.entrySection}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionTitle}>Entry</span>
                </div>

                <div className={styles.positionRow}>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Optimal:</span>
                    <span className={styles.priceValue} style={{ color: '#22c55e' }}>
                        {stock.currency === 'INR' ? '₹' : '$'}{stock.execution.entryStrategy.entryZone?.optimal?.toFixed(2) || 'N/A'}
                      </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Acceptable:</span>
                    <span className={styles.priceValue} style={{ color: '#f59e0b' }}>
                        {stock.currency === 'INR' ? '₹' : '$'}{stock.execution.entryStrategy.entryZone?.acceptable?.toFixed(2) || 'N/A'}
                      </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Maximum:</span>
                    <span className={styles.priceValue} style={{ color: '#d12525be' }}>
                        {stock.currency === 'INR' ? '₹' : '$'}{stock.execution.entryStrategy.entryZone?.maximum?.toFixed(2) || 'N/A'}
                      </span>
                  </div>
                </div>
              </div>
            )}

            {/* Trigger Conditions (hidden on mobile by default; toggled via button) */}
            {stock.execution?.entryStrategy?.triggerConditions && (!isMobile ? true : !!expandedCards[index]) && (
              <div className={styles.triggerSection}>
                <div className={styles.triggerHeader}>
                  <span className={styles.triggerTitle}>Conditions</span>
                </div>
                
                <div className={styles.triggerList}>
                  {stock.execution.entryStrategy.triggerConditions.map((condition, index) => (
                    <div key={index} className={`${styles.triggerItem} ${condition.met ? styles.triggerMet : styles.triggerPending}`}>
                      <div className={styles.triggerMain}>
                        <span className={styles.triggerIcon}>{condition.met ? '✅' : '⏳'}</span>
                        <span className={styles.triggerType}>{condition.type.split('_')[0]}</span>
                        <span className={`${styles.triggerStatus} ${condition.met ? styles.statusMet : styles.statusPending}`}>
                          {condition.met ? 'MET' : 'PENDING'}
                        </span>
                      </div>
                      
                      <div className={styles.triggerDetails}>
                        <span className={styles.triggerLabel}>REQUIRED:</span>
                        <span className={styles.triggerValue}>{condition.threshold?.toLocaleString?.() || 'N/A'}</span>
                        <span className={styles.triggerLabel}>CURRENT:</span>
                        <span className={styles.triggerValue}>{condition.current?.toLocaleString?.() || 'N/A'}</span>
                      </div>
                      
                      {condition.type === 'VOLUME' && condition.threshold && condition.current && (
                        <div className={styles.progressSection}>
                          <div className={styles.progressValue}>
                            {((condition.current / condition.threshold) * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Position Info */}
            {stock.execution?.positionSizing && (
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
            )}

            {/* Position Info */}
            {stock.execution?.exitStrategy && (
              <div className={styles.positionSection}>
                <div className={styles.triggerHeader}>
                  <span className={styles.triggerTitle}>Exit</span>
                </div>
                
                <div className={styles.positionRow}>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Stop Loss:</span>
                    <span className={styles.stopValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{stock.execution?.exitStrategy?.stopLoss?.initial || 'N/A'}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Distance:</span>
                    <span className={styles.positionValue}>
                      {(stock.execution.positionSizing.stopDistance || 0).toLocaleString()}%
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Target1:</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.exitStrategy.targets.conservative || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Target2:</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.exitStrategy.targets.moderate || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className={styles.positionGroup}>
                    <span className={styles.positionLabel}>Target3:</span>
                    <span className={styles.positionValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{(stock.execution.exitStrategy.targets.aggressive || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className={styles.cardFooter}>
              <span className={styles.addedDate}>
                Added: {new Date(stock.createdAt).toLocaleDateString()}
              </span>
              <div className={styles.footerActions}>
                {stock.decision?.action === 'BUY' && (
                  stock.inTrade ? (
                    <button 
                      className={`${styles.createTradeButton} ${styles.disabled}`}
                      disabled
                      title="Already in trade"
                    >
                      🚩 In Trade
                    </button>
                  ) : (
                    <button 
                      className={styles.createTradeButton}
                      onClick={(e) => handleCreateTrade(stock, e)}
                      title="Create trade entry from this BUY signal"
                    >
                      📝 Create Trade
                    </button>
                  )
                )}
                {!isMobile && (
                  <span className={styles.detailsHint}>Click for details →</span>
                )}
                {isMobile && (
                  <button
                    className={styles.detailsToggle}
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCards(prev => ({ ...prev, [index]: !prev[index] }));
                    }}
                  >
                    {expandedCards[index] ? 'Hide conditions' : 'Show conditions'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {getFilteredStocks().length === 0 && (
        <div className={styles.emptyState}>
          <h3>
            {activeTab === 'ALL' ? 'No stocks in watchlist' :
             activeTab === 'BUY' ? 'No BUY signals found' :
             'No WATCH signals found'}
          </h3>
          <p>
            {activeTab === 'ALL' ? 'Your watchlist is empty. Add some stocks to get started!' :
             activeTab === 'BUY' ? 'No stocks currently have BUY signals. Check back later!' :
             'No stocks currently have WATCH signals. Check back later!'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Watchlist;
