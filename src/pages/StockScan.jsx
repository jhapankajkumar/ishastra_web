import React, { useState, useRef } from 'react';
import { runWatchlistDailyScan } from '../api/analysisApi';
import { useNotification } from '../components/NotificationProvider';
import styles from './StockScan.module.css';

// Strip exchange prefixes like NYSE:, NASDAQ:, AMEX: etc. and remove surrounding quotes
// For NSE and BSE, add .NS and .BS suffixes respectively
const parseSymbols = (text) => {
  return text
    .split(/[,\n\r]+/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => {
      // Remove surrounding quotes (both double and single)
      s = s.replace(/^["']|["']$/g, '').trim();
      // Handle exchange prefixes
      const colonIdx = s.indexOf(':');
      if (colonIdx !== -1) {
        const exchange = s.slice(0, colonIdx).toUpperCase();
        const symbol = s.slice(colonIdx + 1).trim();
        // Add appropriate suffix for NSE and BSE
        if (exchange === 'NSE') {
          return symbol.endsWith('.NS') ? symbol : symbol + '.NS';
        } else if (exchange === 'BSE') {
          return symbol.endsWith('.BS') ? symbol : symbol + '.BS';
        }
        return symbol;
      }
      return s.trim();
    })
    .filter(Boolean);
};

// Remove .NS and .BS suffixes for display
const removeExchangeSuffixes = (text) => {
  return text
    .split(', ')
    .map(s => s.replace(/\.(NS|BS)$/, ''))
    .join(', ');
};

const StockScan = () => {
  const notification = useNotification();
  const fileInputRef = useRef(null);

  const [inputText, setInputText] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [copiedFailed, setCopiedFailed] = useState(false);

  const symbolCount = parseSymbols(inputText).length;

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setInputText(ev.target.result || '');
      setResult(null);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRunScan = async () => {
    const symbols = parseSymbols(inputText);
    if (symbols.length === 0) {
      notification.error('No valid symbols found. Please upload a file or paste symbols.');
      return;
    }
    setScanning(true);
    setResult(null);
    try {
      const response = await runWatchlistDailyScan(symbols);
      setResult(response.result || null);
      const buyCount = response.result?.breakdown?.buy || 0;
      notification.success(`Scan complete! Found ${buyCount} buy signal${buyCount !== 1 ? 's' : ''}.`);
    } catch (err) {
      notification.error('Scan failed. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleCopy = () => {
    if (!result?.buySignals) return;
    const symbolsToDisplay = removeExchangeSuffixes(result.buySignals);
    navigator.clipboard.writeText(symbolsToDisplay).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCopyFailed = () => {
    if (!result?.failedSymbols) return;
    navigator.clipboard.writeText(result.failedSymbols).then(() => {
      setCopiedFailed(true);
      setTimeout(() => setCopiedFailed(false), 2000);
    });
  };

  const handleClear = () => {
    setInputText('');
    setResult(null);
    setCopied(false);
    setCopiedFailed(false);
  };

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderContent}>
          <h1 className={styles.title}>🔎 Stock Universe Scan</h1>
          <p className={styles.subtitle}>
            Upload your stock universe file or paste symbols to scan for BUY signals.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Based on a rules-based template (Minervini-style) for journaling/review purposes — not financial advice or a trading signal.
          </p>
        </div>
      </div>

      <div className={styles.content}>
        {/* Input Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Stock Universe</h2>
            {symbolCount > 0 && (
              <span className={styles.symbolBadge}>{symbolCount} symbols</span>
            )}
          </div>

          <p className={styles.inputHint}>
            Upload a <strong>.txt</strong> or <strong>.csv</strong> file, or paste comma-separated symbols directly.
            Exchange prefixes like <code>NYSE:</code>, <code>NASDAQ:</code> are stripped automatically.
          </p>

          {/* File Upload Row */}
          <div className={styles.fileRow}>
            <button
              type="button"
              className={styles.uploadBtn}
              onClick={() => fileInputRef.current?.click()}
              disabled={scanning}
            >
              📂 Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            {inputText && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={handleClear}
                disabled={scanning}
              >
                ✕ Clear
              </button>
            )}
          </div>

          {/* Textarea */}
          <textarea
            className={styles.textarea}
            placeholder="e.g. NYSE:DAL, NASDAQ:AAPL, TSLA, RELIANCE.NS, ITC.NS"
            value={inputText}
            onChange={e => { setInputText(e.target.value); setResult(null); }}
            rows={8}
            disabled={scanning}
          />

          {/* Run Scan Button */}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.scanBtn}
              onClick={handleRunScan}
              disabled={scanning || !inputText.trim()}
            >
              {scanning ? 'Scanning...' : '🚀 Run Scan'}
            </button>
          </div>
        </div>

        {/* Loading State */}
        {scanning && (
          <div className={styles.loadingCard}>
            <div className={styles.spinner}></div>
            <div>
              <p className={styles.loadingTitle}>Scanning {symbolCount} stocks...</p>
              <p className={styles.loadingSubtitle}>This may take a few minutes. Please wait.</p>
            </div>
          </div>
        )}

        {/* Results Card */}
        {!scanning && result && (
          <div className={styles.resultsCard}>
            <h2 className={styles.resultsTitle}>Scan Results</h2>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Scanned</span>
                <strong className={styles.statValue}>{result.scanned ?? '—'}</strong>
              </div>
              <div className={`${styles.statItem} ${styles.statBuy}`}>
                <span className={styles.statLabel}>Buy Signals</span>
                <strong className={styles.statValue}>{result.breakdown?.buy ?? 0}</strong>
              </div>
              <div className={`${styles.statItem} ${styles.statStrongBuy}`}>
                <span className={styles.statLabel}>Strong Buy</span>
                <strong className={styles.statValue}>{result.breakdown?.strongBuy ?? 0}</strong>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Watch</span>
                <strong className={styles.statValue}>{result.watchSignals ?? 0}</strong>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Avg Confidence</span>
                <strong className={styles.statValue}>{result.avgConfidence ?? '—'}%</strong>
              </div>
            </div>

            {/* Buy Signals Output */}
            <div className={styles.outputSection}>
              <p className={styles.outputLabel}>Buy Signals (copy & add to watchlist):</p>
              <div className={styles.copyRow}>
                <input
                  type="text"
                  className={styles.outputInput}
                  value={result.buySignals ? removeExchangeSuffixes(result.buySignals) : 'No buy signals found'}
                  readOnly
                />
                <button
                  type="button"
                  className={`${styles.copyBtn} ${copied ? styles.copyBtnSuccess : ''}`}
                  onClick={handleCopy}
                  disabled={!result.buySignals}
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Failed Stocks Output */}
            {(result.failedCount > 0 || result.failedSymbols) && (
              <div className={styles.failedOutputSection}>
                <p className={styles.failedOutputLabel}>
                  ⚠️ Failed Stocks ({result.failedCount ?? 0}) — could not fetch data:
                </p>
                <div className={styles.copyRow}>
                  <input
                    type="text"
                    className={styles.failedOutputInput}
                    value={result.failedSymbols || 'None'}
                    readOnly
                  />
                  <button
                    type="button"
                    className={`${styles.failedCopyBtn} ${copiedFailed ? styles.failedCopyBtnSuccess : ''}`}
                    onClick={handleCopyFailed}
                    disabled={!result.failedSymbols}
                  >
                    {copiedFailed ? '✅ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StockScan;
