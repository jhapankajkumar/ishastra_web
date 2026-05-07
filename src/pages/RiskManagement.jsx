
import React, { useState, useEffect } from "react";
import styles from "./RiskManagement.module.css";
import PageHeader from "../components/PageHeader";

function RiskManagement() {

  // Initial state for formData
  const [formData, setFormData] = useState({
    capital: '10000',
    stockPrice: '',
    positionType: 'Long',
    maxPosition: '25',
    riskPerShare: '2.0',
    stopLoss: '',
    minRR: '2.0',
    maxSlPercent: '5',
    slippage: '0'
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
    riskAmount: 0,
    slPercentage: 0,
    rrRatio: 0,
    breakEvenPrice: 0,
    rrGatePass: false,
    slGatePass: false,
    sizeGatePass: false,
    slippagePrice: 0,
    slippageRiskPerShare: 0,
    slippageShares: 0,
    slippageTotalInvestment: 0,
    slippageRiskAmount: 0
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
    const capital = parseFloat(formData.capital) || 0;
    const price = parseFloat(formData.stockPrice) || 0;
    const maxPos = parseFloat(formData.maxPosition) / 100 || 0;
    const riskPctPerShare = parseFloat(formData.riskPerShare) / 100 || 0;
    const isLong = formData.positionType === 'Long';
    const slippagePct = parseFloat(formData.slippage) / 100 || 0;
    // Worst-case fill: slippage works against you (higher for Long, lower for Short)
    const slippagePrice = price > 0
      ? isLong ? price * (1 + slippagePct) : price * (1 - slippagePct)
      : 0;

    // Use manually entered Stop Loss if provided, otherwise calculate from risk per share
    let stopLoss = price;
    if (formData.stopLoss && parseFloat(formData.stopLoss) > 0) {
      stopLoss = parseFloat(formData.stopLoss);
    } else if (price > 0) {
      const riskAmount = price * riskPctPerShare;
      stopLoss = isLong ? price - riskAmount : price + riskAmount;
    }

    // Calculate total risk budget based on Risk Per Share percentage
    const totalRiskBudget = capital * riskPctPerShare;

    // Calculate risk per share distance
    const riskPerShareDistance = Math.abs(price - stopLoss);

    // Calculate number of shares based on risk budget and stop loss distance
    let numberOfShares = 0;
    if (riskPerShareDistance > 0) {
      numberOfShares = Math.floor(totalRiskBudget / riskPerShareDistance);
    }
    
    // Apply Max Position % constraint as upper cap
    const maxSharesByMaxPosition = Math.floor((capital * maxPos) / price);
    
    // Ensure shares don't exceed available capital AND max position constraint
    const maxSharesByCapital = Math.floor(capital / price);
    numberOfShares = Math.min(numberOfShares, maxSharesByCapital, maxSharesByMaxPosition);

    // Calculate total investment
    const totalInvestment = numberOfShares * price;

    // Calculate SL percentage and risk amount
    let slPercentage = 0;
    let riskPerShare = 0;
    let riskAmount = 0;

    if (price > 0 && stopLoss !== price) {
      riskPerShare = Math.abs(price - stopLoss);
      slPercentage = (riskPerShare / price) * 100;
      riskAmount = riskPerShare * numberOfShares;
    }

    // Calculate max risk (based on Risk Per Share % of capital)
    const maxRisk = totalRiskBudget;

    // Calculate targets based on risk per share
    // Risk = Entry - SL, so for 1:2R target = Entry + 2*Risk
    const target1 = isLong ? 
      price + (2 * riskPerShare) :
      price - (2 * riskPerShare);
    const target2 = isLong ? 
      price + (3 * riskPerShare) :
      price - (3 * riskPerShare);
    const target3 = isLong ? 
      price + (4 * riskPerShare) :
      price - (4 * riskPerShare);

    // Break-even trigger: when T1 (1:2R) is hit, move SL to entry
    const breakEvenPrice = isLong ?
      price + (2 * riskPerShare) :
      price - (2 * riskPerShare);

    // R:R Gatekeeper calculations
    const minRR = parseFloat(formData.minRR) || 2.0;
    const maxSlPct = parseFloat(formData.maxSlPercent) || 5.0;
    // T1 is always at 2R, so rrRatio = 2.0 when T1 is target
    const rrRatio = riskPerShareDistance > 0 ? (Math.abs(target1 - price) / riskPerShareDistance) : 0;
    const rrGatePass = price > 0 && stopLoss > 0 && rrRatio >= minRR;
    const slGatePass = price > 0 && stopLoss > 0 && slPercentage > 0 && slPercentage <= maxSlPct;
    const sizeGatePass = numberOfShares > 0;

    // Slippage-adjusted sizing: size using worst-case fill price to keep risk constant
    let slippageShares = 0;
    let slippageRiskPerShare = 0;
    let slippageRiskAmount = 0;
    let slippageTotalInvestment = 0;
    if (slippagePrice > 0 && stopLoss > 0 && Math.abs(slippagePrice - stopLoss) > 0) {
      slippageRiskPerShare = Math.abs(slippagePrice - stopLoss);
      const slippageMaxByPos = Math.floor((capital * maxPos) / slippagePrice);
      const slippageMaxByCap = Math.floor(capital / slippagePrice);
      slippageShares = Math.min(
        Math.floor(totalRiskBudget / slippageRiskPerShare),
        slippageMaxByCap,
        slippageMaxByPos
      );
      slippageTotalInvestment = slippageShares * slippagePrice;
      slippageRiskAmount = slippageRiskPerShare * slippageShares;
    }

    setCalculations({
      maxRisk: maxRisk,
      shares: numberOfShares,
      stopLossPrice: stopLoss,
      target1Price: target1,
      target2Price: target2,
      target3Price: target3,
      totalInvestment: totalInvestment,
      riskAmount: riskAmount,
      slPercentage: slPercentage,
      rrRatio: rrRatio,
      breakEvenPrice: breakEvenPrice,
      rrGatePass: rrGatePass,
      slGatePass: slGatePass,
      sizeGatePass: sizeGatePass,
      slippagePrice: slippagePrice,
      slippageRiskPerShare: slippageRiskPerShare,
      slippageShares: slippageShares,
      slippageTotalInvestment: slippageTotalInvestment,
      slippageRiskAmount: slippageRiskAmount
    });
  };

  useEffect(() => {
    calculateRiskManagement();
  }, [formData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (number) => {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 2
    }).format(number);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.inputSection}>
          <h3 className={styles.sectionTitle}>Position Setup</h3>
          <div className={styles.formGrid}>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Trading Capital (USD)</label>
              <select
                name="capital"
                value={formData.capital}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="5000">5,000</option>
                <option value="7500">7,500</option>
                <option value="10000">10,000</option>
                <option value="12500">12,500</option>
                <option value="15000">15,000</option>
                <option value="20000">20,000</option>
                <option value="25000">25,000</option>
                <option value="30000">30,000</option>
                <option value="35000">35,000</option>
                <option value="40000">40,000</option>
                <option value="45000">45,000</option>
                <option value="50000">50,000</option>
                <option value="55000">55,000</option>
                <option value="60000">60,000</option>
                <option value="65000">65,000</option>
                <option value="70000">70,000</option>
                <option value="75000">75,000</option>
                <option value="80000">80,000</option>
                <option value="85000">85,000</option>
                <option value="90000">90,000</option>
                <option value="95000">95,000</option>
                <option value="100000">100,000</option>
                <option value="200000">200,000</option>
                <option value="300000">300,000</option>
                <option value="400000">400,000</option>
                <option value="500000">500,000</option>

                
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Max Position %</label>
              <select
                name="maxPosition"
                value={formData.maxPosition}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="10">10%</option>
                <option value="15">15%</option>
                <option value="20">20%</option>
                <option value="25">25%</option>
                <option value="30">30%</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Stock Price</label>
              <input
                type="number"
                name="stockPrice"
                value={formData.stockPrice}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter stock price"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Stop Loss Price</label>
              <input
                type="number"
                name="stopLoss"
                value={formData.stopLoss}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter stop loss price"
                step="0.01"
                min="0"
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
              <label className={styles.label}>Risk Per Trade %</label>
              <select
                name="riskPerShare"
                value={formData.riskPerShare}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="0.2">0.2%</option>
                <option value="0.3">0.3%</option>
                <option value="0.4">0.4%</option>
                <option value="0.5">0.5%</option>
                <option value="0.75">0.75%</option>
                <option value="1.0">1.0%</option>
                <option value="1.5">1.5%</option>
                <option value="2.0">2.0%</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Min R:R Required</label>
              <select
                name="minRR"
                value={formData.minRR}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="1.5">1.5R</option>
                <option value="2.0">2R (Recommended)</option>
                <option value="2.5">2.5R</option>
                <option value="3.0">3R</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Max SL % Allowed</label>
              <select
                name="maxSlPercent"
                value={formData.maxSlPercent}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="3">3%</option>
                <option value="4">4%</option>
                <option value="5">5% (Recommended)</option>
                <option value="6">6%</option>
                <option value="8">8%</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Entry Slippage %</label>
              <select
                name="slippage"
                value={formData.slippage}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="0">0% (Limit order)</option>
                <option value="0.1">0.1%</option>
                <option value="0.25">0.25%</option>
                <option value="0.5">0.5%</option>
                <option value="1.0">1.0%</option>
                <option value="1.5">1.5%</option>
                <option value="2.0">2.0%</option>
              </select>
            </div>
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
              <div className={styles.resultLabel}>Stop Loss</div>
              <div className={styles.resultValue}>{calculations.slPercentage.toFixed(2)}% </div>
              <div className={styles.resultNote}>
                {formatCurrency(calculations.stopLossPrice)}
              </div>
            </div>
            
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Risk Amount</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.riskAmount)}</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Break-Even Trigger</div>
              <div className={styles.resultValue}>
                {formData.stockPrice && calculations.breakEvenPrice > 0 ? formatCurrency(calculations.breakEvenPrice) : '—'}
              </div>
              <div className={styles.resultNote}>When price hits T1 (1:2R), move SL to entry (break-even)</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Total Investment</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.totalInvestment)}</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>SL Position</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.stopLossPrice)}</div>
              <div className={styles.resultNote}>
                SL: {calculations.slPercentage.toFixed(2)}% ({formatCurrency(Math.abs(parseFloat(formData.stockPrice || 0) - calculations.stopLossPrice))})
              </div>
            </div>
            {/* <div className={styles.resultCard}>
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
            </div> */}
            {/* Slippage Impact Card */}
            {parseFloat(formData.slippage) > 0 && formData.stockPrice && formData.stopLoss && (
              <div className={styles.resultCard} style={{ gridColumn: '1 / -1', border: '1px solid #f59e0b' }}>
                <div className={styles.resultLabel} style={{ color: '#f50b0b' }}>⚠ Slippage-Adjusted Plan ({formData.slippage}%)</div>
                <div className={styles.slippageGrid}>
                  <div className={styles.slippageRow}>
                    <span className={styles.slippageCol}></span>
                    <span className={styles.slippageColHead}>Clean Entry</span>
                    <span className={styles.slippageColHead}>Worst Fill (+{formData.slippage}%)</span>
                  </div>
                  <div className={styles.slippageRow}>
                    <span className={styles.slippageCol}>Fill Price</span>
                    <span className={styles.slippageVal}>{formatCurrency(parseFloat(formData.stockPrice) || 0)}</span>
                    <span className={styles.slippageValWarn}>{formatCurrency(calculations.slippagePrice)}</span>
                  </div>
                  <div className={styles.slippageRow}>
                    <span className={styles.slippageCol}>Risk / Share</span>
                    <span className={styles.slippageVal}>{formatCurrency(Math.abs((parseFloat(formData.stockPrice) || 0) - calculations.stopLossPrice))}</span>
                    <span className={styles.slippageValWarn}>{formatCurrency(calculations.slippageRiskPerShare)}</span>
                  </div>
                  <div className={styles.slippageRow}>
                    <span className={styles.slippageCol}>Shares</span>
                    <span className={styles.slippageVal}>{formatNumber(calculations.shares)}</span>
                    <span className={styles.slippageValWarn}>{formatNumber(calculations.slippageShares)}</span>
                  </div>
                  <div className={styles.slippageRow}>
                    <span className={styles.slippageCol}>Total Risk</span>
                    <span className={styles.slippageVal}>{formatCurrency(calculations.riskAmount)}</span>
                    <span className={styles.slippageValWarn}>{formatCurrency(calculations.slippageRiskAmount)}</span>
                  </div>
                </div>
                <div className={styles.resultNote} style={{ marginTop: 8, color: '#f5490b' }}>
                  Use <b>{formatNumber(calculations.slippageShares)} shares</b> to stay within your {formData.riskPerShare}% risk budget even with slippage.
                </div>
              </div>
            )}
            {/* Trailing Stop 1 (ATR) and Trailing Stop 2 (ATR) removed as per user request */}
            
          </div>
          {/* <div className={styles.summarySection}>
            <h3 className={styles.summaryTitle}>Risk Summary</h3>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Capital Allocated:</span>
                <span className={styles.summaryValue}>{formatCurrency(calculations.maxRisk)}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Portfolio Exposure:</span>
                <span className={styles.summaryValue}>
                  {((calculations.totalInvestment / (parseFloat(formData.capital) || 1)) * 100).toFixed(2)}%
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Risk per Share:</span>
                <span className={styles.summaryValue}>
                  {formatCurrency(Math.abs(parseFloat(formData.stockPrice || 0) - calculations.stopLossPrice))}
                </span>
              </div>
            </div>
          </div> */}

          {/* Setup Gate */}
          {formData.stockPrice && formData.stopLoss && (
            <div className={`${styles.gateSection} ${
              calculations.rrGatePass && calculations.slGatePass && calculations.sizeGatePass
                ? styles.gateSectionPass
                : styles.gateSectionFail
            }`}>
              <h3 className={styles.gateTitle}>Setup Gate</h3>
              <div className={styles.gateChecks}>
                <div className={`${styles.gateCheck} ${calculations.rrGatePass ? styles.gateCheckPass : styles.gateCheckFail}`}>
                  <span className={styles.gateIcon}>{calculations.rrGatePass ? '✓' : '✗'}</span>
                  <span className={styles.gateCheckLabel}>R:R at T1:</span>
                  <span className={styles.gateCheckValue}>
                    {calculations.rrRatio > 0 ? `${calculations.rrRatio.toFixed(1)}:1` : '—'}
                    <span className={styles.gateCheckNote}> (Min: {formData.minRR}R)</span>
                  </span>
                </div>
                <div className={`${styles.gateCheck} ${calculations.slGatePass ? styles.gateCheckPass : styles.gateCheckFail}`}>
                  <span className={styles.gateIcon}>{calculations.slGatePass ? '✓' : '✗'}</span>
                  <span className={styles.gateCheckLabel}>SL Distance:</span>
                  <span className={styles.gateCheckValue}>
                    {calculations.slPercentage > 0 ? `${calculations.slPercentage.toFixed(2)}%` : '—'}
                    <span className={styles.gateCheckNote}> (Max: {formData.maxSlPercent}%)</span>
                  </span>
                </div>
                <div className={`${styles.gateCheck} ${calculations.sizeGatePass ? styles.gateCheckPass : styles.gateCheckFail}`}>
                  <span className={styles.gateIcon}>{calculations.sizeGatePass ? '✓' : '✗'}</span>
                  <span className={styles.gateCheckLabel}>Position Size:</span>
                  <span className={styles.gateCheckValue}>
                    {calculations.shares > 0 ? `${calculations.shares} shares` : 'Too small / 0'}
                  </span>
                </div>
              </div>
              <div className={styles.gateVerdict}>
                {calculations.rrGatePass && calculations.slGatePass && calculations.sizeGatePass ? (
                  <span className={styles.gateVerdictPass}>SETUP QUALIFIES — Safe to trade</span>
                ) : (
                  <span className={styles.gateVerdictFail}>
                    SETUP DISQUALIFIED —
                    {!calculations.slGatePass && calculations.slPercentage > 0 && ` SL ${calculations.slPercentage.toFixed(2)}% exceeds ${formData.maxSlPercent}% max.`}
                    {!calculations.rrGatePass && calculations.rrRatio > 0 && ` R:R ${calculations.rrRatio.toFixed(1)}:1 below ${formData.minRR}R minimum.`}
                    {!calculations.sizeGatePass && ' Position size is 0 — adjust capital or price.'}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RiskManagement;
