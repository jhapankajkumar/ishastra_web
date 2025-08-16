import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWatchlist } from '../api/analysisApi';
import styles from './StockDetail.module.css';

const StockDetail = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSystem, setActiveSystem] = useState(null);

  useEffect(() => {
    fetchStockDetail();
  }, [symbol]);

  const fetchStockDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWatchlist();
      const stockData = response.stocks.find(s => s.symbol === symbol);
      
      if (!stockData) {
        setError('Stock not found in watchlist');
        return;
      }
      
      setStock(stockData);
      // Set the first system as active by default
      const systems = Object.keys(stockData.systemsData);
      if (systems.length > 0) {
        setActiveSystem(systems[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch stock details');
      console.error('Stock detail error:', err);
    } finally {
      setLoading(false);
    }
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

  const formatCurrency = (value) => {
    if (!value || value === 0) return 'N/A';
    return `₹${value.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading stock details...</p>
        </div>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h3>Error Loading Stock Details</h3>
          <p>{error || 'Stock not found'}</p>
          <button onClick={() => navigate('/watchlist')} className={styles.backButton}>
            Back to Watchlist
          </button>
        </div>
      </div>
    );
  }

  const activeSystemData = stock.systemsData[activeSystem];

  return (
    <div className={styles.container}>
      {/* Header with back button */}
      <div className={styles.header}>
        <button 
          onClick={() => navigate('/watchlist')} 
          className={styles.backButton}
        >
          ← Back to Watchlist
        </button>
        <h1>{stock.symbol} - Detailed Analysis</h1>
      </div>

      {/* Stock Overview */}
      <div className={styles.overview}>
        <div className={styles.overviewMain}>
          <div className={styles.stockTitle}>
            <h2>{stock.symbol}</h2>
            <div className={styles.badges}>
              <span className={`${styles.decisionBadge} ${getDecisionBadgeClass(stock.decisionAction)}`}>
                {stock.decisionAction}
              </span>
              <span className={`${styles.gradeBadge} ${getGradeBadgeClass(stock.decisionGrade)}`}>
                Grade {stock.decisionGrade}
              </span>
              <span className={styles.priorityBadge}>
                Priority {stock.priority}
              </span>
            </div>
          </div>
          <div className={styles.stockPrice}>
            <span className={styles.price}>{formatCurrency(stock.currentPrice)}</span>
            <span className={styles.currency}>{stock.currency}</span>
          </div>
        </div>

        <div className={styles.overviewMetrics}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Confidence</span>
            <span className={styles.metricValue}>{Math.round(stock.decisionConfidence * 100)}%</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Systems Agreement</span>
            <span className={styles.metricValue}>{stock.systemsAgreement}</span>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Systems Analyzed</span>
            <span className={styles.metricValue}>{stock.systemsAnalyzed}</span>
          </div>
        </div>
      </div>

      {/* Execution Data */}
      <div className={styles.section}>
        <h3>📊 Execution Plan</h3>
        <div className={styles.executionGrid}>
          <div className={styles.executionItem}>
            <span className={styles.label}>Entry Price</span>
            <span className={styles.value}>{formatCurrency(stock.executionData.entry)}</span>
          </div>
          <div className={styles.executionItem}>
            <span className={styles.label}>Stop Loss</span>
            <span className={styles.value}>{formatCurrency(stock.executionData.stop)}</span>
          </div>
          <div className={styles.executionItem}>
            <span className={styles.label}>Target 1</span>
            <span className={styles.value}>{formatCurrency(stock.executionData.target1)}</span>
          </div>
          <div className={styles.executionItem}>
            <span className={styles.label}>Target 2</span>
            <span className={styles.value}>{formatCurrency(stock.executionData.target2)}</span>
          </div>
          <div className={styles.executionItem}>
            <span className={styles.label}>Risk/Reward</span>
            <span className={styles.value}>{stock.executionData.riskReward?.toFixed(2) || 'N/A'}</span>
          </div>
          <div className={styles.executionItem}>
            <span className={styles.label}>Position Risk</span>
            <span className={styles.value}>{stock.executionData.positionSize?.risk || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Decision Reasoning */}
      <div className={styles.section}>
        <h3>🧠 Decision Reasoning</h3>
        <div className={styles.reasoning}>
          <p>{stock.decisionReasoning}</p>
        </div>
      </div>

      {/* Next Step */}
      <div className={styles.section}>
        <h3>➡️ Next Action Required</h3>
        <div className={styles.nextStep}>
          <p>{stock.nextStepSummary}</p>
        </div>
      </div>

      {/* Systems Analysis */}
      <div className={styles.section}>
        <h3>🔍 Trading Systems Analysis</h3>
        
        {/* System Navigation */}
        <div className={styles.systemTabs}>
          {Object.entries(stock.systemsData).map(([systemKey, systemData]) => (
            <button
              key={systemKey}
              className={`${styles.systemTab} ${activeSystem === systemKey ? styles.active : ''}`}
              onClick={() => setActiveSystem(systemKey)}
            >
              <span className={styles.systemName}>{systemData.systemName}</span>
              <span className={`${styles.systemDecision} ${getDecisionBadgeClass(systemData.decision)}`}>
                {systemData.decision}
              </span>
              <span className={styles.systemConfidence}>
                {Math.round(systemData.confidence * 100)}%
              </span>
            </button>
          ))}
        </div>

        {/* Active System Details */}
        {activeSystemData && (
          <div className={styles.systemDetails}>
            <div className={styles.systemHeader}>
              <h4>{activeSystemData.systemName}</h4>
              <div className={styles.systemBadges}>
                <span className={`${styles.decisionBadge} ${getDecisionBadgeClass(activeSystemData.decision)}`}>
                  {activeSystemData.decision}
                </span>
                <span className={`${styles.gradeBadge} ${getGradeBadgeClass(activeSystemData.grade)}`}>
                  {activeSystemData.grade}
                </span>
                <span className={styles.confidenceBadge}>
                  {Math.round(activeSystemData.confidence * 100)}%
                </span>
              </div>
            </div>

            {/* System Reasoning */}
            <div className={styles.systemReasoning}>
              <h5>Analysis Reasoning:</h5>
              <ul>
                {activeSystemData.reasoning?.map((reason, index) => (
                  <li key={index}>{reason}</li>
                )) || <li>No reasoning provided</li>}
              </ul>
            </div>

            {/* Execution Plan */}
            {activeSystemData.executionPlan && (
              <div className={styles.systemExecution}>
                <h5>System Execution Plan:</h5>
                <div className={styles.executionPlanContent}>
                  <div className={styles.planItem}>
                    <span className={styles.planLabel}>Action:</span>
                    <span className={styles.planValue}>{activeSystemData.executionPlan.action}</span>
                  </div>
                  
                  {activeSystemData.executionPlan.entryStrategy && (
                    <div className={styles.strategySection}>
                      <h6>Entry Strategy:</h6>
                      <p><strong>Type:</strong> {activeSystemData.executionPlan.entryStrategy.type}</p>
                      <p><strong>Method:</strong> {activeSystemData.executionPlan.entryStrategy.method}</p>
                      {activeSystemData.executionPlan.entryStrategy.conditions && (
                        <div>
                          <strong>Conditions:</strong>
                          <ul>
                            {activeSystemData.executionPlan.entryStrategy.conditions.map((condition, index) => (
                              <li key={index}>{condition}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className={styles.timestamps}>
        <div className={styles.timestamp}>
          <span className={styles.timestampLabel}>Added to Watchlist:</span>
          <span className={styles.timestampValue}>
            {new Date(stock.addedAt).toLocaleString()}
          </span>
        </div>
        <div className={styles.timestamp}>
          <span className={styles.timestampLabel}>Last Analyzed:</span>
          <span className={styles.timestampValue}>
            {new Date(stock.lastAnalyzedAt).toLocaleString()}
          </span>
        </div>
        <div className={styles.timestamp}>
          <span className={styles.timestampLabel}>Last Updated:</span>
          <span className={styles.timestampValue}>
            {new Date(stock.updatedAt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};

export default StockDetail;
