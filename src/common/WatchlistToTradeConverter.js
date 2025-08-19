/**
 * 🧠 Purpose:
 * Convert a BUY signal from the Watchlist API response into a pre-filled Trade Entry form.
 * This includes mapping trade context, setup details, technicals, risk management,
 * and exit strategies (stop loss, targets, RSI exit, time stop).
 * 
 * 🔗 Source API:
 *   - GET /api/watchlist
 * 
 * 🧾 Target Form Fields:
 *   - Trade Context: instrumentType, positionType, setupType, setupConfidence
 *   - Technical Details: tickerSymbol, tickerName, averagePrice, position, quantity, commission
 *   - Risk Management: risk %, stop loss type, ATR config, targets
 *   - Exit Strategy: stop loss, targets, time-based or RSI-based exits
 *   - Notes: reason for entry, extra notes, attached chart
 * 
 * 💡 Instructions:
 * 1. Auto-map fields from winning system (highest confidence BUY) to Trade form.
 * 2. Use `executionData` for position sizing and entry/stop/target prices.
 * 3. Use `executionPlan.exitStrategy` from the system with the BUY decision.
 * 4. Auto-detect `setupType` from the system name: e.g., RSI → "RSI Mean Reversion"
 * 5. Auto-populate reason using system `reasoning`.
 * 6. Map risk %, ATR multiplier, and targets to the Risk Management section.
 * 7. Ensure fallback for stop-loss price if system has it directly.
 * 8. If system has no exit strategy, skip mapping those fields.
 */
