import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWatchlist } from '../api/analysisApi';
import { convertWatchlistToTradeEntryForm, validateWatchlistForConversion, hasBuySignal } from '../common/WatchlistToTradeConverter';
import { createTrade } from '../api/tradeApi';
import { getCurrentPrice } from '../api/tickerApi';
import { useNotification } from '../components/NotificationProvider';
import styles from './Watchlist.module.css';

const Watchlist = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('priority'); // priority, confidence, symbol
  const navigate = useNavigate();
  const notification = useNotification();

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWatchlist();
      // Updated to handle new response structure
      const stocksData = response.stocks || response.data || [];
      // Sort by priority by default (lower number = higher priority)
      const sortedStocks = stocksData.sort((a, b) => (a.priority || 1) - (b.priority || 1));
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
        case 'confidence':
          return (b.decision?.confidence || 0) - (a.decision?.confidence || 0);
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
            {stocks.filter(s => s.decision?.action === 'BUY').length}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>WATCH Signals</span>
          <span className={styles.statValue}>
            {stocks.filter(s => s.decision?.action === 'WATCH').length}
          </span>
        </div>
      </div>

      <div className={styles.stockList}>
        {stocks.map((stock) => (
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
                  <span className={styles.priorityBadge}>
                    P{stock.priority || 1}
                  </span>
                </div>
              </div>
              <div className={styles.priceSection}>
                <span className={styles.currentPrice}>
                  {stock.currency === 'INR' ? '₹' : '$'}{(stock.price || stock.currentPrice || 0).toFixed(2)}
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
                <span className={styles.metricLabel}>AGREEMENT</span>
                <span className={styles.metricValue}>{stock.decision?.systemsAgreement || 'N/A'}</span>
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
                  <span className={styles.sectionIcon}>📊</span>
                  <span className={styles.sectionTitle}>Entry Strategy</span>
                </div>
                
                <div className={styles.entryContent}>
                  <div className={styles.strategyType}>
                    <span className={styles.strategyLabel}>{stock.execution.entryStrategy.type}</span>
                  </div>
                  
                  <div className={styles.priceRanges}>
                    <div className={styles.priceItem}>
                      <span className={styles.priceLabel}>Optimal</span>
                      <span className={styles.priceValue} style={{ color: '#22c55e' }}>
                        {stock.currency === 'INR' ? '₹' : '$'}{stock.execution.entryStrategy.entryZone?.optimal?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className={styles.priceItem}>
                      <span className={styles.priceLabel}>Max</span>
                      <span className={styles.priceValue} style={{ color: '#f59e0b' }}>
                        {stock.currency === 'INR' ? '₹' : '$'}{stock.execution.entryStrategy.entryZone?.maximum?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.stopLossRow}>
                    <span className={styles.stopIcon}>🛡️</span>
                    <span className={styles.stopLabel}>Stop Loss</span>
                    <span className={styles.stopValue}>
                      {stock.currency === 'INR' ? '₹' : '$'}{stock.execution?.exitStrategy?.stopLoss?.initial || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Trigger Conditions */}
            {stock.execution?.entryStrategy?.triggerConditions && (
              <div className={styles.triggerSection}>
                <div className={styles.triggerHeader}>
                  <span className={styles.triggerIcon}>🎯</span>
                  <span className={styles.triggerTitle}>Trigger Conditions</span>
                  <span className={styles.triggerProgress}>
                    {stock.execution.entryStrategy.triggerConditions.filter(c => c.met).length}/{stock.execution.entryStrategy.triggerConditions.length} Met
                  </span>
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

            {/* Strategy Summary */}
            <div className={styles.strategySummary}>
              <div className={styles.summaryHeader}>
                <span className={styles.summaryLabel}>STRATEGY:</span>
              </div>
              <div className={styles.summaryText}>
                {stock.execution?.entryStrategy?.type || 'Monitor'} - {stock.decision?.reasoning || 'Analyzing...'}
              </div>
            </div>

            {/* Position Info */}
            {stock.execution?.positionSizing && (
              <div className={styles.positionSection}>
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
                    <span className={styles.positionLabel}>RISK:</span>
                    <span className={styles.positionValue}>{stock.execution.positionSizing.riskPercent || 'N/A'}%</span>
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
                  <button 
                    className={styles.createTradeButton}
                    onClick={(e) => handleCreateTrade(stock, e)}
                    title="Create trade entry from this BUY signal"
                  >
                    📝 Create Trade
                  </button>
                )}
                <span className={styles.detailsHint}>Click for details →</span>
              </div>
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
