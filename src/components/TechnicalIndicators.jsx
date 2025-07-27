import React, { useState, useEffect } from 'react';
import { getTechnicalIndicators } from '../api/tickerApi';
import styles from './TechnicalIndicators.module.css';

const TechnicalIndicators = ({ symbol, onATRChange }) => {
  const [indicators, setIndicators] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (symbol && symbol.trim()) {
      fetchIndicators(symbol);
    }
  }, [symbol]);

  const fetchIndicators = async (tickerSymbol) => {
    if (!tickerSymbol) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getTechnicalIndicators(tickerSymbol);
      const data = response.data;
      setIndicators(data);
      
      // Call the callback with ATR value if provided
      if (onATRChange && data.atr14) {
        onATRChange(data.atr14);
      }
    } catch (err) {
      setError('Failed to fetch technical indicators');
      console.error('Error fetching technical indicators:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!symbol) {
    return null;
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading technical indicators...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (!indicators) {
    return null;
  }

  const getTrendColor = (signal) => {
    switch (signal) {
      case 'bullish':
      case 'above_ema20':
      case 'bullish_aligned':
      case 'bullish_momentum':
        return '#00c851';
      case 'bearish':
      case 'below_ema20':
      case 'bearish_aligned':
      case 'bearish_momentum':
        return '#ff4444';
      case 'overbought':
        return '#ff8800';
      case 'oversold':
        return '#007bff';
      default:
        return '#6c757d';
    }
  };

  const formatTrendText = (signal) => {
    return signal.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Technical Indicators - {indicators.symbol}</h3>
        <div className={styles.currentPrice}>
          Current Price: <span className={styles.priceValue}>${indicators.currentPrice?.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.indicatorsGrid}>
        {/* EMA Section */}
        <div className={styles.section}>
          <h4>Exponential Moving Averages (EMA)</h4>
          <div className={styles.indicatorRow}>
            <span>EMA 13:</span>
            <span className={styles.value}>{indicators.ema13?.toFixed(2)}</span>
          </div>
          <div className={styles.indicatorRow}>
            <span>EMA 20:</span>
            <span className={styles.value}>{indicators.ema20?.toFixed(2)}</span>
          </div>
          <div className={styles.indicatorRow}>
            <span>EMA 26:</span>
            <span className={styles.value}>{indicators.ema26?.toFixed(2)}</span>
          </div>
          <div className={styles.indicatorRow}>
            <span>EMA 50:</span>
            <span className={styles.value}>{indicators.ema50?.toFixed(2)}</span>
          </div>
        </div>

        {/* SMA Section */}
        <div className={styles.section}>
          <h4>Simple Moving Averages (SMA)</h4>
          <div className={styles.indicatorRow}>
            <span>SMA 13:</span>
            <span className={styles.value}>{indicators.sma13?.toFixed(2)}</span>
          </div>
          <div className={styles.indicatorRow}>
            <span>SMA 20:</span>
            <span className={styles.value}>{indicators.sma20?.toFixed(2)}</span>
          </div>
          <div className={styles.indicatorRow}>
            <span>SMA 26:</span>
            <span className={styles.value}>{indicators.sma26?.toFixed(2)}</span>
          </div>
          <div className={styles.indicatorRow}>
            <span>SMA 50:</span>
            <span className={styles.value}>{indicators.sma50?.toFixed(2)}</span>
          </div>
        </div>

        {/* RSI & ATR Section */}
        <div className={styles.section}>
          <h4>Momentum & Volatility</h4>
          <div className={styles.indicatorRow}>
            <span>RSI (14):</span>
            <span className={styles.value}>{indicators.rsi14?.toFixed(2)}</span>
          </div>
          <div className={styles.indicatorRow}>
            <span>ATR (14):</span>
            <span className={styles.value}>{indicators.atr14?.toFixed(2)}</span>
          </div>
        </div>

        {/* Trend Analysis Section */}
        <div className={styles.section}>
          <h4>Trend Analysis</h4>
          <div className={styles.indicatorRow}>
            <span>Overall Trend:</span>
            <span 
              className={styles.trendValue}
              style={{ color: getTrendColor(indicators.trend?.overall) }}
            >
              {formatTrendText(indicators.trend?.overall || 'N/A')}
            </span>
          </div>
          <div className={styles.indicatorRow}>
            <span>Short Term:</span>
            <span 
              className={styles.trendValue}
              style={{ color: getTrendColor(indicators.trend?.shortTerm) }}
            >
              {formatTrendText(indicators.trend?.shortTerm || 'N/A')}
            </span>
          </div>
          <div className={styles.indicatorRow}>
            <span>EMA Alignment:</span>
            <span 
              className={styles.trendValue}
              style={{ color: getTrendColor(indicators.trend?.emaAlignment) }}
            >
              {formatTrendText(indicators.trend?.emaAlignment || 'N/A')}
            </span>
          </div>
          <div className={styles.indicatorRow}>
            <span>RSI Signal:</span>
            <span 
              className={styles.trendValue}
              style={{ color: getTrendColor(indicators.trend?.rsiSignal) }}
            >
              {formatTrendText(indicators.trend?.rsiSignal || 'N/A')}
            </span>
          </div>
        </div>
      </div>

      <div className={styles.timestamp}>
        Last updated: {new Date(indicators.date).toLocaleString()}
      </div>
    </div>
  );
};

export default TechnicalIndicators;
