import React, { useState } from 'react';
import TickerSearch from '../components/TickerSearch';
import { getUnifiedAnalysis } from '../api/analysisApi';
import styles from './TickerAnalysis.module.css';

const TickerAnalysis = () => {
  const [selectedTicker, setSelectedTicker] = useState('');
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

    // Updated API response structure
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
      flipToReady
    } = analysisData;

    const getStatusColor = (status) => {
      switch (status) {
        case 'BUY':
          return 'buy';
        case 'SELL':
          return 'sell';
        case 'HOLD':
          return 'hold';
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
        <div className={styles.header}>
          <h2>Analysis Results for {symbol || selectedTicker}</h2>
          <div className={styles.timestamp}>
            Generated: {timestamp ? new Date(timestamp).toLocaleString() : new Date().toLocaleString()}
          </div>
          <div className={styles.engineInfo}>
            Current Price: ${currentPrice} | Analysis Date: {timestamp ? new Date(timestamp).toLocaleDateString() : 'Today'}
          </div>
        </div>

        {/* Decision & Status */}
        {decision && (
          <div className={styles.section}>
            <h3>🎯 Trading Decision</h3>
            <div className={styles.tradingDecision}>
              <div className={styles.decisionHeader}>
                <div className={styles.badgeGroup}>
                  <div className={styles.badgeLabel}>Status</div>
                  <div className={`${styles.statusBadge} ${styles[getStatusColor(decision.status)]}`}>
                    {getStatusDisplayText(decision.status)}
                  </div>
                </div>
                <div className={styles.badgeGroup}>
                  <div className={styles.badgeLabel}>Grade</div>
                  <div className={styles.gradeBadge}>Grade: {decision.grade}</div>
                </div>
                <div className={styles.badgeGroup}>
                  <div className={styles.badgeLabel}>Confidence</div>
                  <div className={styles.confidenceBadge}>{decision.confidence}% Confidence</div>
                </div>
              </div>

              {/* Key Factors List - displayed below badges */}
              {decision.reasonCodes && decision.reasonCodes.length > 0 && (
                <div className={styles.keyFactors}>
                  <h4>📊 Key Analysis Factors:</h4>
                  <div className={styles.reasonCodesContainer}>
                    {decision.reasonCodes.map((code, index) => (
                      <div key={index} className={styles.reasonCodeItem}>
                        {getReasonCodeMessage(code)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Why Avoid & Flip Conditions */}
              {whyAvoid && whyAvoid.length > 0 && (
                <div className={styles.avoidReasons}>
                  <h4>⚠️ Why Avoid:</h4>
                  <div className={styles.reasonsList}>
                    {whyAvoid.map((reason, index) => (
                      <div key={index} className={styles.reasonItem}>
                        {getReasonCodeMessage(reason)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {flipToReady && flipToReady.length > 0 && (
                <div className={styles.flipConditions}>
                  <h4>🔄 Conditions to Become Ready:</h4>
                  <div className={styles.conditionsList}>
                    {flipToReady.map((condition, index) => (
                      <div key={index} className={styles.conditionItem}>
                        {condition}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {nextStepSummary && (
                <div className={styles.nextSteps} style={{ marginTop: 32 }}>
                  <h4 style={{ marginBottom: 8 }}>🚀 Next Steps</h4>
                  <div className={styles.nextStepSummary}>
                    {nextStepSummary}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}



        {/* Execution Plan */}
        {execution && (
          <div className={styles.section}>
            <h3>📈 Execution Plan</h3>
            <div className={styles.executionPlan}>
              <div className={styles.priceActions}>
                <div className={styles.priceItem}>
                  <span>Entry Price:</span>
                  <span className={styles.entryPrice}>${execution.entry}</span>
                </div>
                <div className={styles.priceItem}>
                  <span>Stop Loss:</span>
                  <span className={styles.stopLoss}>${execution.stop}</span>
                </div>
                <div className={styles.priceItem}>
                  <span>Risk/Reward:</span>
                  <span className={styles.riskReward}>{execution.riskReward?.toFixed(2)}</span>
                </div>
                <div className={styles.priceItem}>
                    <span>Target 1:</span>
                    <span className={styles.target1}>${execution.target1}</span>
                </div>
                <div className={styles.priceItem}>
                    <span>Target 2:</span>
                    <span className={styles.target2}>${execution.target2}</span>
                </div>
              </div>
            </div>
            {execution.positionSize && (
                <div className={styles.positionSizing}>
                  <h4>Position Sizing</h4>
                  <div className={styles.positionMetrics}>
                    <div className={styles.metric}>
                      <span>Shares:</span>
                      <span>{execution.positionSize.shares}</span>
                    </div>
                    <div className={styles.metric}>
                      <span>Value:</span>
                      <span>${execution.positionSize.value?.toLocaleString()}</span>
                    </div>
                    <div className={styles.metric}>
                      <span>Risk:</span>
                      <span>{execution.positionSize.risk}</span>
                    </div>
                  </div>
                </div>
              )}
          </div>
        )}

        {/* Risk Assessment */}
        {risk && (
          <div className={styles.section}>
            <h3>⚖️ Risk Assessment</h3>
            <div className={styles.riskAssessment}>
              <div className={styles.riskGrid}>
                <div className={styles.riskCard}>
                  <h4>Risk Metrics</h4>
                  <div className={styles.riskMetrics}>
                    <div className={styles.metric}>
                      <span>Risk Level:</span>
                      <span className={`${styles.riskLevel} ${styles[risk.level?.toLowerCase()]}`}>
                        {risk.level}
                      </span>
                    </div>
                    <div className={styles.metric}>
                      <span>Tail Risk Score:</span>
                      <span>{risk.tailRiskScore}</span>
                    </div>
                    <div className={styles.metric}>
                      <span>Max Drawdown:</span>
                      <span>{risk.maxDrawdown}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Market Context */}
        {context && (
          <div className={styles.section}>
            <h3>🌐 Market Context</h3>
            <div className={styles.marketContext}>
              <div className={styles.contextGrid}>
                <div className={styles.contextCard}>
                  <h4>Trend Analysis</h4>
                  <div className={styles.contextItem}>
                    <span>Trend:</span>
                    <span className={`${styles.trend} ${styles[context.trend?.toLowerCase()]}`}>
                      {context.trend}
                    </span>
                  </div>
                </div>

                <div className={styles.contextCard}>
                  <h4>Key Levels</h4>
                  <div className={styles.contextItem}>
                    <span>Support:</span>
                    <span className={styles.support}>${context.levels?.support}</span>
                  </div>
                  <div className={styles.contextItem}>
                    <span>Resistance:</span>
                    <span className={styles.resistance}>${context.levels?.resistance}</span>
                  </div>
                </div>

                {context.volume && (
                  <div className={styles.contextCard}>
                    <h4>Volume Analysis</h4>
                    <div className={styles.contextItem}>
                      <span>Status:</span>
                      <span className={`${styles.volume} ${styles[context.volume.status?.toLowerCase()]}`}>
                        {context.volume.status}
                      </span>
                    </div>
                    <div className={styles.contextItem}>
                      <span>Multiple:</span>
                      <span>{context.volume.multiple}x</span>
                    </div>
                  </div>
                )}

                {context.earnings && (
                  <div className={styles.contextCard}>
                    <h4>Earnings</h4>
                    <div className={styles.contextItem}>
                      <span>Days Away:</span>
                      <span>{context.earnings.daysAway || 'N/A'}</span>
                    </div>
                    <div className={styles.contextItem}>
                      <span>Impact:</span>
                      <span className={styles.earningsImpact}>
                        {context.earnings.impact}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Scenario Planning */}
        {scenarios && (
          <div className={styles.section}>
            <h3>🎯 Scenario Planning</h3>
            <div className={styles.scenarioPlanning}>
              {scenarios.breakout && (
                <div className={styles.scenarioCard}>
                  <h4>📈 Breakout Scenario</h4>
                  <div className={styles.scenarioDetails}>
                    <div className={styles.scenarioMetrics}>
                      <div className={styles.metric}>
                        <span>Trigger:</span>
                        <span>${scenarios.breakout.trigger}</span>
                      </div>
                      <div className={styles.metric}>
                        <span>Probability:</span>
                        <span>{scenarios.breakout.probability}%</span>
                      </div>
                      <div className={styles.metric}>
                        <span>Target:</span>
                        <span>${scenarios.breakout.target}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {scenarios.breakdown && (
                <div className={styles.scenarioCard}>
                  <h4>📉 Breakdown Scenario</h4>
                  <div className={styles.scenarioDetails}>
                    <div className={styles.scenarioMetrics}>
                      <div className={styles.metric}>
                        <span>Trigger:</span>
                        <span>${scenarios.breakdown.trigger}</span>
                      </div>
                      <div className={styles.metric}>
                        <span>Probability:</span>
                        <span>{scenarios.breakdown.probability}%</span>
                      </div>
                      <div className={styles.metric}>
                        <span>Target:</span>
                        <span>${scenarios.breakdown.target}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchSection}>
        <h1>Stock Analysis</h1>
        <p>Search for a stock ticker to get comprehensive AI-powered analysis</p>

        <div className={styles.searchContainer}>
          <TickerSearch
            value={selectedTicker}
            onChange={handleTickerChange}
            onSelect={handleTickerSelect}
            placeholder="Search for stocks (e.g., AAPL, GOOGL, TSLA)..."
          />
        </div>
      </div>

      {loading && (
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Analyzing {selectedTicker}...</p>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <h3>Analysis Error</h3>
          <p>{error}</p>
          <button onClick={() => setError(null)} className={styles.retryButton}>
            Dismiss
          </button>
        </div>
      )}

      {renderAnalysisResults()}
    </div>
  );
};

export default TickerAnalysis;
