import React from "react";
import TickerSearch from "../TickerSearch";
import RiskManagementSection from './RiskManagementSection';

export default function TradePlanSection({ form, handleChange, handleTickerChange, handleTickerSelect, entryDisabled, today, styles, openTrades, isPopulated, capitalData, capitalLoading, hideRiskManagement }) {
  // console.log("TradePlanSection Rendered");

  // --- Logic for dynamic fields and calculations ---
  const stopLossMethod = form.stopLossMethod === "Fixed Value" ? "Fixed Value" : "Fixed %";
  // Ensure outdated values like ATR are normalized
  React.useEffect(() => {
    if (form.stopLossMethod !== stopLossMethod) {
      handleChange({ target: { name: "stopLossMethod", value: stopLossMethod } });
    }
  }, [form.stopLossMethod, stopLossMethod, handleChange]);

  const hasFixedPercent = form.fixedPercent !== undefined && form.fixedPercent !== null && form.fixedPercent !== "";
  const fixedPercentValue = hasFixedPercent ? form.fixedPercent : "5";
  const fixedPercentNumeric = parseFloat(fixedPercentValue) || 0;

  React.useEffect(() => {
    if (!hasFixedPercent && stopLossMethod === "Fixed %") {
      handleChange({ target: { name: "fixedPercent", value: "5" } });
    }
  }, [hasFixedPercent, stopLossMethod, handleChange]);

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

  // Risk per trade - user-selectable
  const riskPctStr = (form.riskPerTrade || "1.0").replace('%', '').trim();
  const riskPct = parseFloat(riskPctStr) || 1.0;
  const riskValue = accountBalance * riskPct / 100;

  // Track manual edits
  const [qtyManuallyEdited, setQtyManuallyEdited] = React.useState(false);

  const handleTradePlanChange = React.useCallback(
    (e) => {
      const { name } = e.target;
      if (name === "entryFilledShares" && !qtyManuallyEdited) {
        setQtyManuallyEdited(true);
      }
      handleChange(e);
    },
    [handleChange, qtyManuallyEdited]
  );

  // Calculate stop loss value
  const manualStopLossPrice = parseFloat(form.stopLossPrice);
  let stopLossValue = 0;
  if (stopLossMethod === "Fixed Value" && entryPrice && manualStopLossPrice) {
    stopLossValue = Math.abs(entryPrice - manualStopLossPrice);
  } else if (stopLossMethod === "Fixed %" && entryPrice) {
    stopLossValue = entryPrice * (fixedPercentNumeric / 100);
  }

  // console.log(`Stop Loss Value: ${stopLossValue}, Entry Price: ${entryPrice}, Direction: ${direction}`);
  
  // Calculate actual risk per share (difference between entry price and stop loss price)
  let riskPerShare = 0;
  if (stopLossMethod === "Fixed %" && entryPrice) {
    riskPerShare = stopLossValue; // For fixed %, stopLossValue is already the risk per share
  } else if (stopLossMethod === "Fixed Value" && entryPrice && stopLossValue) {
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
  let stopLossPrice = "";
  // If the calculated autoQty changes and user hasn't entered a value, update the form value
  React.useEffect(() => {
    // Skip auto-calculation if data is populated from watchlist
    if (isPopulated) {
      console.log('🔒 Skipping quantity auto-calculation - data from watchlist');
      return;
    }

    if (qtyManuallyEdited) {
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
  }, [autoQty, stopLossValue, form.entryFilledShares, handleChange, isPopulated, qtyManuallyEdited]);

  // Warn if user QTY > maxAllowedQty
  // Calculate stop loss price
  
  let computedStopLossPrice = "";
  if (stopLossMethod === "Fixed %" && entryPrice && stopLossValue) {
    computedStopLossPrice = direction === "Long"
      ? (entryPrice - stopLossValue).toFixed(2)
      : (entryPrice + stopLossValue).toFixed(2);
  }

  if (stopLossMethod === "Fixed Value") {
    stopLossPrice = form.stopLossPrice || "";
  } else {
    stopLossPrice = computedStopLossPrice;
  }

  React.useEffect(() => {
    // Skip auto-calculation if data is populated from watchlist
    if (isPopulated) {
      console.log('🔒 Skipping stop loss auto-calculation - data from watchlist');
      return;
    }

    if (stopLossMethod === "Fixed Value") {
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
  }, [stopLossPrice, form.stopLossPrice, handleChange, isPopulated, stopLossMethod]);


  // Calculate targets (1:2, 1:3, 1:4)
  const targets = [2, 3, 4].map(mult => {
    if (!stopLossValue || !entryPrice) return "";
    const directionFactor = direction === "Long" ? 1 : -1;
    return (entryPrice + directionFactor * stopLossValue * mult).toFixed(2);
  });

  React.useEffect(() => {
    // Skip auto-calculation if data is populated from watchlist
    if (isPopulated) return;
    if (!entryPrice || !stopLossValue) return;

    const entry = parseFloat(entryPrice);
    const risk = parseFloat(stopLossValue);
    if (!entry || !risk) return;

    const dirFactor = direction === "Long" ? 1 : -1;
    const t1 = (entry + dirFactor * risk * 2).toFixed(2);
    const t2 = (entry + dirFactor * risk * 3).toFixed(2);
    const t3 = (entry + dirFactor * risk * 4).toFixed(2);

    handleChange({ target: { name: "target1", value: t1 } });
    handleChange({ target: { name: "target2", value: t2 } });
    handleChange({ target: { name: "target3", value: t3 } });
  }, [entryPrice, stopLossValue, direction, handleChange, isPopulated]);

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
            <input type="date" name="entryDate" value={entryDate} onChange={handleTradePlanChange} max={today} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} disabled={entryDisabled} />
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Average Price ({market === "India" ? "₹" : "$"})</label>
            <input type="text" name="entryOrderPrice" value={form.entryOrderPrice || ""} onChange={handleTradePlanChange} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} placeholder="0.00" disabled={entryDisabled} />
          </div>
          {/* Quantity */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Quantity</label>
            <input type="text" name="entryFilledShares" value={form.entryFilledShares || ""} onChange={handleTradePlanChange} className={`${styles.input} ${entryDisabled ? styles.inputDisabled : styles.inputEnabled}`} placeholder="100" disabled={entryDisabled} />
          </div>
          
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Entry Commission ({market === "India" ? "₹" : "$"})</label>
            <input
              type="text"
              name="entryCommission"
              value={form.entryCommission || ""}
              onChange={handleTradePlanChange}
              className={styles.input}
              placeholder="0.00"
              disabled={entryDisabled}
            />
          </div>
        </div>
      </div>
      {!hideRiskManagement && (
        <RiskManagementSection
          handleChange={handleTradePlanChange}
          entryDisabled={entryDisabled}
          styles={styles}
          stopLossMethod={stopLossMethod}
          fixedPercent={fixedPercentValue}
          stopLossPrice={stopLossPrice}
          targets={targets}
          riskPerTrade={form.riskPerTrade || "1.0"}
          riskValue={riskValue}
          accountBalance={accountBalance}
          market={market}
        />
      )}
    </>
  );
}
