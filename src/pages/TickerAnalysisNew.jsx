import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TickerSearch from '../components/TickerSearch';
import { getUnifiedAnalysis } from '../api/analysisApi';
import styles from './TickerAnalysis.module.css';

const TickerAnalysis = () => {
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
                <div className={styles.mainDecisionCard}>
                  <div className={styles.decisionTitle}>Market Action</div>
                  <div className={`${styles.statusBadge} ${styles[getStatusColor(decision.action)]}`}>
                    {getStatusDisplayText(decision.action)}
                  </div>
                </div>
              </div>
                
              <div className={styles.decisionMetrics}>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Grade</div>
                  <div className={styles.metricValue}>{decision.grade || 'N/A'}</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Confidence</div>
                  <div className={styles.metricValue}>{decision.confidence ? `${decision.confidence}%` : 'N/A'}</div>
                </div>
                <div className={styles.metricCard}>
                  <div className={styles.metricLabel}>Agreement</div>
                  <div className={styles.metricValue}>{decision.systemsAgreement || 'N/A'}</div>
                  <div className={styles.metricSubtext}>{decision.systemsAnalyzed || 0} systems</div>
                </div>
              </div>

              {/* Overall Reasoning */}
              {decision.reasoning && typeof decision.reasoning === 'string' && (
                <div className={styles.overallReasoning}>
                  <h4>🎯 Overall Analysis:</h4>
                  <div className={styles.reasoningText}>
                    {decision.reasoning}
                  </div>
                </div>
              )}

              {/* Why Avoid & Flip Conditions */}
              {whyAvoid && Array.isArray(whyAvoid) && whyAvoid.length > 0 && (
                <div className={styles.avoidReasons}>
                  <h4>⚠️ Why Avoid:</h4>
                  <div className={styles.reasonsList}>
                    {whyAvoid.map((reason, index) => (
                      <div key={index} className={styles.reasonItem}>
                        {typeof reason === 'string' ? 
                          (getReasonCodeMessage ? getReasonCodeMessage(reason) : reason) : 
                          JSON.stringify(reason)
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {flipToReady && Array.isArray(flipToReady) && flipToReady.length > 0 && (
                <div className={styles.flipConditions}>
                  <h4>🔄 Conditions to Become Ready:</h4>
                  <div className={styles.conditionsList}>
                    {flipToReady.map((condition, index) => (
                      <div key={index} className={styles.conditionItem}>
                        {typeof condition === 'string' ? condition : JSON.stringify(condition)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Next Steps */}
              {nextStepSummary && typeof nextStepSummary === 'string' && (
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
              {/* Price Levels Card */}
              <div className={styles.executionCard}>
                <h4 className={styles.executionCardTitle}>🎯 Price Levels</h4>
                <div className={styles.priceGrid}>
                  <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>Entry Price</div>
                    <div className={`${styles.priceValue} ${styles.entryPrice}`}>${execution.entry}</div>
                  </div>
                  <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>Stop Loss</div>
                    <div className={`${styles.priceValue} ${styles.stopLoss}`}>${execution.stop}</div>
                  </div>
                  <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>Target 1</div>
                    <div className={`${styles.priceValue} ${styles.target1}`}>${execution.target1}</div>
                  </div>
                  <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>Target 2</div>
                    <div className={`${styles.priceValue} ${styles.target2}`}>${execution.target2}</div>
                  </div>
                  <div className={styles.priceCard}>
                    <div className={styles.priceLabel}>Risk/Reward</div>
                    <div className={`${styles.priceValue} ${styles.riskReward}`}>{execution.riskReward?.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Position Sizing Card */}
              {execution.positionSize && (
                <div className={styles.executionCard}>
                  <h4 className={styles.executionCardTitle}>📊 Position Sizing</h4>
                  <div className={styles.positionGrid}>
                    <div className={styles.positionCard}>
                      <div className={styles.positionIcon}>📈</div>
                      <div className={styles.positionContent}>
                        <div className={styles.positionLabel}>Shares</div>
                        <div className={styles.positionValue}>{execution.positionSize.shares.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className={styles.positionCard}>
                      <div className={styles.positionIcon}>💰</div>
                      <div className={styles.positionContent}>
                        <div className={styles.positionLabel}>Total Value</div>
                        <div className={styles.positionValue}>${execution.positionSize.value?.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className={styles.positionCard}>
                      <div className={styles.positionIcon}>⚖️</div>
                      <div className={styles.positionContent}>
                        <div className={styles.positionLabel}>Risk Level</div>
                        <div className={styles.positionValue}>{execution.positionSize.risk}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk Assessment */}
        {risk && (
          <div className={styles.section}>
            <h3>⚖️ Risk Assessment</h3>
            <div className={styles.riskAssessment}>
              <div className={styles.riskCard}>
                <div className={styles.riskHeader}>
                  <div className={styles.riskIcon}>🛡️</div>
                  <h4>Risk Metrics</h4>
                </div>
                <div className={styles.riskMetricsGrid}>
                  <div className={styles.riskMetricCard}>
                    <div className={styles.riskMetricIcon}>📊</div>
                    <div className={styles.riskMetricContent}>
                      <div className={styles.riskMetricLabel}>Risk Level</div>
                      <div className={`${styles.riskMetricValue} ${styles.riskLevel} ${styles[risk.level?.toLowerCase()]}`}>
                        {risk.level}
                      </div>
                    </div>
                  </div>
                  <div className={styles.riskMetricCard}>
                    <div className={styles.riskMetricIcon}>⚡</div>
                    <div className={styles.riskMetricContent}>
                      <div className={styles.riskMetricLabel}>Tail Risk Score</div>
                      <div className={styles.riskMetricValue}>{risk.tailRiskScore}</div>
                    </div>
                  </div>
                  <div className={styles.riskMetricCard}>
                    <div className={styles.riskMetricIcon}>📉</div>
                    <div className={styles.riskMetricContent}>
                      <div className={styles.riskMetricLabel}>Max Drawdown</div>
                      <div className={styles.riskMetricValue}>{risk.maxDrawdown}</div>
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
                  <div className={styles.contextCardHeader}>
                    <div className={styles.contextIcon}>📈</div>
                    <h4>Trend Analysis</h4>
                  </div>
                  <div className={styles.contextContent}>
                    <div className={styles.contextItem}>
                      <span className={styles.contextLabel}>Current Trend</span>
                      <span className={`${styles.contextValue} ${styles.trend} ${styles[context.trend?.toLowerCase()]}`}>
                        {context.trend}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={styles.contextCard}>
                  <div className={styles.contextCardHeader}>
                    <div className={styles.contextIcon}>🎯</div>
                    <h4>Key Levels</h4>
                  </div>
                  <div className={styles.contextContent}>
                    <div className={styles.contextItem}>
                      <span className={styles.contextLabel}>Support</span>
                      <span className={`${styles.contextValue} ${styles.support}`}>${context.levels?.support}</span>
                    </div>
                    <div className={styles.contextItem}>
                      <span className={styles.contextLabel}>Resistance</span>
                      <span className={`${styles.contextValue} ${styles.resistance}`}>${context.levels?.resistance}</span>
                    </div>
                  </div>
                </div>

                {context.volume && (
                  <div className={styles.contextCard}>
                    <div className={styles.contextCardHeader}>
                      <div className={styles.contextIcon}>📊</div>
                      <h4>Volume Analysis</h4>
                    </div>
                    <div className={styles.contextContent}>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Status</span>
                        <span className={`${styles.contextValue} ${styles.volume} ${styles[context.volume.status?.toLowerCase()]}`}>
                          {context.volume.status}
                        </span>
                      </div>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Multiple</span>
                        <span className={styles.contextValue}>{context.volume.multiple}x</span>
                      </div>
                    </div>
                  </div>
                )}

                {context.earnings && (
                  <div className={styles.contextCard}>
                    <div className={styles.contextCardHeader}>
                      <div className={styles.contextIcon}>📅</div>
                      <h4>Earnings</h4>
                    </div>
                    <div className={styles.contextContent}>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Days Away</span>
                        <span className={styles.contextValue}>{context.earnings.daysAway || 'N/A'}</span>
                      </div>
                      <div className={styles.contextItem}>
                        <span className={styles.contextLabel}>Impact</span>
                        <span className={`${styles.contextValue} ${styles.earningsImpact}`}>
                          {context.earnings.impact}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Individual Systems Analysis */}
        {systems && (
          <div className={styles.section}>
            <h3>🔍 Systems Analysis Breakdown</h3>
            <div className={styles.systemsAnalysis}>
              <div className={styles.systemsGrid}>
                {Object.entries(systems).map(([systemKey, system]) => (
                  <div key={systemKey} className={styles.systemCard}>
                    <div className={styles.systemHeader}>
                      <div className={styles.systemName}>
                        <span className={styles.systemIcon}>🤖</span>
                        {system.systemName || systemKey}
                      </div>
                      <div className={styles.systemBadges}>
                        <div className={`${styles.systemDecision} ${styles[getStatusColor(system.decision)]}`}>
                          {getStatusDisplayText(system.decision)}
                        </div>
                        {system.grade && (
                          <div className={styles.systemGrade}>
                            Grade: {system.grade}
                          </div>
                        )}
                        {system.confidence && (
                          <div className={styles.systemConfidence}>
                            {Math.round((typeof system.confidence === 'number' ? system.confidence : parseFloat(system.confidence)) * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className={styles.systemContent}>
                      {/* System Reasoning */}
                      {system.reasoning && Array.isArray(system.reasoning) && system.reasoning.length > 0 && (
                        <div className={styles.systemReasoning}>
                          <h5>📋 Analysis:</h5>
                          <ul className={styles.reasoningList}>
                            {system.reasoning.map((reason, idx) => (
                              <li key={idx}>{typeof reason === 'string' ? reason : JSON.stringify(reason)}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Handle string reasoning */}
                      {system.reasoning && typeof system.reasoning === 'string' && (
                        <div className={styles.systemReasoning}>
                          <h5>📋 Analysis:</h5>
                          <div className={styles.reasoningText}>
                            {system.reasoning}
                          </div>
                        </div>
                      )}

                      {/* Risk/Reward if available */}
                      {system.riskReward && typeof system.riskReward === 'object' && (system.riskReward.stopLoss || system.riskReward.target1) && (
                        <div className={styles.systemRiskReward}>
                          <h5>⚖️ Risk/Reward:</h5>
                          <div className={styles.riskRewardGrid}>
                            {system.riskReward.stopLoss && (
                              <div className={styles.rrItem}>
                                <span>Stop Loss:</span>
                                <span>${system.riskReward.stopLoss}</span>
                              </div>
                            )}
                            {system.riskReward.target1 && (
                              <div className={styles.rrItem}>
                                <span>Target 1:</span>
                                <span>${system.riskReward.target1}</span>
                              </div>
                            )}
                            {system.riskReward.riskReward && system.riskReward.riskReward > 0 && (
                              <div className={styles.rrItem}>
                                <span>R:R Ratio:</span>
                                <span>{parseFloat(system.riskReward.riskReward).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Execution Plan if available */}
                      {system.executionPlan && typeof system.executionPlan === 'object' && system.executionPlan.action && (
                        <div className={styles.systemExecution}>
                          <h5>🎯 Execution Plan:</h5>
                          <div className={styles.executionDetails}>
                            <div className={styles.executionItem}>
                              <span>Action:</span>
                              <span className={`${styles.executionAction} ${styles[getStatusColor(system.executionPlan.action)]}`}>
                                {system.executionPlan.action}
                              </span>
                            </div>
                            {system.executionPlan.entryStrategy && (
                              <div className={styles.executionItem}>
                                <span>Entry Strategy:</span>
                                <div>
                                  {typeof system.executionPlan.entryStrategy === 'string' ? (
                                    <span>{system.executionPlan.entryStrategy}</span>
                                  ) : (
                                    <div>
                                      {system.executionPlan.entryStrategy.type && (
                                        <div><strong>Type:</strong> {system.executionPlan.entryStrategy.type}</div>
                                      )}
                                      {system.executionPlan.entryStrategy.method && (
                                        <div><strong>Method:</strong> {system.executionPlan.entryStrategy.method}</div>
                                      )}
                                      {system.executionPlan.entryStrategy.conditions && Array.isArray(system.executionPlan.entryStrategy.conditions) && (
                                        <div>
                                          <strong>Conditions:</strong>
                                          <ul>
                                            {system.executionPlan.entryStrategy.conditions.map((condition, idx) => (
                                              <li key={idx}>{typeof condition === 'string' ? condition : JSON.stringify(condition)}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {system.executionPlan.exitStrategy && (
                              <div className={styles.executionItem}>
                                <span>Exit Strategy:</span>
                                <span>
                                  {typeof system.executionPlan.exitStrategy === 'string' 
                                    ? system.executionPlan.exitStrategy 
                                    : JSON.stringify(system.executionPlan.exitStrategy)
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
