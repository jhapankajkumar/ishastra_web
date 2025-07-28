



import React from "react";
import TickerSearch from "../TickerSearch";
import { getCurrentPrice, getATR, getTechnicalIndicators } from '../../api/tickerApi';
import RiskManagementSection from './RiskManagementSection';

export default function TradePlanSection({ form, handleChange, handleTickerChange, handleTickerSelect, entryDisabled, today, styles, openTrades }) {
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
  const openInvested = openTrades && Array.isArray(openTrades) ? openTrades.reduce((sum, t) => {
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
    if ((form.entryFilledShares === undefined || form.entryFilledShares === null || form.entryFilledShares === "") && autoQty !== "") {
      handleChange({ target: { name: "entryFilledShares", value: String(autoQty) } });
    }
  }, [autoQty, maxAllowedQty, entryPrice, stopLossValue, riskValue, form.entryFilledShares, handleChange]);

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
    <>
      <div className={styles.cardSection}>
        <h2 className={styles.sectionTitle}>Entry & Technical Details</h2>
        <div className={styles.gridTwoCol}>
          {/* Ticker Symbol */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Ticker Symbol</label>
            {entryDisabled ? (
              <input type="text" value={form.ticker} className={`${styles.input} ${styles.inputDisabled}`} disabled readOnly />
            ) : (
              <TickerSearch
                value={form.ticker}
                onChange={handleTickerChange}
                onSelect={tickerObj => {
                  if (handleTickerSelect) handleTickerSelect(tickerObj);
                  if (tickerObj && tickerObj.currency && handleChange) {
                    let newMarket = tickerObj.currency === 'INR' ? 'India' : 'US';
                    if (form.market !== newMarket) {
                      handleChange({ target: { name: 'market', value: newMarket } });
                    }
                  }
                }}
                placeholder="Search ticker (e.g. AAPL, RELIANCE)"
                instrumentType={form.instrumentType}
              />
            )}
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Ticker Name</label>
            <input
              type="text"
              name="companyName"
              value={form.companyName}
              className={`${styles.input} ${styles.inputDisabled}`}
              placeholder="Auto-populated when ticker is selected"
              disabled
              readOnly
            />
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
          {/* Quantity */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Quantity</label>
            <input type="text" name="entryFilledShares" value={form.entryFilledShares || ""} onChange={handleChange} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} placeholder="100" disabled={entryDisabled} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Position</label>
            <select name="direction" value={form.direction} onChange={handleChange} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} disabled={entryDisabled}>
              <option value="Long">Long (Buy)</option>
              <option value="Short">Short (Sell)</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Entry Commission ({market === "India" ? "₹" : "$"})</label>
            <input type="number" name="entryCommission" value={form.entryCommission || 0} onChange={handleChange} className={styles.input} placeholder="0" min="0" disabled={entryDisabled} />
          </div>
        </div>
      </div>
      <RiskManagementSection
        form={form}
        handleChange={handleChange}
        entryDisabled={entryDisabled}
        today={today}
        styles={styles}
        currentPrice={currentPrice}
        loadingPrice={loadingPrice}
        atrValue={atrValue}
        atrMultiplier={atrMultiplier}
        stopLossMethod={stopLossMethod}
        fixedPercent={fixedPercent}
        stopLossPrice={stopLossPrice}
        targets={targets}
        riskPerTrade={riskPerTrade}
        riskValue={riskValue}
        market={market}
        qtyValue={qtyValue}
        autoQty={autoQty}
        maxAllowedQty={maxAllowedQty}
        qtyWarning={qtyWarning}
      />
    </>
  );
}
