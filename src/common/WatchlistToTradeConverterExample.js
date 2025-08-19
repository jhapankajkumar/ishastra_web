import { convertWatchlistToTradeEntryForm, validateWatchlistForConversion } from './WatchlistToTradeConverter';

/**
 * Example Mapping from CONCOR.NS JSON data
 */
const concorExample = {
  symbol: "CONCOR.NS",
  decisionAction: "BUY",
  decisionConfidence: 0.75,
  currentPrice: 545.30,
  executionData: {
    entry: 539.1,
    stop: 517.27,
    target1: 571.85,
    target2: 593.68,
    positionSize: {
      shares: 100,
      value: 53910,
      risk: "1%"
    }
  },
  systemsData: {
    rsiMeanReversion: {
      decision: "BUY",
      confidence: 75,
      systemName: "rsiMeanReversion",
      reasoning: [
        "RSI below 30 indicating oversold condition",
        "Price near strong support level",
        "Volume confirmation present",
        "Risk-reward ratio favorable at 1:1.5"
      ],
      executionPlan: {
        exitStrategy: {
          stopLoss: 517.27,
          targets: [571.85, 593.68],
          rsiExit: "Exit when RSI crosses above 70",
          timeStop: "Exit after 30 days if no target hit",
          atrMultiplier: 2.0
        },
        positionSizing: {
          risk: "1-2% of portfolio at stop loss",
          shares: 100
        }
      }
    },
    elderTripleScreen: {
      decision: "HOLD",
      confidence: 60,
      systemName: "elderTripleScreen",
      reasoning: ["Weekly trend neutral"]
    }
  }
};

/**
 * Test the conversion function
 */
export function testConversion() {
  console.log("🧪 Testing Watchlist to Trade Entry Conversion");
  console.log("==========================================");
  
  // Validate input data
  const validation = validateWatchlistForConversion(concorExample);
  console.log("✅ Validation Result:", validation);
  
  if (validation.isValid) {
    // Convert to trade form
    const tradeForm = convertWatchlistToTradeEntryForm(concorExample);
    
    console.log("🎯 Converted Trade Form Data:");
    console.log("==============================");
    
    console.log("📋 Trade Context:");
    console.log(`  - Instrument Type: ${tradeForm.instrumentType}`);
    console.log(`  - Position Type: ${tradeForm.positionType}`);
    console.log(`  - Setup Type: ${tradeForm.setupType}`);
    console.log(`  - Setup Confidence: ${tradeForm.setupConfidence}`);
    
    console.log("\n📊 Entry & Technical:");
    console.log(`  - Ticker Symbol: ${tradeForm.tickerSymbol}`);
    console.log(`  - Entry Date: ${tradeForm.entryDate}`);
    console.log(`  - Average Price: ₹${tradeForm.averagePrice}`);
    console.log(`  - Quantity: ${tradeForm.quantity} shares`);
    console.log(`  - Position: ${tradeForm.position}`);
    
    console.log("\n⚠️ Risk Management:");
    console.log(`  - Risk Percent: ${tradeForm.riskPercent}`);
    console.log(`  - Stop Loss Method: ${tradeForm.stopLossMethod}`);
    console.log(`  - Stop Loss Price: ₹${tradeForm.stopLossPrice}`);
    console.log(`  - Target 1: ₹${tradeForm.target1}`);
    console.log(`  - Target 2: ₹${tradeForm.target2}`);
    console.log(`  - ATR Multiplier: ${tradeForm.atrMultiplier}`);
    
    console.log("\n🗒️ Notes:");
    console.log(`  - Timeframe Used: ${tradeForm.timeframeUsed}`);
    console.log(`  - Reason for Entry: ${tradeForm.reasonForEntry}`);
    console.log(`  - Additional Notes: ${tradeForm.notes}`);
    
    console.log("\n💰 Risk/Reward Analysis:");
    const riskAmount = tradeForm.averagePrice - tradeForm.stopLossPrice;
    const rewardAmount1 = tradeForm.target1 - tradeForm.averagePrice;
    const rewardAmount2 = tradeForm.target2 - tradeForm.averagePrice;
    const riskRewardRatio1 = (rewardAmount1 / riskAmount).toFixed(2);
    const riskRewardRatio2 = (rewardAmount2 / riskAmount).toFixed(2);
    
    console.log(`  - Risk Amount: ₹${riskAmount.toFixed(2)} per share`);
    console.log(`  - Reward Amount (T1): ₹${rewardAmount1.toFixed(2)} per share`);
    console.log(`  - Reward Amount (T2): ₹${rewardAmount2.toFixed(2)} per share`);
    console.log(`  - Risk/Reward Ratio (T1): 1:${riskRewardRatio1}`);
    console.log(`  - Risk/Reward Ratio (T2): 1:${riskRewardRatio2}`);
    
    return tradeForm;
  } else {
    console.log("❌ Validation failed:", validation.errors);
    return null;
  }
}

// Export for testing
export { concorExample };
