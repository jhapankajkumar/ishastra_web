import React from "react";
import TickerSearch from "../TickerSearch";
import RiskManagementSection from './RiskManagementSection';

export default function TradePlanSection({ form, handleChange, handleTickerChange, handleTickerSelect, entryDisabled, today, styles, openTrades, isPopulated, capitalData, capitalLoading }) {
  // console.log("TradePlanSection Rendered");

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
  
  // Get actual capital data or fallback to hardcoded values
  let remainingCapital = 0;
  if (capitalData && !capitalLoading) {
    // Find capital data for the current market's currency
    const currency = market === "India" ? "INR" : "USD";
    const capitalInfo = capitalData.find(cap => cap.currency === currency);
    remainingCapital = capitalInfo ? capitalInfo.remaining : (market === "India" ? 1000000 : 120000);
  } else {
    // Fallback to hardcoded values if capital data is not available
    remainingCapital = market === "India" ? 2000000 : 200000;
  }
  
  // Calculate remaining account balance (using actual remaining capital from API)
  const accountBalance = remainingCapital;
  console.log(`Account Balance: ${accountBalance}`);

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

  // console.log(`Stop Loss Value: ${stopLossValue}, Entry Price: ${entryPrice}, Direction: ${direction}`);
  
  // Calculate actual risk per share (difference between entry price and stop loss price)
  let riskPerShare = 0;
  if (stopLossMethod === "ATR" && atrValue && entryPrice) {
    const atrStop = (parseFloat(atrValue) || 0) * atrMultiplier;
    riskPerShare = atrStop; // This is the actual risk per share
  } else if (stopLossMethod === "Fixed %" && fixedPercent && entryPrice) {
    riskPerShare = stopLossValue; // For fixed %, stopLossValue is already the risk per share
  } else if (stopLossMethod === "Fixed Value" && entryPrice) {
    riskPerShare = stopLossValue; // For fixed value, stopLossValue is the risk per share
  }
  
  // Calculate max allowed QTY based on risk per trade
  let maxAllowedQty = 0;
  if (riskPerShare > 0) {
    maxAllowedQty = Math.floor(riskValue / riskPerShare);
    console.log(`Quantity calculation: riskValue=${riskValue}, riskPerShare=${riskPerShare}, maxAllowedQty=${maxAllowedQty}`);
  }

  // Calculate auto QTY if not set or if entryPrice/stopLossValue changes
  let autoQty = maxAllowedQty > 0 ? maxAllowedQty : "";
  // console.log(`Auto QTY: ${autoQty}, Max Allowed QTY: ${maxAllowedQty}, Risk Value: ${riskValue}, Stop Loss Value: ${stopLossValue}`);
  // Use autoQty if user hasn't manually changed QTY, and update as price changes
  // If user manually enters a value, use that, otherwise always use autoQty
  const qtyValue = (form.entryFilledShares === undefined || form.entryFilledShares === null || form.entryFilledShares === "") ? autoQty : form.entryFilledShares;
  let stopLossPrice = "";
  // If the calculated autoQty changes and user hasn't entered a value, update the form value
  React.useEffect(() => {
    // Skip auto-calculation if data is populated from watchlist
    if (isPopulated) {
      console.log('🔒 Skipping quantity auto-calculation - data from watchlist');
      return;
    }
    
    // Only auto-calculate quantity if it's empty or zero
    // If there's already a meaningful value, preserve it (from watchlist or user input)
    const current = form.entryFilledShares;
    const hasValidQuantity = current && current !== "" && current !== "0" && parseFloat(current) > 0;
    
    if (hasValidQuantity) {
      console.log(`Preserving existing quantity: ${current}`);
      return;
    }
    
    // Only calculate if we have no valid quantity and autoQty is available
    if (autoQty > 0) {
        console.log(`Auto-calculating entryFilledShares: ${current} -> ${autoQty}`);
        handleChange({ target: { name: "entryFilledShares", value: String(autoQty) } });
    }
  }, [autoQty, stopLossValue, form.entryFilledShares, handleChange, isPopulated]);

  // Warn if user QTY > maxAllowedQty
  const qtyWarning = parseFloat(form.entryFilledShares) > maxAllowedQty;

  // Calculate stop loss price
  
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

  React.useEffect(() => {
    // Skip auto-calculation if data is populated from watchlist
    if (isPopulated) {
      console.log('🔒 Skipping stop loss auto-calculation - data from watchlist');
      return;
    }
    
    // Only auto-calculate stop loss if it's empty or zero
    // If there's already a meaningful value, preserve it (from watchlist or user input)
    const hasValidStopLoss = form.stopLossPrice && form.stopLossPrice !== "" && form.stopLossPrice !== "0" && parseFloat(form.stopLossPrice) > 0;
    
    if (hasValidStopLoss) {
      console.log(`Preserving existing stop loss: ${form.stopLossPrice}`);
      return;
    }
    
    // Only calculate if we have no valid stop loss and calculated stopLossPrice is available
    if (stopLossPrice && stopLossPrice !== "0") {
      console.log(`Auto-calculating stopLossPrice: ${form.stopLossPrice} -> ${stopLossPrice}`);
      handleChange({
        target: {
          name: "stopLossPrice",
          value: stopLossPrice,
        },
      });
    }
  }, [stopLossPrice, form.stopLossPrice, handleChange, isPopulated]);


  // Calculate targets (1:2, 1:3, 1:4)
  const targets = [2, 3, 4].map(mult => {
    if (!stopLossValue || !entryPrice) return "";
    if (direction === "Long") {
      return (entryPrice + stopLossValue * mult).toFixed(2);
    } else {
      return (entryPrice - stopLossValue * mult).toFixed(2);
    }
  });

  React.useEffect(() => {
    // Skip auto-calculation if data is populated from watchlist
    if (isPopulated) {
      console.log('🔒 Skipping targets auto-calculation - data from watchlist');
      return;
    }
    
    // Only auto-calculate targets if they're empty or zero
    // If there are already meaningful values, preserve them (from watchlist or user input)
    if (!entryPrice || !stopLossValue) return;

    const hasValidTargets = (form.target1 && form.target1 !== "" && form.target1 !== "0" && parseFloat(form.target1) > 0) ||
                           (form.target2 && form.target2 !== "" && form.target2 !== "0" && parseFloat(form.target2) > 0);

    if (hasValidTargets) {
      console.log(`Preserving existing targets: T1=${form.target1}, T2=${form.target2}, T3=${form.target3}`);
      return;
    }

    // Calculate targets only if we have no valid targets
    const entry = parseFloat(entryPrice);
    const risk = parseFloat(stopLossValue); // Risk per share

    const t1 = (entry + risk * 2).toFixed(2);
    const t2 = (entry + risk * 3).toFixed(2);
    const t3 = (entry + risk * 4).toFixed(2);

    console.log(`Auto-calculating targets: T1=${t1}, T2=${t2}, T3=${t3}`);
    handleChange({ target: { name: "target1", value: t1 } });
    handleChange({ target: { name: "target2", value: t2 } });
    handleChange({ target: { name: "target3", value: t3 } });
  }, [entryPrice, stopLossValue, form.target1, form.target2, form.target3, handleChange, isPopulated]);

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
