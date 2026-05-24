
import React, { useState, useEffect } from "react";
import styles from "./RiskManagement.module.css";
import PageHeader from "../components/PageHeader";

function RiskManagement() {

  // Initial state for formData
  const [formData, setFormData] = useState({
    capital: '10000',
    stockPrice: '',
    maxPosition: '25',
    riskPerShare: '2.0',
    stopLoss: '',
    slippage: '0',
    slippageSl: '0.5'
  });

  // State for calculated results
  const [calculations, setCalculations] = useState({
    shares: 0,
    actualFillPrice: 0,
    finalSlPrice: 0,
    finalSlPct: 0,
    riskAmount: 0,
    totalInvestment: 0,
    breakEvenPrice: 0,
    stopLossPrice: 0,
    target1Price: 0,
    target2Price: 0,
    target3Price: 0,
    maxRisk: 0,
    slPercentage: 0,
    rrRatio: 0,
    rrGatePass: false,
    slGatePass: false,
    sizeGatePass: false
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Calculate risk management values (always Long position)
  const calculateRiskManagement = () => {
    const capital = parseFloat(formData.capital) || 0;
    const price = parseFloat(formData.stockPrice) || 0;
    const maxPos = parseFloat(formData.maxPosition) / 100 || 0;
    const riskPctPerShare = parseFloat(formData.riskPerShare) / 100 || 0;
    const entrySlipPct = parseFloat(formData.slippage) / 100 || 0;
    const slSlipPct = parseFloat(formData.slippageSl) / 100 || 0;

    // Actual fill price: entry + entry slippage (Long — slippage pushes fill price up)
    const actualFillPrice = price > 0 ? price * (1 + entrySlipPct) : 0;

    // Clean stop loss (user-entered); derive from risk % if not provided
    let cleanStopLoss = 0;
    if (formData.stopLoss && parseFloat(formData.stopLoss) > 0) {
      cleanStopLoss = parseFloat(formData.stopLoss);
    } else if (price > 0) {
      cleanStopLoss = price * (1 - riskPctPerShare);
    }

    // Worst-case SL execution: buffer = entry × SL_slippage_pct (SL triggered below)
    const slBufAmt = price * slSlipPct;
    const finalSlPrice = cleanStopLoss > 0 ? cleanStopLoss - slBufAmt : 0;

    // Buffered risk per share (includes both entry and SL slippage)
    const totalRiskBudget = capital * riskPctPerShare;
    const bufferedRPS = actualFillPrice > 0 && finalSlPrice > 0 && actualFillPrice > finalSlPrice
      ? actualFillPrice - finalSlPrice : 0;

    // Position sizing with max-position cap applied
    let shares = 0;
    if (bufferedRPS > 0 && actualFillPrice > 0) {
      const maxByRisk = Math.floor(totalRiskBudget / bufferedRPS);
      const maxByCap  = Math.floor(capital / actualFillPrice);
      const maxByPos  = Math.floor((capital * maxPos) / actualFillPrice);
      shares = Math.min(maxByRisk, maxByCap, maxByPos);
    }

    const totalInvestment = shares * actualFillPrice;
    const riskAmount = shares * bufferedRPS;
    const finalSlPct = actualFillPrice > 0 ? (bufferedRPS / actualFillPrice) * 100 : 0;

    // Break-even trigger: price hits 2R above actual fill → move SL to entry
    const breakEvenPrice = actualFillPrice > 0 && bufferedRPS > 0
      ? actualFillPrice + 2 * bufferedRPS : 0;

    // R-Multiple targets from actual fill price using buffered 1R
    const target1Price = actualFillPrice + 2 * bufferedRPS;
    const target2Price = actualFillPrice + 3 * bufferedRPS;
    const target3Price = actualFillPrice + 4 * bufferedRPS;

    setCalculations({
      shares,
      actualFillPrice,
      finalSlPrice,
      finalSlPct,
      riskAmount,
      totalInvestment,
      breakEvenPrice,
      stopLossPrice: cleanStopLoss,
      target1Price,
      target2Price,
      target3Price,
      maxRisk: totalRiskBudget,
      slPercentage: finalSlPct,
      rrRatio: 2.0,
      rrGatePass: shares > 0,
      slGatePass: finalSlPct > 0,
      sizeGatePass: shares > 0
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
        {/* ── Existing Risk Management Section ── */}
        <div className={styles.mainGrid}>
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
              <label className={styles.label}>Entry Price</label>
              <input
                type="number"
                name="stockPrice"
                value={formData.stockPrice}
                onChange={handleInputChange}
                className={styles.input}
                placeholder="Enter price"
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
                placeholder="Enter SL price"
                step="0.01"
                min="0"
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>Entry Slippage %</label>
              <select
                name="slippage"
                value={formData.slippage}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="0">0% (Clean)</option>
                <option value="0.25">0.25%</option>
                <option value="0.5">0.5%</option>
                <option value="0.75">0.75%</option>
                <option value="1.0">1.0%</option>
              </select>
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.label}>SL Slippage %</label>
              <select
                name="slippageSl"
                value={formData.slippageSl}
                onChange={handleInputChange}
                className={styles.select}
              >
                <option value="0">0% (Clean)</option>
                <option value="0.25">0.25%</option>
                <option value="0.5">0.5%</option>
                <option value="0.75">0.75%</option>
                <option value="1.0">1.0%</option>
              </select>
            </div>
          </div>

          {/* ── R-Multiple Targets ───────────────────────────────────── */}
          {formData.stockPrice && formData.stopLoss && (() => {
            const entry = parseFloat(formData.stockPrice);
            const sl = parseFloat(formData.stopLoss);
            const ePct = parseFloat(formData.slippage) / 100;
            const sPct = parseFloat(formData.slippageSl) / 100;
            const actualEntry = entry * (1 + ePct);
            const actualSl = sl - entry * sPct;
            if (!actualEntry || !actualSl || actualEntry <= actualSl) return null;
            const oneR = actualEntry - actualSl;
            return (
              <div className={styles.subPanel}>
                <div className={styles.subPanelTitle}>R-Multiple Targets</div>
                <div className={styles.rMultiGrid}>
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className={styles.rMultiCell}>
                      <span className={styles.rMultiLabel}>{n}R</span>
                      <span className={styles.rMultiPrice}>₹{(actualEntry + n * oneR).toFixed(2)}</span>
                      <span className={styles.rMultiGain}>+₹{(n * oneR).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

        </div>
        <div className={styles.resultsSection}>
          <h2 className={styles.sectionTitle}>Calculated Results</h2>
          <div className={styles.resultsGrid}>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Position Size</div>
              <div className={styles.resultValue}>{formatNumber(calculations.shares)} shares</div>
              {calculations.actualFillPrice > 0 && (
                <div className={styles.resultNote}>@ {formatCurrency(calculations.actualFillPrice)} fill</div>
              )}
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Final SL %</div>
              <div className={styles.resultValue}>
                {calculations.finalSlPct > 0 ? `${calculations.finalSlPct.toFixed(2)}%` : '—'}
              </div>
              <div className={styles.resultNote}>After entry + SL slippage</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Risk Amount</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.riskAmount)}</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Break-Even Trigger</div>
              <div className={styles.resultValue}>
                {calculations.breakEvenPrice > 0 ? formatCurrency(calculations.breakEvenPrice) : '—'}
              </div>
              <div className={styles.resultNote}>At 2R from fill — move SL to entry</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Total Invested</div>
              <div className={styles.resultValue}>{formatCurrency(calculations.totalInvestment)}</div>
            </div>
            <div className={styles.resultCard}>
              <div className={styles.resultLabel}>Final SL Value</div>
              <div className={styles.resultValue}>
                {calculations.finalSlPrice > 0 ? formatCurrency(calculations.finalSlPrice) : '—'}
              </div>
              <div className={styles.resultNote}>
                {calculations.stopLossPrice > 0 ? `Clean SL: ${formatCurrency(calculations.stopLossPrice)}` : ''}
              </div>
            </div>
          </div>

          {/* ── Fill Buffer Analysis ─────────────────────────────────── */}
          {formData.stockPrice && formData.stopLoss && (() => {
            const entry = parseFloat(formData.stockPrice);
            const sl = parseFloat(formData.stopLoss);
            const risk = (parseFloat(formData.capital) || 0) * ((parseFloat(formData.riskPerShare) || 0) / 100);
            if (!entry || !sl || !risk || entry <= sl) return null;

            const capital = parseFloat(formData.capital) || 0;
            const maxPos = parseFloat(formData.maxPosition) / 100;
            const ePct = parseFloat(formData.slippage) / 100;
            const sPct = parseFloat(formData.slippageSl) / 100;

            const entryBufAmt = entry * ePct;
            const entryWorst = entry + entryBufAmt;
            const slBufAmt = entry * sPct;
            const slWorst = sl - slBufAmt;

            const cleanRPS = entry - sl;
            const buffRPS = entryWorst - slWorst;

            const maxQtyByPos      = entry      > 0 ? Math.floor((capital * maxPos) / entry)      : 0;
            const maxQtyByPosWorst = entryWorst > 0 ? Math.floor((capital * maxPos) / entryWorst) : 0;
            const qtyClean = cleanRPS > 0 ? Math.min(Math.floor(risk / cleanRPS), maxQtyByPos)      : 0;
            const qtyBuff  = buffRPS  > 0 ? Math.min(Math.floor(risk / buffRPS),  maxQtyByPosWorst) : 0;
            const allocClean = qtyClean * entry;
            const allocBuff  = qtyBuff  * entryWorst;

            return (
              <div className={styles.subPanel}>
                <div className={styles.subPanelTitle}>Fill Buffer Analysis</div>
                <div className={styles.bufferTable}>
                  <div className={`${styles.bufferRow} ${styles.bufferRowHead}`}>
                    <span></span>
                    <span>Clean</span>
                    <span>Buffer</span>
                    <span>Worst-case</span>
                  </div>
                  <div className={styles.bufferRow}>
                    <span className={styles.bufferMuted}>Entry</span>
                    <span>₹{entry.toFixed(2)}</span>
                    <span className={styles.bufferMuted}>+₹{entryBufAmt.toFixed(4)}</span>
                    <span className={styles.bufferWorst}>₹{entryWorst.toFixed(4)}</span>
                  </div>
                  <div className={styles.bufferRow}>
                    <span className={styles.bufferMuted}>SL</span>
                    <span>₹{sl.toFixed(2)}</span>
                    <span className={styles.bufferMuted}>-₹{slBufAmt.toFixed(4)}</span>
                    <span className={styles.bufferWorst}>₹{slWorst.toFixed(4)}</span>
                  </div>
                  <div className={styles.bufferRow}>
                    <span className={styles.bufferMuted}>Risk/share</span>
                    <span>₹{cleanRPS.toFixed(2)}</span>
                    <span></span>
                    <span className={styles.bufferWorst}>₹{buffRPS.toFixed(2)}</span>
                  </div>
                  <div className={`${styles.bufferRow} ${styles.bufferQtyRow}`}>
                    <span className={styles.bufferMuted}>Qty</span>
                    <span className={styles.bufferQtyClean}>{qtyClean} sh</span>
                    <span></span>
                    <span className={styles.bufferQtyBuff}>{qtyBuff} sh</span>
                  </div>
                  <div className={styles.bufferRow}>
                    <span className={styles.bufferMuted}>Allocation</span>
                    <span>₹{allocClean.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span></span>
                    <span className={styles.bufferMuted}>₹{allocBuff.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            );
          })()}


        </div>
        </div>{/* end mainGrid */}


      </div>
    </div>
  );
}

export default RiskManagement;
