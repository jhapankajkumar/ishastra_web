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
      const stocksData = response.stocks || response.data || [];
      const stockData = stocksData.find(s => s.symbol === symbol);
      
      if (!stockData) {
        setError('Stock not found in watchlist');
        return;
      }
      
      setStock(stockData);
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

  const formatCurrency = (value, currency = 'INR') => {
    if (!value || value === 0) return 'N/A';
    const symbol = currency === 'INR' ? '₹' : '$';
    return `${symbol}${value.toFixed(2)}`;
  };

  const formatConfidence = (confidence) => {
    if (confidence === null || confidence === undefined || isNaN(confidence)) {
      return 'N/A';
    }
    return `${Math.round(confidence)}%`;
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

  return (
    <div className={styles.container} style={{ padding: '12px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header with back button */}
      <div className={styles.header} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button 
          onClick={() => navigate('/watchlist')} 
          className={styles.backButton}
          style={{ 
            padding: '6px 12px', 
            fontSize: '14px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back to Watchlist
        </button>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>{stock.symbol} - Detailed Analysis</h1>
      </div>

      {/* Stock Overview */}
      <div className={styles.overview} style={{ 
        background: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '16px' 
      }}>
        <div className={styles.overviewMain} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div className={styles.stockTitle}>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700' }}>{stock.symbol}</h2>
            <div className={styles.badges} style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <span className={`${styles.decisionBadge} ${getDecisionBadgeClass(stock.decision?.action)}`} style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                textTransform: 'uppercase',
                background: stock.decision?.action === 'BUY' ? '#22c55e' : '#6b7280',
                color: 'white'
              }}>
                {stock.decision?.action || 'N/A'}
              </span>
              <span className={`${styles.gradeBadge} ${getGradeBadgeClass(stock.decision?.grade)}`} style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                background: '#3b82f6',
                color: 'white'
              }}>
                Grade {stock.decision?.grade || 'N/A'}
              </span>
              <span className={styles.priorityBadge} style={{
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: '600',
                background: '#8b5cf6',
                color: 'white'
              }}>
                Priority {stock.priority || 1}
              </span>
            </div>
          </div>
          <div className={styles.stockPrice} style={{ textAlign: 'right' }}>
            <span className={styles.price} style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
              {formatCurrency(stock.price || stock.currentPrice, stock.currency)}
            </span>
            <span className={styles.currency} style={{ display: 'block', fontSize: '12px', color: '#6b7280' }}>
              {stock.currency}
            </span>
          </div>
        </div>

        <div className={styles.overviewMetrics} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className={styles.metric} style={{ textAlign: 'center' }}>
            <span className={styles.metricLabel} style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>
              Confidence
            </span>
            <span className={styles.metricValue} style={{ fontSize: '14px', fontWeight: '600' }}>
              {formatConfidence(stock.decision?.confidence)}
            </span>
          </div>
          <div className={styles.metric} style={{ textAlign: 'center' }}>
            <span className={styles.metricLabel} style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>
              Systems Agreement
            </span>
            <span className={styles.metricValue} style={{ fontSize: '14px', fontWeight: '600' }}>
              {stock.decision?.systemsAgreement || 'N/A'}
            </span>
          </div>
          <div className={styles.metric} style={{ textAlign: 'center' }}>
            <span className={styles.metricLabel} style={{ display: 'block', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>
              Winning System
            </span>
            <span className={styles.metricValue} style={{ fontSize: '14px', fontWeight: '600' }} title={stock.decision?.winningSystem}>
              {stock.decision?.winningSystem?.substring(0, 15) + '...' || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Decision Analysis */}
      <div className={styles.section} style={{ 
        background: 'white', 
        border: '1px solid #e5e7eb', 
        borderRadius: '8px', 
        padding: '16px', 
        marginBottom: '16px' 
      }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🧠</span>
          Decision Analysis
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Action</span>
            <span style={{ 
              fontSize: '13px', 
              fontWeight: '600',
              padding: '2px 6px',
              borderRadius: '3px',
              background: stock.decision?.action === 'BUY' ? '#22c55e' : '#6b7280',
              color: 'white'
            }}>
              {stock.decision?.action || 'N/A'}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Confidence</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{formatConfidence(stock.decision?.confidence)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Grade</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{stock.decision?.grade || 'N/A'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: '#f9fafb', borderRadius: '4px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>Systems Agreement</span>
            <span style={{ fontSize: '13px', fontWeight: '600' }}>{stock.decision?.systemsAgreement || 'N/A'}</span>
          </div>
        </div>
        {stock.decision?.reasoning && (
          <div style={{ padding: '12px', background: '#f0f9ff', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: '600' }}>Reasoning:</h4>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4' }}>{stock.decision.reasoning}</p>
          </div>
        )}
      </div>

      {/* Entry Strategy */}
      {stock.execution?.entryStrategy && (
        <div className={styles.section} style={{ 
          background: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px' 
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🚀</span>
            Entry Strategy
          </h3>
          
          {/* Strategy Overview */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, padding: '8px', background: '#dbeafe', borderRadius: '4px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#1d4ed8', fontWeight: '500' }}>Strategy Type</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1e40af' }}>
                {stock.execution.entryStrategy.type}
              </span>
            </div>
            <div style={{ flex: 1, padding: '8px', background: '#fef3c7', borderRadius: '4px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '11px', color: '#92400e', fontWeight: '500' }}>Urgency</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#92400e' }}>
                {stock.execution.entryStrategy.orderParameters?.urgency || 'MEDIUM'}
              </span>
            </div>
          </div>

          {/* Entry Zone */}
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>💰 Entry Zone & Price Levels</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 12px', 
                background: '#dcfce7', 
                borderLeft: '3px solid #22c55e', 
                borderRadius: '4px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎯</span>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Optimal Entry</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>
                  {formatCurrency(stock.execution.entryStrategy.entryZone?.optimal, stock.currency)}
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 12px', 
                background: '#fef3c7', 
                borderLeft: '3px solid #f59e0b', 
                borderRadius: '4px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>⚠️</span>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Acceptable Range</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f59e0b' }}>
                  {formatCurrency(stock.execution.entryStrategy.entryZone?.acceptable, stock.currency)}
                </span>
              </div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 12px', 
                background: '#fee2e2', 
                borderLeft: '3px solid #ef4444', 
                borderRadius: '4px' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🚫</span>
                  <span style={{ fontSize: '13px', fontWeight: '500' }}>Maximum Entry</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                  {formatCurrency(stock.execution.entryStrategy.entryZone?.maximum, stock.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Volume Requirements */}
          {stock.execution.entryStrategy.volumeRequirements && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>📊 Volume Requirements</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>📊</div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '2px' }}>Minimum</span>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>
                    {(stock.execution.entryStrategy.volumeRequirements.minimum / 1000000).toFixed(1)}M
                  </span>
                </div>
                
                <div style={{ padding: '8px', background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>🎯</div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#059669', marginBottom: '2px' }}>Preferred</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#22c55e' }}>
                    {(stock.execution.entryStrategy.volumeRequirements.preferred / 1000000).toFixed(1)}M
                  </span>
                </div>
                
                <div style={{ padding: '8px', background: '#f0f9ff', border: '1px solid #3b82f6', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>🚀</div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#1d4ed8', marginBottom: '2px' }}>Explosive</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6' }}>
                    {(stock.execution.entryStrategy.volumeRequirements.explosive / 1000000).toFixed(1)}M
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Trigger Conditions */}
          {stock.execution.entryStrategy.triggerConditions && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>🎯 Trigger Conditions</h4>
              <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280' }}>
                Conditions Met: {stock.execution.entryStrategy.triggerConditions.filter(c => c.met).length} / {stock.execution.entryStrategy.triggerConditions.length}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {stock.execution.entryStrategy.triggerConditions.map((condition, index) => (
                  <div key={index} style={{
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '4px',
                    background: condition.met ? '#f0fdf4' : '#fefce8'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{condition.met ? '✅' : '⏳'}</span>
                        <span style={{ fontSize: '13px', fontWeight: '500' }}>
                          {condition.type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: '600',
                        color: condition.met ? '#22c55e' : '#f59e0b'
                      }}>
                        {condition.met ? 'MET' : 'WAITING'}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      Required: {condition.threshold?.toLocaleString()} | Current: {condition.current?.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Windows */}
          {stock.execution.entryStrategy.timeWindows && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>⏰ Optimal Timing</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div style={{ padding: '8px', background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>🎯</div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#059669', marginBottom: '2px' }}>Primary Window</span>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>
                    {stock.execution.entryStrategy.timeWindows.primary}
                  </span>
                </div>
                
                <div style={{ padding: '8px', background: '#fefce8', border: '1px solid #eab308', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>⏰</div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#92400e', marginBottom: '2px' }}>Secondary Window</span>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>
                    {stock.execution.entryStrategy.timeWindows.secondary}
                  </span>
                </div>
                
                <div style={{ padding: '8px', background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', marginBottom: '4px' }}>🚫</div>
                  <span style={{ display: 'block', fontSize: '11px', color: '#dc2626', marginBottom: '2px' }}>Avoid Trading</span>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>
                    {stock.execution.entryStrategy.timeWindows.avoid}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exit Strategy */}
      {stock.execution?.exitStrategy && (
        <div className={styles.section} style={{ 
          background: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px' 
        }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🎯</span>
            Exit Strategy
          </h3>
          
          {/* Stop Loss */}
          {stock.execution.exitStrategy.stopLoss && (
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>🛡️ Stop Loss Protection</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px', 
                  background: '#fef2f2', 
                  borderLeft: '3px solid #ef4444', 
                  borderRadius: '4px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🛑</span>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Initial Stop Loss</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#ef4444' }}>
                    {formatCurrency(stock.execution.exitStrategy.stopLoss.initial, stock.currency)}
                  </span>
                </div>
                
                {stock.execution.exitStrategy.stopLoss.trailingActivation && (
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '8px 12px', 
                    background: '#fff7ed', 
                    borderLeft: '3px solid #f97316', 
                    borderRadius: '4px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📈</span>
                      <span style={{ fontSize: '13px', fontWeight: '500' }}>Trailing Activation</span>
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#f97316' }}>
                      {formatCurrency(stock.execution.exitStrategy.stopLoss.trailingActivation, stock.currency)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profit Targets */}
          {stock.execution.exitStrategy.targets && (
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>
                🎯 Profit Targets ({stock.execution.exitStrategy.targets.scalingMethod})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px', 
                  background: '#f0fdf4', 
                  borderLeft: '3px solid #22c55e', 
                  borderRadius: '4px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🥉</span>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Conservative (33%)</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#22c55e' }}>
                    {formatCurrency(stock.execution.exitStrategy.targets.conservative, stock.currency)}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px', 
                  background: '#f0f9ff', 
                  borderLeft: '3px solid #3b82f6', 
                  borderRadius: '4px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🥈</span>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Moderate (33%)</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>
                    {formatCurrency(stock.execution.exitStrategy.targets.moderate, stock.currency)}
                  </span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  padding: '8px 12px', 
                  background: '#fefce8', 
                  borderLeft: '3px solid #eab308', 
                  borderRadius: '4px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🥇</span>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>Aggressive (34%)</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#eab308' }}>
                    {formatCurrency(stock.execution.exitStrategy.targets.aggressive, stock.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Position Sizing */}
      {stock.execution?.positionSizing && (
        <div className={styles.section} style={{ 
          background: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px' 
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span>
            Position Sizing & Risk
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Recommendation</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>
                {stock.execution.positionSizing.recommendation}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Shares</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>
                {stock.execution.positionSizing.shares?.toLocaleString()}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Position Value</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>
                {formatCurrency(stock.execution.positionSizing.positionValue, stock.currency)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Risk Amount</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>
                {formatCurrency(stock.execution.positionSizing.riskAmount, stock.currency)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Risk %</span>
              <span style={{ fontSize: '12px', fontWeight: '600' }}>
                {stock.execution.positionSizing.riskPercent}%
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: '#f9fafb', borderRadius: '4px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>Risk/Reward</span>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '700',
                color: stock.execution.positionSizing.riskReward >= 2 ? '#22c55e' : '#f59e0b'
              }}>
                {stock.execution.positionSizing.riskReward}:1
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Execution Notes */}
      {stock.execution?.executionNotes && (
        <div className={styles.section} style={{ 
          background: 'white', 
          border: '1px solid #e5e7eb', 
          borderRadius: '8px', 
          padding: '16px', 
          marginBottom: '16px' 
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span>
            Execution Notes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stock.execution.executionNotes.map((note, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '6px',
                padding: '6px 0',
                borderBottom: index < stock.execution.executionNotes.length - 1 ? '1px solid #f3f4f6' : 'none'
              }}>
                <span style={{ color: '#6b7280', fontSize: '12px', marginTop: '1px' }}>•</span>
                <span style={{ fontSize: '13px', lineHeight: '1.4' }}>{note}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px', textAlign: 'center' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Added to Watchlist: {new Date(stock.createdAt).toLocaleString()}
        </span>
      </div>
    </div>
  );
};

export default StockDetail;
