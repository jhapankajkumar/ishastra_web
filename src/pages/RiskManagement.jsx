
import React, { useState, useEffect } from "react";
import styles from "./RiskManagement.module.css";
import PageHeader from "../components/PageHeader";

function RiskManagement() {

  // Initial state for formData
  const [formData, setFormData] = useState({
    accountBalance: '',
    stockPrice: '',
    positionType: 'Long',
    riskPercentage: 2,
    atr: '',
    atrMultiplier: 1.5,
    target1RR: 1,
    target2RR: 2,
    target3RR: 3,
    trailingStopPercentage: 1
  });

  // State for calculated results
  const [calculations, setCalculations] = useState({
    maxRisk: 0,
    shares: 0,
    stopLossPrice: 0,
    target1Price: 0,
    target2Price: 0,
    target3Price: 0,
    totalInvestment: 0,
    trailingStopPrice: 0,
    riskAmount: 0
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Calculate risk management values
  const calculateRiskManagement = () => {
    const balance = parseFloat(formData.accountBalance) || 0;
    const price = parseFloat(formData.stockPrice) || 0;
    const isLong = formData.positionType === 'Long';
    const riskPct = parseFloat(formData.riskPercentage) / 100 || 0;
    const maxRiskAmount = balance * riskPct;
    const atr = parseFloat(formData.atr) || 0;
    const atrMultiplier = parseFloat(formData.atrMultiplier) || 1.5;
    const trailingPct = parseFloat(formData.trailingStopPercentage) / 100 || 0;
    const target1RR = parseFloat(formData.target1RR) || 1;
    const target2RR = parseFloat(formData.target2RR) || 2;
    const target3RR = parseFloat(formData.target3RR) || 3;

    // Stop loss calculation (always ATR-based)
    let stopPrice = 0;
    if (atr > 0) {
      stopPrice = isLong ? price - atr * atrMultiplier : price + atr * atrMultiplier;
    }

    // Calculate risk per share
    const riskPerShare = Math.abs(price - stopPrice);

    // Calculate number of shares (limited by both risk and available capital)
    let sharesByRisk = 0;
    let sharesByCapital = 0;
    let numberOfShares = 0;
    if (riskPerShare > 0 && price > 0) {
      sharesByRisk = Math.floor(maxRiskAmount / riskPerShare);
      sharesByCapital = Math.floor(balance / price);
      numberOfShares = Math.min(sharesByRisk, sharesByCapital);
    }

    // Calculate total investment
    const totalInvestment = numberOfShares * price;

    // Calculate targets
    const target1 = isLong ? 
      price + (riskPerShare * target1RR) :
      price - (riskPerShare * target1RR);
    const target2 = isLong ? 
      price + (riskPerShare * target2RR) :
      price - (riskPerShare * target2RR);
    const target3 = isLong ? 
      price + (riskPerShare * target3RR) :
      price - (riskPerShare * target3RR);

    // Calculate trailing stop (original trailing stop)
    // For long: price * (1 - pct), for short: price * (1 - pct)
    // So trailing stop is always below entry for both
    const trailingStop = price * (1 - trailingPct);

    // Trailing Stop 1 and 2 based on ATR * atrMultiplier from stopPrice
    let trailingStop1 = 0;
    let trailingStop2 = 0;
    if (atr > 0) {
      if (isLong) {
        trailingStop1 = stopPrice + atr * atrMultiplier;
        trailingStop2 = stopPrice + 2 * atr * atrMultiplier;
      } else {
        trailingStop1 = stopPrice - atr * atrMultiplier;
        trailingStop2 = stopPrice - 2 * atr * atrMultiplier;
      }
    }

    setCalculations({
      maxRisk: maxRiskAmount,
      shares: numberOfShares,
      stopLossPrice: stopPrice,
      target1Price: target1,
      target2Price: target2,
      target3Price: target3,
      totalInvestment: totalInvestment,
      trailingStopPrice: trailingStop,
      trailingStop1: trailingStop1,
      trailingStop2: trailingStop2,
      riskAmount: maxRiskAmount
    });
  };

  useEffect(() => {
    calculateRiskManagement();
  }, [formData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 2
    }).format(number);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.inputSection}>
          <h2 className={styles.sectionTitle}>Position Setup</h2>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Trading Account Balance</label>
              <input
                type="number"
                name="accountBalance"
                value={formData.accountBalance}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter available trading balance"
                step="0.01"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Stock Price</label>
              <input
                type="number"
                name="stockPrice"
                value={formData.stockPrice}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Current stock price"
                step="0.01"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Position Type</label>
              <select
                name="positionType"
                value={formData.positionType}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="Long">Long Position</option>
                <option value="Short">Short Position</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Risk Percentage (%)</label>
              <input
                type="number"
                name="riskPercentage"
                value={formData.riskPercentage}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Risk per trade (%)"
                step="0.1"
                min="0.1"
                max="10"
              />
            </div>
          </div>
          <div>
            <h3 className={styles.subSectionTitle}>ATR-based Stop Loss</h3>
            <div className={styles.formGrid}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>ATR Value</label>
                <input
                  type="number"
                  name="atr"
                  value={formData.atr}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="Average True Range"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className={styles.inputGroup}>
                <label className={styles.label}>ATR Multiplier</label>
                <input
                  type="number"
                  name="atrMultiplier"
                  value={formData.atrMultiplier}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="e.g. 1.5"
                  step="0.1"
                  min="0.1"
                />
              </div>
            </div>
          </div>
          <h3 className={styles.subSectionTitle}>Target Configuration</h3>
          <div className={styles.targetsGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Target 1 (Risk:Reward)</label>
              <input
                type="number"
                name="target1RR"
                value={formData.target1RR}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="1"
                step="0.1"
                min="0.1"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Target 2 (Risk:Reward)</label>
              <input
                type="number"
                name="target2RR"
                value={formData.target2RR}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="2"
                step="0.1"
                min="0.1"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Target 3 (Risk:Reward)</label>
              <input
                type="number"
                name="target3RR"
                value={formData.target3RR}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="3"
                step="0.1"
                min="0.1"
              />
            </div>
          </div>
          <h3 className={styles.subSectionTitle}>Trailing Stop Configuration</h3>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Trailing Stop Percentage (%)</label>
            <input
              type="number"
              name="trailingStopPercentage"
              value={formData.trailingStopPercentage}
              onChange={handleInputChange}
              className={styles.input}
              placeholder="Trailing stop percentage"
              step="0.1"
              min="0.1"
            />
          </div>
        </div>
        <div className={styles.resultsSection}>
          <h2 className={styles.sectionTitle}>Calculated Results</h2>
          <div className={styles.resultsGrid}>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Position Size</div>
              <div className={styles.resultValue}>{formatNumber(calculations.shares)} shares</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Total Investment</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.totalInvestment)}</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Risk Amount</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.riskAmount)}</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Entry Price</div>
              <div className={styles.resultValue}>{formatCurrency(parseFloat(formData.stockPrice) || 0)}</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Stop Loss Price</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.stopLossPrice)}</div>
              <div className={styles.resultProfit} style={{ color: '#e53935' }}>
                {(() => {
                  const entry = parseFloat(formData.stockPrice || 0);
                  const stop = calculations.stopLossPrice;
                  const shares = calculations.shares;
                  const loss = (stop - entry) * shares * (formData.positionType === "Long" ? 1 : -1);
                  const percent = entry > 0 ? ((stop - entry) / entry) * 100 * (formData.positionType === "Long" ? 1 : -1) : 0;
                  return `Loss: ${formatCurrency(loss)} (${percent.toFixed(2)}%)`;
                })()}
              </div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Trailing Stop</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.trailingStopPrice)}</div>
              <div className={styles.resultNote}>Initial trailing stop level</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Target 1</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.target1Price)}</div>
              <div className={styles.resultProfit}>
                {(() => {
                  const entry = parseFloat(formData.stockPrice || 0);
                  const profit = (calculations.target1Price - entry) * calculations.shares * (formData.positionType === "Long" ? 1 : -1);
                  const percent = entry > 0 ? ((calculations.target1Price - entry) / entry) * 100 * (formData.positionType === "Long" ? 1 : -1) : 0;
                  return `Profit: ${formatCurrency(profit)} (${percent.toFixed(2)}%)`;
                })()}
              </div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Target 2</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.target2Price)}</div>
              <div className={styles.resultProfit}>
                {(() => {
                  const entry = parseFloat(formData.stockPrice || 0);
                  const profit = (calculations.target2Price - entry) * calculations.shares * (formData.positionType === "Long" ? 1 : -1);
                  const percent = entry > 0 ? ((calculations.target2Price - entry) / entry) * 100 * (formData.positionType === "Long" ? 1 : -1) : 0;
                  return `Profit: ${formatCurrency(profit)} (${percent.toFixed(2)}%)`;
                })()}
              </div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Target 3</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.target3Price)}</div>
              <div className={styles.resultProfit}>
                {(() => {
                  const entry = parseFloat(formData.stockPrice || 0);
                  const profit = (calculations.target3Price - entry) * calculations.shares * (formData.positionType === "Long" ? 1 : -1);
                  const percent = entry > 0 ? ((calculations.target3Price - entry) / entry) * 100 * (formData.positionType === "Long" ? 1 : -1) : 0;
                  return `Profit: ${formatCurrency(profit)} (${percent.toFixed(2)}%)`;
                })()}
              </div>
            </div>
            {/* Trailing Stop 1 (ATR) and Trailing Stop 2 (ATR) removed as per user request */}
          </div>
          <div className={styles.summarySection}>
            <h3 className={styles.summaryTitle}>Risk Summary</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Risk per Trade:</span>
                <span className={styles.summaryValue}>{formData.riskPercentage}% ({formatCurrency(calculations.maxRisk)})</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Portfolio Exposure:</span>
                <span className={styles.summaryValue}>
                  {((calculations.totalInvestment / (parseFloat(formData.accountBalance) || 1)) * 100).toFixed(2)}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Risk per Share:</span>
                <span className={styles.summaryValue}>
                  {formatCurrency(Math.abs(parseFloat(formData.stockPrice || 0) - calculations.stopLossPrice))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RiskManagement;
