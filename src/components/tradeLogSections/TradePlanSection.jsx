import React from "react";
import { getCurrentPrice, getATR } from '../../api/tickerApi';

export default function TradePlanSection({ form, handleChange, entryDisabled, today, styles, openTrades }) {
  // --- ATR fetch state ---
  const [loadingATR, setLoadingATR] = React.useState(false);
  const [currentPrice, setCurrentPrice] = React.useState(null);
  const [loadingPrice, setLoadingPrice] = React.useState(false);



  // --- Logic for dynamic fields and calculations ---
  // Set default stop loss method as ATR
  const stopLossMethod = form.stopLossMethod || "ATR";
  // Set default ATR value as 10 if ATR selected
  const atrValue = stopLossMethod === "ATR" ? (form.atrValue || 10) : (form.atrValue || 0);
  // Set default fixed percent as 3 if Fixed % selected
  const fixedPercent = stopLossMethod === "Fixed %" ? (form.fixedPercent || 3) : (form.fixedPercent || 0);
  const direction = form.direction || "Long";
  // Define entryPrice (was missing)
  const entryPrice = parseFloat(form.entryOrderPrice) || 0;

  // Set default market to US if not set
  const market = form.market || "US";
  // Set initial trading account value
  const initialAccountValue = market === "India" ? 1000000 : 120000;
  // Calculate open trades invested amount
  const openInvested = openTrades ? openTrades.reduce((sum, t) => {
    const qty = parseFloat(t.entryFilledShares) || 0;
    const price = parseFloat(t.entryOrderPrice) || 0;
    return sum + qty * price;
  }, 0) : 0;
  // Calculate remaining account balance
  const accountBalance = initialAccountValue - openInvested;

  // Set default risk % per trade to 1.5 if not set
  const riskPerTrade = form.riskPerTrade || "1.5%";
  // Parse risk value
  let riskValue = 0;
  if (typeof riskPerTrade === "string" && riskPerTrade.includes("%")) {
    const pct = parseFloat(riskPerTrade);
    riskValue = (accountBalance * pct) / 100;
  } else {
    riskValue = parseFloat(riskPerTrade) || 0;
  }

  // Set default ATR multiplier (like RiskManagement screen)
  const atrMultiplier = stopLossMethod === "ATR"
    ? (form.atrMultiplier !== undefined && form.atrMultiplier !== null && form.atrMultiplier !== "" ? parseFloat(form.atrMultiplier) : 1.5)
    : 1.5;

  // Calculate stop loss value
  let stopLossValue = 0;
  if (stopLossMethod === "ATR") {
    stopLossValue = (parseFloat(atrValue) || 0) * atrMultiplier;
  } else if (stopLossMethod === "Fixed Value") {
    // For Fixed Value, calculate 3% up/down from entryPrice based on direction
    if (entryPrice > 0) {
      const threePercent = entryPrice * 0.03;
      stopLossValue = threePercent;
    } else {
      stopLossValue = parseFloat(form.stopLossPrice) || 0;
    }
  } else if (stopLossMethod === "Fixed %") {
    stopLossValue = entryPrice * (parseFloat(fixedPercent) / 100);
  }

  // Calculate max allowed QTY based on risk per trade
  let maxAllowedQty = 0;
  if (stopLossValue > 0 && entryPrice > 0) {
    maxAllowedQty = Math.floor(riskValue / stopLossValue);
  }

  // Calculate auto QTY if not set or if entryPrice/stopLossValue changes
  let autoQty = maxAllowedQty > 0 ? maxAllowedQty : "";

  // Use autoQty if user hasn't manually changed QTY, and update as price changes
  // If user manually enters a value, use that, otherwise always use autoQty
  const qtyValue = (form.entryFilledShares === undefined || form.entryFilledShares === null || form.entryFilledShares === "") ? autoQty : form.entryFilledShares;

  // If the calculated autoQty changes and user hasn't entered a value, update the form value
  React.useEffect(() => {
    if ((form.entryFilledShares === undefined || form.entryFilledShares === null || form.entryFilledShares === "") && autoQty !== "" && String(qtyValue) !== String(autoQty)) {
      handleChange({ target: { name: "entryFilledShares", value: autoQty } });
    }
    // eslint-disable-next-line
  }, [autoQty]);

  // Track last calculated autoQty to detect if user has overridden
  const [lastAutoQty, setLastAutoQty] = React.useState("");
  React.useEffect(() => {
    if (!form.entryFilledShares || form.entryFilledShares === "") {
      setLastAutoQty(autoQty);
    }
  }, [autoQty, form.entryFilledShares]);

  // Warn if user QTY > maxAllowedQty
  const qtyWarning = parseFloat(form.entryFilledShares) > maxAllowedQty;

  // Calculate stop loss price
  let stopLossPrice = "";
  if (stopLossMethod === "ATR" && atrValue && entryPrice) {
    // Use ATR * atrMultiplier for stop loss price calculation
    const atrStop = (parseFloat(atrValue) || 0) * atrMultiplier;
    stopLossPrice = direction === "Long"
      ? (entryPrice - atrStop).toFixed(2)
      : (entryPrice + atrStop).toFixed(2);
  } else if (stopLossMethod === "Fixed %" && fixedPercent && entryPrice) {
    stopLossPrice = direction === "Long"
      ? (entryPrice - stopLossValue).toFixed(2)
      : (entryPrice + stopLossValue).toFixed(2);
  } else if (stopLossMethod === "Fixed Value" && entryPrice) {
    // For Fixed Value, show 3% up/down from entryPrice
    if (entryPrice > 0) {
      stopLossPrice = direction === "Long"
        ? (entryPrice - stopLossValue).toFixed(2)
        : (entryPrice + stopLossValue).toFixed(2);
    } else if (form.stopLossPrice) {
      stopLossPrice = form.stopLossPrice;
    }
  }

  // Calculate targets (1:2, 1:3, 1:4)
  const targets = [2, 3, 4].map(mult => {
    if (!stopLossValue || !entryPrice) return "";
    if (direction === "Long") {
      return (entryPrice + stopLossValue * mult).toFixed(2);
    } else {
      return (entryPrice - stopLossValue * mult).toFixed(2);
    }
  });

  // Set default entry date as today if not set
  const entryDate = form.entryDate || today;

  return (
    <div className={styles.cardSection}>
      <h2 className={styles.sectionTitle}>Trade Plan & Risk Management</h2>
      {/* ...existing code... */}
      <div className={styles.gridTwoCol}>
        {/* ...existing code... */}
        {/* Trading Account Balance (disabled) */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Trading Account Balance ({market === "India" ? "₹" : "$"})</label>
          <input type="text" value={accountBalance.toLocaleString(undefined, {maximumFractionDigits: 2})} className={styles.input} disabled />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Entry Commission ({market === "India" ? "₹" : "$"})</label>
          <input type="number" name="entryCommission" value={form.entryCommission || 0} onChange={handleChange} className={styles.input} placeholder="0" min="0" disabled={entryDisabled} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Entry Date</label>
          <input type="date" name="entryDate" value={entryDate} onChange={handleChange} max={today} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} disabled={entryDisabled} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Average Price ({market === "India" ? "₹" : "$"})</label>
          <input type="text" name="entryOrderPrice" value={form.entryOrderPrice || ""} onChange={handleChange} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} placeholder="0.00" disabled={entryDisabled} />
          {/* Show current price below input if available */}
          {loadingPrice && <div style={{ color: '#7ecfff', fontSize: '0.95em', marginTop: 2 }}>Fetching current price…</div>}
          {currentPrice && !loadingPrice && (
            <div style={{ color: '#b0b8c9', fontSize: '0.95em', marginTop: 2 }}>
              Current Price: <b style={{ color: '#7ecfff' }}>{currentPrice}</b>
            </div>
          )}
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Quantity</label>
          <input
            type="text"
            name="entryFilledShares"
            value={qtyValue}
            onChange={handleChange}
            className={`${styles.input} ${qtyWarning ? styles.inputWarning : entryDisabled ? styles.inputDisabled : styles.inputEnabled}`}
            placeholder={maxAllowedQty > 0 ? maxAllowedQty : "100"}
            disabled={entryDisabled}
            style={qtyWarning ? { backgroundColor: "orange" } : {}}
          />
          {/* Show calculated quantity below the input */}
          <div style={{ color: '#aaa', fontSize: '0.95em', marginTop: 2 }}>
            Calculated Quantity: <b>{autoQty || 0}</b>
          </div>
          {qtyWarning && (
            <div style={{ color: "orange", fontSize: "0.9em" }}>
              QTY exceeds allowed by risk per trade!
            </div>
          )}
        </div>
      </div>
      {/* Risk Management Section */}
      <div className={styles.gridTwoCol} style={{ marginTop: 32 }}>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Risk per Trade ({market === "India" ? "₹" : "$"} or %)</label>
          <input type="text" name="riskPerTrade" value={riskPerTrade} onChange={handleChange} className={styles.input} placeholder={market === "India" ? "e.g. 2% or ₹1000" : "e.g. 2% or $1000"} disabled={entryDisabled} />
          {/* Show calculated risk per trade amount below the input */}
          <div style={{ color: '#aaa', fontSize: '0.95em', marginTop: 2 }}>
            Risk per Trade Amount: <b>{riskValue.toLocaleString(undefined, {maximumFractionDigits: 2})} {market === "India" ? "₹" : "$"}</b>
          </div>
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Stop Loss Method</label>
          <select name="stopLossMethod" value={stopLossMethod} onChange={handleChange} className={styles.input} disabled={entryDisabled}>
            <option value="ATR">ATR</option>
            <option value="Fixed Value">Fixed Value</option>
            <option value="Fixed %">Fixed %</option>
          </select>
        </div>
        {/* ATR Value field (show only if ATR selected) */}
        {stopLossMethod === "ATR" && (
          <>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>ATR Value</label>
            <input type="number" name="atrValue" value={atrValue} onChange={handleChange} className={styles.input} placeholder="e.g. 10" disabled={entryDisabled} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>ATR Multiplier</label>
            <input type="number" name="atrMultiplier" value={atrMultiplier} onChange={handleChange} className={styles.input} placeholder="e.g. 1.5" min="0.1" step="0.1" disabled={entryDisabled} />
          </div>
          </>
        )}
        {/* Fixed % field (show only if Fixed % selected) */}
        {stopLossMethod === "Fixed %" && (
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Fixed % Value</label>
            <input type="number" name="fixedPercent" value={fixedPercent} onChange={handleChange} className={styles.input} placeholder="e.g. 3" min="0" max="100" disabled={entryDisabled} />
          </div>
        )}
        {/* Stop Loss Price (auto-calculated, always shown) */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Stop Loss Price (auto)</label>
          <input type="text" name="stopLossPrice" value={stopLossPrice} readOnly className={styles.input} />
        </div>
        {/* Targets (auto-calculated) */}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Target 1 (1:2)</label>
          <input type="text" name="target1" value={targets[0]} readOnly className={styles.input} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Target 2 (1:3)</label>
          <input type="text" name="target2" value={targets[1]} readOnly className={styles.input} />
        </div>
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Target 3 (1:4)</label>
          <input type="text" name="target3" value={targets[2]} readOnly className={styles.input} />
        </div>
      </div>
    </div>
  );
}