export function convertWatchlistToTradeEntryForm(watchlistItem) {
  const tradeForm = {
    // 🧠 Trade Context
    instrumentType: "Stocks",
    positionType: "Swing",
    setupType: null, // e.g. "RSI Mean Reversion"
    setupConfidence: "High", // assume for BUY > 70%

    // 📊 Entry & Technical
    tickerSymbol: watchlistItem.symbol,
    tickerName: "", // could be populated via lookup service
    entryDate: new Date().toISOString().split("T")[0],
    averagePrice: watchlistItem.executionData?.entry || watchlistItem.currentPrice || 0,
    quantity: watchlistItem.executionData?.positionSize?.shares || 0,
    position: "Long (Buy)",
    entryCommission: 0,

    // ⚠️ Risk Management
    riskPercent: watchlistItem.executionData?.positionSize?.risk || "1%",
    stopLossMethod: "ATR", // Default to ATR for better calculations
    atrValue: "10", // Default ATR value - will be updated based on stock price
    atrMultiplier: "1.5", // Default ATR multiplier
    stopLossPrice: watchlistItem.executionData?.stop || 0,
    target1: watchlistItem.executionData?.target1 || 0,
    target2: watchlistItem.executionData?.target2 || 0,
    target3: null,

    // 🗒️ Notes
    timeframeUsed: "Daily",
    reasonForEntry: "",
    notes: "",
    entryChart: null
  };



  // 🏆 Select winning system with decision: BUY
  const systems = watchlistItem.systemsData || {};
  const winningSystem = Object.values(systems).find(s => s?.decision === "BUY");

  if (winningSystem) {
    // Auto-detect setupType from system name and map to Firebase trade_setup_id
    const systemNameMappings = {
      'rsiMeanReversion': 2001, // RSI Mean Reversion
      'elderTripleScreen': 2002, // Elder's Triple Screen
      'minerviniSepa': 2003, // Minervini SEPA
      'cupWithHandle': 2004, // Cup with Handle
      'macdDivergence': 2005, // MACD Divergence
      'breakoutMomentum': 2006, // Breakout Momentum
      'movingAverageCrossover': 2007, // Moving Average Crossover
      'volumeBreakout': 2008 // Volume Breakout
    };

    tradeForm.setupType = systemNameMappings[winningSystem.systemName] || 2003; // Default to Minervini SEPA
    tradeForm.reasonForEntry = Array.isArray(winningSystem.reasoning) 
      ? winningSystem.reasoning.join(", ") 
      : winningSystem.reasoning || "";

    // Map exit strategy if available
    if (winningSystem.executionPlan?.exitStrategy) {
      const exit = winningSystem.executionPlan.exitStrategy;
      
      // Fallback for stop-loss price if system has it directly
      if (exit.stopLoss) tradeForm.stopLossPrice = exit.stopLoss;
      
      // Map targets
      if (exit.targets?.[0]) tradeForm.target1 = exit.targets[0];
      if (exit.targets?.[1]) tradeForm.target2 = exit.targets[1];
      if (exit.targets?.[2]) tradeForm.target3 = exit.targets[2];
      
      // Add RSI exit and time stop to notes (exit conditions)
      if (exit.rsiExit || exit.timeStop) {
        tradeForm.notes +=
          (exit.rsiExit ? `RSI Exit: ${exit.rsiExit}. ` : "") +
          (exit.timeStop ? `Time-based Exit: ${exit.timeStop}.` : "");
      }

      // Add any additional exit conditions to notes
      if (exit.description) {
        tradeForm.notes += ` Exit Strategy: ${exit.description}.`;
      }

      // Map ATR config if available
      if (exit.atrMultiplier) {
        tradeForm.atrMultiplier = exit.atrMultiplier.toString();
        tradeForm.stopLossMethod = "ATR";
        // Set a default ATR value if not provided (typically 2-5% of stock price)
        if (!tradeForm.atrValue && tradeForm.averagePrice) {
          tradeForm.atrValue = (tradeForm.averagePrice * 0.03).toFixed(2); // 3% default
        }
      }
    }

    // Map confidence level
    if (winningSystem.confidence) {
      const confidence = parseFloat(winningSystem.confidence);
      if (confidence >= 80) tradeForm.setupConfidence = "High";
      else if (confidence >= 60) tradeForm.setupConfidence = "Medium";
      else tradeForm.setupConfidence = "Low";
    }
  }

  // Also handle the existing watchlist structure for current data
  if (watchlistItem.decisionAction === "BUY") {
    tradeForm.setupConfidence =  
                               watchlistItem.decisionConfidence >= 0.80 ? "High" :
                               watchlistItem.decisionConfidence >= 0.50 ? "Medium" : "Low";
  }

  return tradeForm;
}

/**
 * Validate watchlist item before conversion
 */
export function validateWatchlistForConversion(watchlistItem) {
  const errors = [];
  const warnings = [];

  // Check for required fields
  if (!watchlistItem?.symbol) {
    errors.push("Symbol is required");
  }

  // Check for BUY signal - check both new format and existing format
  const hasBuyInSystems = watchlistItem?.systemsData && 
    Object.values(watchlistItem.systemsData).some(s => s?.decision === "BUY");
  const hasBuyDecision = watchlistItem?.decisionAction === "BUY";
  
  if (!hasBuyInSystems && !hasBuyDecision) {
    errors.push("No BUY signal found");
  }

  // Check for optional data
  if (!watchlistItem?.executionData?.entry && !watchlistItem?.currentPrice) {
    warnings.push("Entry price not available");
  }

  if (!watchlistItem?.executionData?.stop) {
    warnings.push("Stop loss price not available");
  }

  if (!watchlistItem?.executionData?.target1) {
    warnings.push("Target prices not available");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Helper function to check if watchlist item has BUY signal
 */
export function hasBuySignal(watchlistItem) {
  if (!watchlistItem) return false;
  
  // Check new format (systemsData)
  if (watchlistItem.systemsData) {
    const hasBuyInSystems = Object.values(watchlistItem.systemsData).some(system => system?.decision === "BUY");
    if (hasBuyInSystems) return true;
  }
  
  // Check existing format (decisionAction)
  return watchlistItem.decisionAction === "BUY";
}
