import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import TickerSearch from '../components/TickerSearch';
import { getUnifiedAnalysis } from '../api/analysisApi';
import { useTheme } from '../contexts/ThemeContext';
import styles from './TickerAnalysis.module.css';
import LightweightChart from '../components/LightweightChart';

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
      const result = response.result ? response.result : response;
      setAnalysisData(result);
      // Save to localStorage for recent searches
      if (result && result.symbol) {
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
    const result = analysisData.result ? analysisData.result : analysisData;
    
    const {
      symbol,
      currentPrice,
      timestamp,
      decision,
      execution,
      scenarios,
      risk,
      nextStepSummary,
      whyAvoid,
      systems
    } = result;

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
          return status?.replace?.(/_/g, ' ') || 'Unknown';
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
                {decision.winningSystem ? decision.winningSystem.substring(0, 30) + '...' : 'System'}: {decision.grade || 'N/A'} • {decision.confidence || 'N/A'}% confidence
              </div>
            </div>
          )}

          {execution && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}>📈</span>
                <span className={styles.metricLabel}>Entry Zone</span>
              </div>
              <div className={styles.metricValue}>
                ${execution.entryStrategy?.entryZone?.optimal?.toFixed(2) || execution.entry?.anticipatedEntry || execution.entry?.triggerLevel || 'N/A'}
              </div>
              <div className={styles.metricSubtext}>
                Stop: ${execution.exitStrategy?.stopLoss?.initial || execution.exit?.stopLoss || 'N/A'} • 
                Target: ${execution.exitStrategy?.targets?.conservative?.toFixed(2) || execution.exit?.targets?.[0] || 'N/A'}
              </div>
            </div>
          )}

          {execution?.positionSizing && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}>⚖️</span>
                <span className={styles.metricLabel}>Risk/Reward</span>
              </div>
              <div className={styles.metricValue}>{execution.positionSizing.riskReward || 'N/A'}</div>
              <div className={styles.metricSubtext}>
                Position: {execution.positionSizing.shares?.toLocaleString() || 'N/A'} shares
              </div>
            </div>
          )}

          {execution?.positionSizing && (
            <div className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon}>🛡️</span>
                <span className={styles.metricLabel}>Risk Level</span>
              </div>
              <div className={`${styles.metricValue} ${execution.positionSizing.recommendation ? styles[execution.positionSizing.recommendation.toLowerCase()] || styles.default : styles.default}`}>
                {execution.positionSizing.recommendation || 'NORMAL'}
              </div>
              <div className={styles.metricSubtext}>
                Risk: {execution.positionSizing.riskPercent || 'N/A'}%
              </div>
            </div>
          )}
        </div>

        {/* Compact Sections */}
        <div className={styles.sectionsContainer}>
          {/* Decision Summary */}
          {decision && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🧠</span>
                Decision Analysis
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.executionGrid}>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Action:</span>
                    <span className={`${styles.value} ${styles[getStatusColor(decision.action)]}`}>
                      {getStatusDisplayText(decision.action)}
                    </span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Winning System:</span>
                    <span className={styles.value} title={decision.winningSystem}>
                      {decision.winningSystem ? decision.winningSystem.substring(0, 40) + '...' : 'N/A'}
                    </span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Systems Agreement:</span>
                    <span className={styles.value}>{decision.systemsAgreement || 'N/A'}</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Confidence:</span>
                    <span className={styles.value}>{decision.confidence || 'N/A'}%</span>
                  </div>
                </div>
                {decision.reasoning && (
                  <div style={{ marginTop: '12px' }}>
                    <p className={styles.reasoningText}>{decision.reasoning}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Entry Strategy */}
          {execution?.entryStrategy && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🚀</span>
                Entry Strategy
              </h3>
              <div className={styles.sectionContent}>
                {/* Entry Zone */}
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                    Entry Zone & Timing
                  </h4>
                  <div className={styles.executionGrid}>
                    <div className={styles.executionItem}>
                      <span className={styles.label}>Optimal Entry:</span>
                      <span className={styles.value} style={{ color: 'var(--status-success)' }}>
                        ${execution.entryStrategy.entryZone?.optimal?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className={styles.executionItem}>
                      <span className={styles.label}>Acceptable Range:</span>
                      <span className={styles.value}>
                        ${execution.entryStrategy.entryZone?.acceptable?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className={styles.executionItem}>
                      <span className={styles.label}>Maximum Entry:</span>
                      <span className={styles.value} style={{ color: 'var(--status-warning)' }}>
                        ${execution.entryStrategy.entryZone?.maximum?.toFixed(2) || 'N/A'}
                      </span>
                    </div>
                    <div className={styles.executionItem}>
                      <span className={styles.label}>Strategy Type:</span>
                      <span className={styles.value}>{execution.entryStrategy.type || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Volume Requirements */}
                {execution.entryStrategy.volumeRequirements && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Volume Requirements
                    </h4>
                    <div className={styles.executionGrid}>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Minimum:</span>
                        <span className={styles.value}>
                          {execution.entryStrategy.volumeRequirements.minimum ? 
                            (execution.entryStrategy.volumeRequirements.minimum / 1000000).toFixed(1) + 'M' : 'N/A'}
                        </span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Preferred:</span>
                        <span className={styles.value} style={{ color: 'var(--status-success)' }}>
                          {execution.entryStrategy.volumeRequirements.preferred ? 
                            (execution.entryStrategy.volumeRequirements.preferred / 1000000).toFixed(1) + 'M' : 'N/A'}
                        </span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Explosive:</span>
                        <span className={styles.value} style={{ color: 'var(--status-success)' }}>
                          {execution.entryStrategy.volumeRequirements.explosive ? 
                            (execution.entryStrategy.volumeRequirements.explosive / 1000000).toFixed(1) + 'M' : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Trigger Conditions */}
                {execution.entryStrategy.triggerConditions && Array.isArray(execution.entryStrategy.triggerConditions) && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Trigger Conditions
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {execution.entryStrategy.triggerConditions.map((condition, index) => (
                        <div key={index} style={{ 
                          padding: '8px 12px', 
                          border: '1px solid var(--border-light)', 
                          borderRadius: '6px',
                          backgroundColor: condition.met ? 'var(--background-success)' : 'var(--background-warning)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{condition.met ? '✅' : '❌'}</span>
                              <span style={{ fontWeight: '500' }}>{condition.type?.replace(/_/g, ' ') || 'Condition'}</span>
                            </span>
                            <span style={{ 
                              fontSize: '12px', 
                              fontWeight: '600',
                              color: condition.met ? 'var(--status-success)' : 'var(--status-warning)'
                            }}>
                              {condition.met ? 'MET' : 'PENDING'}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            Required: {condition.threshold?.toLocaleString?.() || 'N/A'} | 
                            Current: {condition.current?.toLocaleString?.() || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Windows */}
                {execution.entryStrategy.timeWindows && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Timing Guidelines
                    </h4>
                    <div className={styles.executionGrid}>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Primary Window:</span>
                        <span className={styles.value} style={{ color: 'var(--status-success)' }}>
                          {execution.entryStrategy.timeWindows.primary || 'N/A'}
                        </span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Secondary Window:</span>
                        <span className={styles.value}>
                          {execution.entryStrategy.timeWindows.secondary || 'N/A'}
                        </span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Avoid:</span>
                        <span className={styles.value} style={{ color: 'var(--status-error)' }}>
                          {execution.entryStrategy.timeWindows.avoid || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Exit Strategy */}
          {execution?.exitStrategy && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>🎯</span>
                Exit Strategy
              </h3>
              <div className={styles.sectionContent}>
                {/* Stop Loss Strategy */}
                {execution.exitStrategy.stopLoss && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Stop Loss Strategy
                    </h4>
                    <div className={styles.executionGrid}>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Initial Stop:</span>
                        <span className={styles.value} style={{ color: 'var(--status-error)' }}>
                          ${execution.exitStrategy.stopLoss.initial || 'N/A'}
                        </span>
                      </div>
                      {execution.exitStrategy.stopLoss.trailingActivation && (
                        <div className={styles.executionItem}>
                          <span className={styles.label}>Trailing Activation:</span>
                          <span className={styles.value}>
                            ${execution.exitStrategy.stopLoss.trailingActivation.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {execution.exitStrategy.stopLoss.trailingDistance && (
                        <div className={styles.executionItem}>
                          <span className={styles.label}>Trailing Distance:</span>
                          <span className={styles.value}>
                            ${execution.exitStrategy.stopLoss.trailingDistance}
                          </span>
                        </div>
                      )}
                      {execution.exitStrategy.stopLoss.volatilityAdjusted && (
                        <div className={styles.executionItem}>
                          <span className={styles.label}>Volatility Adjusted:</span>
                          <span className={styles.value}>
                            ${execution.exitStrategy.stopLoss.volatilityAdjusted.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Profit Targets */}
                {execution.exitStrategy.targets && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Profit Targets ({execution.exitStrategy.targets.scalingMethod || 'Scale out method'})
                    </h4>
                    <div className={styles.executionGrid}>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Conservative:</span>
                        <span className={styles.value} style={{ color: 'var(--status-success)' }}>
                          ${execution.exitStrategy.targets.conservative?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Moderate:</span>
                        <span className={styles.value} style={{ color: 'var(--status-success)' }}>
                          ${execution.exitStrategy.targets.moderate?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Aggressive:</span>
                        <span className={styles.value} style={{ color: 'var(--status-success)' }}>
                          ${execution.exitStrategy.targets.aggressive?.toFixed(2) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Time-Based Exits */}
                {execution.exitStrategy.timeBasedExits && (
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                      Time-Based Rules
                    </h4>
                    <div className={styles.executionGrid}>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Max Hold Period:</span>
                        <span className={styles.value}>
                          {execution.exitStrategy.timeBasedExits.maxHoldPeriod || 'N/A'} days
                        </span>
                      </div>
                      <div className={styles.executionItem}>
                        <span className={styles.label}>Review Period:</span>
                        <span className={styles.value}>
                          {execution.exitStrategy.timeBasedExits.reviewPeriod || 'N/A'} days
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Position Sizing */}
          {execution?.positionSizing && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📊</span>
                Position Sizing & Risk
              </h3>
              <div className={styles.sectionContent}>
                <div className={styles.executionGrid}>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Recommendation:</span>
                    <span className={`${styles.value} ${execution.positionSizing.recommendation ? styles[execution.positionSizing.recommendation.toLowerCase()] || styles.default : styles.default}`}>
                      {execution.positionSizing.recommendation || 'NORMAL'}
                    </span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Shares:</span>
                    <span className={styles.value}>{execution.positionSizing.shares?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Position Value:</span>
                    <span className={styles.value}>${execution.positionSizing.positionValue?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Risk Amount:</span>
                    <span className={styles.value}>${execution.positionSizing.riskAmount?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Risk %:</span>
                    <span className={styles.value}>{execution.positionSizing.riskPercent || 'N/A'}%</span>
                  </div>
                  <div className={styles.executionItem}>
                    <span className={styles.label}>Risk/Reward:</span>
                    <span className={styles.value} style={{ 
                      color: execution.positionSizing.riskReward >= 2 ? 'var(--status-success)' : 'var(--status-warning)',
                      fontWeight: '700'
                    }}>
                      {execution.positionSizing.riskReward || 'N/A'}:1
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Execution Notes */}
          {execution?.executionNotes && Array.isArray(execution.executionNotes) && execution.executionNotes.length > 0 && (
            <div className={styles.compactSection}>
              <h3 className={styles.sectionTitle}>
                <span className={styles.sectionIcon}>📝</span>
                Execution Notes
              </h3>
              <div className={styles.sectionContent}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {execution.executionNotes.map((note, index) => (
                    <div key={index} style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '8px',
                      padding: '8px 0',
                      borderBottom: index < execution.executionNotes.length - 1 ? '1px solid var(--border-light)' : 'none'
                    }}>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>•</span>
                      <span style={{ fontSize: '14px', lineHeight: '1.4' }}>{note}</span>
                    </div>
                  ))}
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
                  {Object.entries(systems).slice(0, 5).map(([systemKey, system]) => (
                    <div key={systemKey} className={styles.systemItem}>
                      <div className={styles.systemHeader}>
                        <span className={styles.systemName}>{system.systemName || systemKey}</span>
                        <span className={`${styles.systemDecision} ${styles[getStatusColor(system.decision?.action || system.decision)]}`}>
                          {getStatusDisplayText(system.decision?.action || system.decision)}
                        </span>
                      </div>
                      {(system.decision?.grade || system.grade) && (
                        <div className={styles.systemMeta}>
                          Grade: {system.decision?.grade || system.grade} • 
                          {(system.decision?.confidence || system.confidence) && ` ${Math.round((typeof (system.decision?.confidence || system.confidence) === 'number' ? (system.decision?.confidence || system.confidence) : parseFloat(system.decision?.confidence || system.confidence)) * 100)}% confidence`}
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

  // Get historical OHLCV data from analysisData if available
  let ohlcv = [];
  if (analysisData?.historicalData) {
    ohlcv = analysisData.historicalData;
  }

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

      {analysisData && analysisData.historicalData && analysisData.historicalData.length > 0 && (
        <div style={{ width: '100%', margin: '32px 0 0 0', minHeight: 320 }}>
          <LightweightChart 
            ohlcv={analysisData.historicalData}
            showIndicators={true}
            emaPeriods={[13, 20, 50]}
            showSupertrend={true}
          />
        </div>
      )}
    </div>
  );
};

export default TickerAnalysis;
