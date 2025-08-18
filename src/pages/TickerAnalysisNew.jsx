import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TickerSearch from '../components/TickerSearch';
import { getUnifiedAnalysis } from '../api/analysisApi';
import { useTheme } from '../contexts/ThemeContext';
import styles from './TickerAnalysis.module.css';

const TickerAnalysis = () => {
  const { theme } = useTheme();
  const [selectedTicker, setSelectedTicker] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const RECENT_KEY = 'recentAnalysedStocks';
  const location = useLocation();

  // Prefill ticker from URL and auto-analyze
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const ticker = params.get('ticker');
    if (ticker && ticker !== selectedTicker) {
      setSelectedTicker(ticker);
      handleTickerSelect({ symbol: ticker });
    }
    // eslint-disable-next-line
  }, [location.search]);

  const handleTickerChange = (value) => {
    setSelectedTicker(value);
    if (!value) {
      setAnalysisData(null);
      setError(null);
    }
  };

  const handleTickerSelect = async (tickerData) => {
    setSelectedTicker(tickerData.symbol);
    setLoading(true);
    setError(null);
    setAnalysisData(null);

    try {
      let capital = 120000; // Default capital, can be adjusted as needed
      if (tickerData.symbol.includes('.NS') || tickerData.symbol.includes('.BO')) {
        capital = 1000000;
      }
      const response = await getUnifiedAnalysis(tickerData.symbol, '3mo', capital);
      console.log('API Response:', response);
      setAnalysisData(response);
      // Save to localStorage for recent searches
      if (response && response.symbol) {
        let recent = [];
        try {
          recent = JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
        } catch {}
        // Remove duplicates
        recent = recent.filter(item => item.symbol !== response.symbol);
        // Add new at top
        recent.unshift({
          symbol: response.symbol,
          currentPrice: response.currentPrice,
          timestamp: response.timestamp,
          decision: response.decision,
          execution: response.execution,
          context: response.context,
          risk: response.risk
        });
        // Limit to last 20
        if (recent.length > 20) recent = recent.slice(0, 20);
        localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch analysis data');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderAnalysisResults = () => {
    if (!analysisData) return null;

    console.log('Rendering analysis data:', analysisData);

    // Handle new array-based response structure - use first result
    const firstResult = analysisData.results ? analysisData.results[0] : analysisData;
    
    const {
      symbol,
      currentPrice,
      timestamp,
      decision,
      execution,
      context,
      scenarios,
      risk,
      nextStepSummary,
      whyAvoid,
      flipToReady,
      systems
    } = firstResult;

    const getStatusColor = (status) => {
      switch (status) {
        case 'BUY':
          return 'buy';
        case 'SELL':
          return 'sell';
        case 'HOLD':
          return 'hold';
        case 'AVOID':
          return 'avoid';
        default:
          return 'default';
      }
    };

    const getStatusDisplayText = (status) => {
      switch (status) {
        case 'BUY':
          return 'BUY';
        case 'SELL':
          return 'SELL';
        case 'HOLD':
          return 'HOLD';
        case 'AVOID':
          return 'AVOID';
        default:
          return status?.replace(/_/g, ' ') || 'Unknown';
      }
    };

    const getReasonCodeMessage = (code) => {
      // Handle parameterized codes with regex patterns
      if (code.includes('PRICE_') && code.includes('_BELOW_TREND')) {
        const match = code.match(/PRICE_(\d+)%_BELOW_TREND/);
        const percentage = match ? match[1] : 'X';
        return `🔴 Price is ${percentage}% below trend support - bearish signal`;
      }

      if (code.includes('VOLUME_') && code.includes('_OF_AVERAGE')) {
        const match = code.match(/VOLUME_(\d+)%_OF_AVERAGE/);
        const percentage = match ? match[1] : 'X';
        return `🔴 Volume only ${percentage}% of average - weak participation`;
      }

      if (code.includes('RISK_REWARD_') && code.includes('_TOO_LOW')) {
        const match = code.match(/RISK_REWARD_(\d+\.?\d*)%_TOO_LOW/);
        const percentage = match ? match[1] : 'X';
        return `🔴 Risk/reward ratio ${percentage}% too low (minimum 2.0 required)`;
      }

      if (code.includes('SIGNAL_GRADE_')) {
        const match = code.match(/SIGNAL_GRADE_([A-F][+-]?)/);
        const grade = match ? match[1] : 'X';
        return `🔴 Technical signal quality grade ${grade} - below minimum standard`;
      }

      if (code.includes('CONFIDENCE_') && code.includes('_LOW')) {
        const match = code.match(/CONFIDENCE_(\d+)%_LOW/);
        const percentage = match ? match[1] : 'X';
        return `🔴 AI confidence only ${percentage}% - below 80% threshold`;
      }

      if (code.includes('EARNINGS_IN_') && code.includes('_DAYS')) {
        const match = code.match(/EARNINGS_IN_(\d+)_DAYS/);
        const days = match ? match[1] : 'X';
        return `🔴 Earnings announcement in ${days} days - event risk present`;
      }

      if (code.includes('OVERHEAD_RESISTANCE_') && code.includes('_AWAY')) {
        const match = code.match(/OVERHEAD_RESISTANCE_(\d+)%_AWAY/);
        const percentage = match ? match[1] : 'X';
        return `🔴 Strong resistance only ${percentage}% away - limited upside`;
      }

      if (code.includes('STRONG_VOLUME_') && code.includes('_AVERAGE')) {
        const match = code.match(/STRONG_VOLUME_(\d+)%_AVERAGE/);
        const percentage = match ? match[1] : 'X';
        return `🟢 Strong volume at ${percentage}% of average - good participation`;
      }

      if (code.includes('HIGH_QUALITY_GRADE_')) {
        const match = code.match(/HIGH_QUALITY_GRADE_([A-F][+-]?)/);
        const grade = match ? match[1] : 'X';
        return `🟢 High quality technical setup - Grade ${grade}`;
      }

      if (code.includes('EXCELLENT_RISK_REWARD_')) {
        const match = code.match(/EXCELLENT_RISK_REWARD_(\d+\.?\d*)%/);
        const percentage = match ? match[1] : 'X';
        return `🟢 Excellent risk/reward ratio ${percentage}% (≥3.0)`;
      }

      if (code.includes('HIGH_CONFIDENCE_')) {
        const match = code.match(/HIGH_CONFIDENCE_(\d+)%/);
        const percentage = match ? match[1] : 'X';
        return `🟢 High AI confidence ${percentage}% (≥80%)`;
      }

      // Static reason codes
      switch (code) {
        case 'PRICE_BELOW_200EMA':
          return '🔴 Price below 200 EMA - bearish long-term trend';
        case 'PRICE_ABOVE_200EMA':
          return '🟢 Price above 200 EMA - bullish trend confirmed';
        case 'ANALYSIS_COMPLETE':
          return '✅ Analysis completed successfully';
        default:
          return `📊 ${code.replace(/_/g, ' ').toLowerCase()}`;
      }
    };

    return (
      <div className={styles.analysisResults}>
        {/* Compact Header */}
        <div className={styles.resultHeader}>
          <div className={styles.stockInfo}>
            <h2 className={styles.stockSymbol}>{symbol || selectedTicker}</h2>
            <div className={styles.stockMeta}>
              <span className={styles.currentPrice}>${currentPrice}</span>
              <span className={styles.analysisTime}>
                {timestamp ? new Date(timestamp).toLocaleDateString() : 'Today'}
              </span>
            </div>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className={styles.metricsGrid}>
          {decision && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}>🎯</span>
                <span className={styles.metricLabel}>Decision</span>
              </div>
              <div className={`${styles.metricValue} ${styles[getStatusColor(decision.action)]}`}>
                {getStatusDisplayText(decision.action)}
              </div>
              <div className={styles.metricSubtext}>
                Grade: {decision.grade || 'N/A'} • {decision.confidence ? `${decision.confidence}%` : 'N/A'} confidence
              </div>
            </div>
          )}

          {execution && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}>📈</span>
                <span className={styles.metricLabel}>Entry</span>
              </div>
              <div className={styles.metricValue}>${execution.entry}</div>
              <div className={styles.metricSubtext}>
                Stop: ${execution.stop} • Target: ${execution.target1}
              </div>
            </div>
          )}

          {execution?.riskReward && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}>⚖️</span>
                <span className={styles.metricLabel}>Risk/Reward</span>
              </div>
              <div className={styles.metricValue}>{execution.riskReward.toFixed(2)}</div>
              <div className={styles.metricSubtext}>
                Position: {execution.positionSize?.shares || 'N/A'} shares
              </div>
            </div>
          )}

          {risk && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}>🛡️</span>
                <span className={styles.metricLabel}>Risk Level</span>
              </div>
              <div className={`${styles.metricValue} ${styles[risk.level?.toLowerCase()]}`}>
                {risk.level}
              </div>
              <div className={styles.metricSubtext}>
                Max DD: {risk.maxDrawdown || 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Compact Sections */}
        <div className={styles.sectionsContainer}>
          {/* Reasoning */}
          {decision?.reasoning && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🧠</span>
                Analysis Summary
              </h3>
              <div className={styles.sectionContent}>
                <p className={styles.reasoningText}>{decision.reasoning}</p>
              </div>
            </div>
          )}

          {/* Execution Details */}
          {execution && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📊</span>
                Execution Plan
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.executionGrid}>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Entry:</span>
                    <span className={styles.value}>${execution.entry}</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Stop:</span>
                    <span className={styles.value}>${execution.stop}</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Target 1:</span>
                    <span className={styles.value}>${execution.target1}</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Target 2:</span>
                    <span className={styles.value}>${execution.target2}</span>
                  </div>
                  {execution.positionSize && (
                    <>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Shares:</span>
                        <span className={styles.value}>{execution.positionSize.shares?.toLocaleString()}</span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Total Value:</span>
                        <span className={styles.value}>${execution.positionSize.value?.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Market Context */}
          {context && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🌐</span>
                Market Context
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.contextGrid}>
                  <div className={styles.contextItem}>
                    <span className={styles.label}>Trend:</span>
                    <span className={`${styles.value} ${styles[context.trend?.toLowerCase()]}`}>
                      {context.trend}
                    </span>
                  </div>
                  {context.levels && (
                    <>
                      <div className={styles.contextItem}>
                        <span className={styles.label}>Support:</span>
                        <span className={styles.value}>${context.levels.support}</span>
                      </div>
                      <div className={styles.contextItem}>
                        <span className={styles.label}>Resistance:</span>
                        <span className={styles.value}>${context.levels.resistance}</span>
                      </div>
                    </>
                  )}
                  {context.volume && (
                    <div className={styles.contextItem}>
                      <span className={styles.label}>Volume:</span>
                      <span className={styles.value}>{context.volume.status} ({context.volume.multiple}x)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          {risk && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>⚠️</span>
                Risk Assessment
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.riskGrid}>
                  <div className={styles.riskItem}>
                    <span className={styles.label}>Risk Level:</span>
                    <span className={`${styles.value} ${styles[risk.level?.toLowerCase()]}`}>
                      {risk.level}
                    </span>
                  </div>
                  {risk.tailRiskScore && (
                    <div className={styles.riskItem}>
                      <span className={styles.label}>Tail Risk:</span>
                      <span className={styles.value}>{risk.tailRiskScore}</span>
                    </div>
                  )}
                  {risk.maxDrawdown && (
                    <div className={styles.riskItem}>
                      <span className={styles.label}>Max Drawdown:</span>
                      <span className={styles.value}>{risk.maxDrawdown}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          {nextStepSummary && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🚀</span>
                Next Steps
              </h3>
              <div className={styles.sectionContent}>
                <p className={styles.nextStepsText}>{nextStepSummary}</p>
              </div>
            </div>
          )}

          {/* Why Avoid */}
          {whyAvoid && Array.isArray(whyAvoid) && whyAvoid.length > 0 && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🚫</span>
                Why Avoid
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.reasonsList}>
                  {whyAvoid.slice(0, 3).map((reason, index) => (
                    <div key={index} className={styles.reasonItem}>
                      {typeof reason === 'string' ? reason : JSON.stringify(reason)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Systems Analysis - Collapsed by default */}
          {systems && Object.keys(systems).length > 0 && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🤖</span>
                Systems Analysis ({Object.keys(systems).length} systems)
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.systemsSummary}>
                  {Object.entries(systems).slice(0, 3).map(([systemKey, system]) => (
                    <div key={systemKey} className={styles.systemItem}>
                      <div className={styles.systemHeader}>
                        <span className={styles.systemName}>{system.systemName || systemKey}</span>
                        <span className={`${styles.systemDecision} ${styles[getStatusColor(system.decision)]}`}>
                          {getStatusDisplayText(system.decision)}
                        </span>
                      </div>
                      {system.grade && (
                        <div className={styles.systemMeta}>
                          Grade: {system.grade} • 
                          {system.confidence && ` ${Math.round((typeof system.confidence === 'number' ? system.confidence : parseFloat(system.confidence)) * 100)}% confidence`}
                        </div>
                      )}
                    </div>
                  ))}
                  {Object.keys(systems).length > 3 && (
                    <div className={styles.moreSystems}>
                      +{Object.keys(systems).length - 3} more systems...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Scenarios Planning */}
          {scenarios && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎯</span>
                Scenario Planning
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.contextGrid}>
                  {scenarios.breakout && (
                    <div className={styles.contextItem}>
                      <span className={styles.label}>Breakout (${scenarios.breakout.trigger}):</span>
                      <span className={styles.value}>{scenarios.breakout.probability}% → ${scenarios.breakout.target}</span>
                    </div>
                  )}
                  {scenarios.breakdown && (
                    <div className={styles.contextItem}>
                      <span className={styles.label}>Breakdown (${scenarios.breakdown.trigger}):</span>
                      <span className={styles.value}>{scenarios.breakdown.probability}% → ${scenarios.breakdown.target}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Stock Analysis</h1>
        <div className={styles.searchContainer}>
          <TickerSearch
            value={selectedTicker}
            onChange={handleTickerChange}
            onSelect={handleTickerSelect}
            placeholder="Search for stocks (e.g., AAPL, GOOGL)..."
          />
        </div>
      </div>

      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <span>Analyzing {selectedTicker}...</span>
        </div>
      )}

      {error && (
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <div className={styles.errorContent}>
            <h3>Analysis Error</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)} className={styles.dismissBtn}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {renderAnalysisResults()}
    </div>
  );
};

export default TickerAnalysis;
