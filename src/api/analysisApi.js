/**
 * Analysis API Service
 * Handles all AI analysis and technical analysis endpoints
 */

import axios from 'axios';
import config from '../config/environment';

// Create a separate API instance for analysis with longer timeout
const AnalysisAPI_Instance = axios.create({
  baseURL: config.API_ENDPOINT,
  timeout: 120000, // 2 minutes timeout for analysis operations
});

// Add request and response interceptors for better error handling
AnalysisAPI_Instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' && error.message.includes('timeout')) {
      return Promise.reject({
        type: 'TIMEOUT_ERROR',
        message: 'Analysis is taking longer than expected. Please try again.',
        originalError: error
      });
    }

    if (!error.response) {
      return Promise.reject({
        type: 'NETWORK_ERROR',
        message: 'Unable to connect to analysis server. Please check your connection.',
        originalError: error
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Get unified AI analysis combining all services
 */
export const getUnifiedAnalysis = async (symbol, period = '3mo', capital = 120000) => {
  try {
    const params = new URLSearchParams({
      symbol: symbol,
      period: period,
      capital: capital,
      isRequiredChartData: true
    });
    const response = await AnalysisAPI_Instance.get(`/trading/signal-analysis?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching unified analysis:', error);
    throw error;
  }
};

/**
 * Get unified AI analysis combining all services
 */
export const getChartData = async (symbol) => {
  try {
    const params = new URLSearchParams({
      symbol: symbol,
    });
    const response = await AnalysisAPI_Instance.get(`/trading/chart?${params}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching chart data:', error);
    throw error;
  }
};

/**
 * Get watchlist with all stocks analysis
 */
export const getWatchlist = async () => {
  try {
    const response = await AnalysisAPI_Instance.get('/watchlist');
    return response.data;
    // return getWatchlistData();
  } catch (error) {
    console.error('Error fetching watchlist:', error);
    throw error;
  }
};

/**
 * Trigger daily scan for watchlist (POST)
 * No input required
 */
export const runWatchlistDailyScan = async () => {
  try {
    const response = await AnalysisAPI_Instance.post('/watchlist/daily-scan');
    return response.data;
  } catch (error) {
    console.error('Error running daily scan:', error);
    throw error;
  }
};

// Export all analysis functions as a default object for convenience
const AnalysisAPI = {
  getUnifiedAnalysis,
  getWatchlist,
  runWatchlistDailyScan,
};

const getWatchlistData = () => {
  return {
    "stocks": [
      {
        "id": 188,
        "symbol": "FIVESTAR.NS",
        "currentPrice": 595.2,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.75,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 83.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (83.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 595.2,
          "stop": 571.09,
          "riskReward": 1.5,
          "target1": 631.36,
          "target2": 655.46,
          "positionSize": {
            "shares": 471,
            "value": 280339,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.83,
            "reasoning": [
              "Cup pattern detected; Waiting for handle formation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.45,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "Bullish continuation divergence: price made higher low with stronger MACD histogram; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 624.96 with ≥491,588M volume",
        "addedAt": "2025-08-18T08:49:50.109Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.109Z",
        "updatedAt": "2025-08-18T08:49:50.110Z"
      },
      {
        "id": 187,
        "symbol": "EMAMILTD.NS",
        "currentPrice": 594.85,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.77,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 85.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (85.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 594.85,
          "stop": 570.76,
          "riskReward": 1.5,
          "target1": 630.99,
          "target2": 655.08,
          "positionSize": {
            "shares": 472,
            "value": 280769,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.85,
            "reasoning": [
              "Cup-with-handle pattern formed; Waiting for volume breakout above resistance"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.56,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "C-"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "Bullish continuation divergence: price made higher low with stronger MACD histogram; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 624.59 with ≥435,162M volume",
        "addedAt": "2025-08-18T08:49:50.108Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.108Z",
        "updatedAt": "2025-08-18T08:49:50.109Z"
      },
      {
        "id": 185,
        "symbol": "CRAFTSMAN.NS",
        "currentPrice": 6812,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.75,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 83.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (75.0%); Minervini SEPA: WATCH (83.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 6812,
          "stop": 6536.11,
          "riskReward": 1.5,
          "target1": 7225.83,
          "target2": 7501.72,
          "positionSize": {
            "shares": 41,
            "value": 279292,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.75,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "B"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.83,
            "reasoning": [
              "Cup pattern detected; Waiting for handle formation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "bearish MACD divergence detected; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 7152.60 with ≥50,268M volume",
        "addedAt": "2025-08-18T08:49:50.107Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.107Z",
        "updatedAt": "2025-08-18T08:49:50.107Z"
      },
      {
        "id": 186,
        "symbol": "CYIENT.NS",
        "currentPrice": 1182,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.77,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 85.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (85.0%); Minervini SEPA: WATCH (74.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 1182,
          "stop": 1134.13,
          "riskReward": 1.5,
          "target1": 1253.81,
          "target2": 1301.68,
          "positionSize": {
            "shares": 237,
            "value": 280134,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.85,
            "reasoning": [
              "Cup-with-handle pattern formed; Waiting for volume breakout above resistance"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.74,
            "reasoning": [
              "bullish MACD divergence detected; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "B"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 1241.10 with ≥155,054M volume",
        "addedAt": "2025-08-18T08:49:50.107Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.107Z",
        "updatedAt": "2025-08-18T08:49:50.108Z"
      },
      {
        "id": 184,
        "symbol": "CASTROLIND.NS",
        "currentPrice": 206.45,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.77,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 85.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (85.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 206.45,
          "stop": 198.09,
          "riskReward": 1.5,
          "target1": 218.99,
          "target2": 227.35,
          "positionSize": {
            "shares": 1360,
            "value": 280772,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.85,
            "reasoning": [
              "Cup-with-handle pattern formed; Waiting for volume breakout above resistance"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "Bearish continuation divergence: price made lower high with weaker MACD histogram; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 216.77 with ≥1,136,519M volume",
        "addedAt": "2025-08-18T08:49:50.106Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.106Z",
        "updatedAt": "2025-08-18T08:49:50.106Z"
      },
      {
        "id": 183,
        "symbol": "BBTC.NS",
        "currentPrice": 1850.9,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.75,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 83.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (83.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 1850.9,
          "stop": 1775.94,
          "riskReward": 1.5,
          "target1": 1963.34,
          "target2": 2038.3,
          "positionSize": {
            "shares": 151,
            "value": 279486,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.83,
            "reasoning": [
              "Cup pattern detected; Waiting for handle formation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.38,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "Bearish continuation divergence: price made lower high with weaker MACD histogram; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 1943.45 with ≥29,847M volume",
        "addedAt": "2025-08-18T08:49:50.105Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.105Z",
        "updatedAt": "2025-08-18T08:49:50.106Z"
      },
      {
        "id": 182,
        "symbol": "BLUESTARCO.NS",
        "currentPrice": 1919.9,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.77,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 85.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (85.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 1919.9,
          "stop": 1842.14,
          "riskReward": 1.5,
          "target1": 2036.53,
          "target2": 2114.29,
          "positionSize": {
            "shares": 146,
            "value": 280305,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.85,
            "reasoning": [
              "Valid cup pattern (65 days, 12.8% depth); Handle formation confirmed (15 days); Volume breakout (1.9x average); Strong close (78% of range); Pattern failed additional quality checks (volume dry-up, earnings proximity, or structure)"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.43,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "Bullish continuation divergence: price made higher low with stronger MACD histogram; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 2015.90 with ≥2,166,747M volume",
        "addedAt": "2025-08-18T08:49:50.104Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.104Z",
        "updatedAt": "2025-08-18T08:49:50.105Z"
      },
      {
        "id": 181,
        "symbol": "BAJAJHLDNG.NS",
        "currentPrice": 14690,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.77,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 85.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (60.0%); Minervini SEPA: WATCH (85.0%); Minervini SEPA: WATCH (61.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 14690,
          "stop": 14095.06,
          "riskReward": 1.5,
          "target1": 15582.42,
          "target2": 16177.36,
          "positionSize": {
            "shares": 19,
            "value": 279110,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.6,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "C"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.85,
            "reasoning": [
              "Cup-with-handle pattern formed; Waiting for volume breakout above resistance"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.43,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.61,
            "reasoning": [
              "bullish MACD divergence detected; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "C"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 15424.50 with ≥85,925M volume",
        "addedAt": "2025-08-18T08:49:50.102Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.102Z",
        "updatedAt": "2025-08-18T08:49:50.103Z"
      },
      {
        "id": 180,
        "symbol": "ANANTRAJ.NS",
        "currentPrice": 541.6,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.75,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 83.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (83.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 541.6,
          "stop": 519.67,
          "riskReward": 1.5,
          "target1": 574.5,
          "target2": 596.44,
          "positionSize": {
            "shares": 518,
            "value": 280549,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.83,
            "reasoning": [
              "Cup pattern detected; Waiting for handle formation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.43,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "Bearish continuation divergence: price made lower high with weaker MACD histogram; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 568.68 with ≥934,415M volume",
        "addedAt": "2025-08-18T08:49:50.101Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.101Z",
        "updatedAt": "2025-08-18T08:49:50.102Z"
      },
      {
        "id": 179,
        "symbol": "ACMESOLAR.NS",
        "currentPrice": 280.3,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "WATCH",
        "decisionConfidence": 0.75,
        "decisionGrade": "B",
        "decisionReasoning": "HIGH CONVICTION PATTERN_SYSTEM: Cup-with-Handle at 83.0% confidence overrides consensus; Position sizing: 75% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: WATCH (83.0%); Minervini SEPA: WATCH (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 280.3,
          "stop": 268.95,
          "riskReward": 1.5,
          "target1": 297.33,
          "target2": 308.68,
          "positionSize": {
            "shares": 1002,
            "value": 280861,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "WATCH",
            "confidence": 0.83,
            "reasoning": [
              "Cup pattern detected; Waiting for handle formation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "BREAKOUT_PENDING",
                "method": "Set alert above handle resistance",
                "conditions": [
                  "Wait for volume breakout",
                  "Confirm strong close"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.38,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "WATCH",
            "confidence": 0.8,
            "reasoning": [
              "Bearish continuation divergence: price made lower high with weaker MACD histogram; Waiting for candle confirmation"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "WATCH",
              "entryStrategy": {
                "type": "PENDING_CONFIRMATION",
                "method": "Wait for candle confirmation",
                "conditions": [
                  "Monitor for reversal candle",
                  "Watch for volume increase",
                  "Confirm trend change"
                ]
              },
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 2,
        "nextStepSummary": "Watch for breakout above 294.31 with ≥966,876M volume",
        "addedAt": "2025-08-18T08:49:50.100Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.100Z",
        "updatedAt": "2025-08-18T08:49:50.101Z"
      },
      {
        "id": 178,
        "symbol": "TRITURBINE.NS",
        "currentPrice": 518.4,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "BUY",
        "decisionConfidence": 0.66,
        "decisionGrade": "C",
        "decisionReasoning": "Weighted analysis favors BUY (66.2% confidence, 40% threshold); Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: BUY (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 518.4,
          "stop": 497.4,
          "riskReward": 1.5,
          "target1": 549.89,
          "target2": 570.89,
          "positionSize": {
            "shares": 541,
            "value": 280454,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "No valid cup-with-handle pattern detected"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "BUY",
            "confidence": 0.8,
            "reasoning": [
              "RSI oversold bounce (27.0); Price near SWING_LOW support; Bullish candle structure confirmed"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "BUY",
              "entryStrategy": {
                "type": "MEAN_REVERSION",
                "method": "Market order on oversold bounce confirmation",
                "conditions": [
                  "RSI oversold and rising",
                  "Price near support",
                  "Bullish candle structure"
                ]
              },
              "exitStrategy": {
                "stopLoss": 497.66,
                "targets": [
                  559.87,
                  580.61
                ],
                "timeStop": "Review if no bounce within 3-5 days",
                "rsiExit": "Consider partial exit when RSI reaches 50-60"
              },
              "positionSizing": {
                "risk": "1-2% of portfolio at stop loss",
                "recommendation": "HALF"
              }
            },
            "grade": "A"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "AVOID",
            "confidence": 0.3,
            "reasoning": [
              "No valid MACD divergences detected"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          }
        },
        "status": "ACTIVE",
        "priority": 1,
        "nextStepSummary": "Execute buy order at market with 503-534 range",
        "addedAt": "2025-08-18T08:49:50.099Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.099Z",
        "updatedAt": "2025-08-18T08:49:50.100Z"
      },
      {
        "id": 177,
        "symbol": "CONCOR.NS",
        "currentPrice": 539.1,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "BUY",
        "decisionConfidence": 0.66,
        "decisionGrade": "C",
        "decisionReasoning": "Weighted analysis favors BUY (66.2% confidence, 40% threshold); Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: BUY (80.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 539.1,
          "stop": 517.27,
          "riskReward": 1.5,
          "target1": 571.85,
          "target2": 593.68,
          "positionSize": {
            "shares": 520,
            "value": 280332,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "No valid cup-with-handle pattern detected"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "BUY",
            "confidence": 0.8,
            "reasoning": [
              "RSI oversold bounce (28.4); Price near SWING_LOW support; Bullish candle structure confirmed"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "BUY",
              "entryStrategy": {
                "type": "MEAN_REVERSION",
                "method": "Market order on oversold bounce confirmation",
                "conditions": [
                  "RSI oversold and rising",
                  "Price near support",
                  "Bullish candle structure"
                ]
              },
              "exitStrategy": {
                "stopLoss": 517.54,
                "targets": [
                  582.23,
                  603.79
                ],
                "timeStop": "Review if no bounce within 3-5 days",
                "rsiExit": "Consider partial exit when RSI reaches 50-60"
              },
              "positionSizing": {
                "risk": "1-2% of portfolio at stop loss",
                "recommendation": "HALF"
              }
            },
            "grade": "A"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "AVOID",
            "confidence": 0.3,
            "reasoning": [
              "No valid MACD divergences detected"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          }
        },
        "status": "ACTIVE",
        "priority": 1,
        "nextStepSummary": "Execute buy order at market with 523-555 range",
        "addedAt": "2025-08-18T08:49:50.098Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.098Z",
        "updatedAt": "2025-08-18T08:49:50.099Z"
      },
      {
        "id": 176,
        "symbol": "PHOENIXLTD.NS",
        "currentPrice": 1496,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "BUY",
        "decisionConfidence": 0.83,
        "decisionGrade": "A",
        "decisionReasoning": "HIGH CONVICTION INDICATOR_SYSTEM: MACD Divergence at 92.0% confidence overrides consensus; Position sizing: 60% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: BUY (92.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 1496,
          "stop": 1435.41,
          "riskReward": 1.5,
          "target1": 1586.88,
          "target2": 1647.47,
          "positionSize": {
            "shares": 187,
            "value": 279752,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "No valid cup-with-handle pattern detected"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.61,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "C"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "BUY",
            "confidence": 0.92,
            "reasoning": [
              "Bullish MACD divergence detected; Confirmed with bullish candle structure; Divergence strength: 100%"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "BUY",
              "entryStrategy": {
                "type": "DIVERGENCE",
                "method": "Market order on bullish divergence confirmation",
                "conditions": [
                  "BULLISH MACD divergence",
                  "Candle confirmation",
                  "Volume support"
                ]
              },
              "exitStrategy": {
                "stopLoss": 1374.45,
                "targets": [
                  1739.1,
                  1860.65
                ],
                "timeStop": "Review if no follow-through within 5-7 days",
                "macdExit": "Consider exit when MACD turns negative"
              },
              "positionSizing": {
                "risk": "1-2% of portfolio at stop loss",
                "recommendation": "HALF"
              }
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 1,
        "nextStepSummary": "Execute buy order at market with 1451-1541 range",
        "addedAt": "2025-08-18T08:49:50.097Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.097Z",
        "updatedAt": "2025-08-18T08:49:50.098Z"
      },
      {
        "id": 175,
        "symbol": "GODREJCP.NS",
        "currentPrice": 1222.7,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "BUY",
        "decisionConfidence": 0.83,
        "decisionGrade": "A",
        "decisionReasoning": "HIGH CONVICTION INDICATOR_SYSTEM: MACD Divergence at 92.0% confidence overrides consensus; Position sizing: 60% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (35.0%); Minervini SEPA: BUY (92.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 1222.7,
          "stop": 1173.18,
          "riskReward": 1.5,
          "target1": 1296.98,
          "target2": 1346.5,
          "positionSize": {
            "shares": 229,
            "value": 279998,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.35,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "No valid cup-with-handle pattern detected"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.61,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "C"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "BUY",
            "confidence": 0.92,
            "reasoning": [
              "Bullish MACD divergence detected; Confirmed with bullish candle structure; Divergence strength: 100%"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "BUY",
              "entryStrategy": {
                "type": "DIVERGENCE",
                "method": "Market order on bullish divergence confirmation",
                "conditions": [
                  "BULLISH MACD divergence",
                  "Candle confirmation",
                  "Volume support"
                ]
              },
              "exitStrategy": {
                "stopLoss": 1136.41,
                "targets": [
                  1395.28,
                  1481.58
                ],
                "timeStop": "Review if no follow-through within 5-7 days",
                "macdExit": "Consider exit when MACD turns negative"
              },
              "positionSizing": {
                "risk": "1-2% of portfolio at stop loss",
                "recommendation": "HALF"
              }
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 1,
        "nextStepSummary": "Execute buy order at market with 1186-1259 range",
        "addedAt": "2025-08-18T08:49:50.095Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.095Z",
        "updatedAt": "2025-08-18T08:49:50.096Z"
      },
      {
        "id": 174,
        "symbol": "DATAPATTNS.NS",
        "currentPrice": 2601.9,
        "currency": "INR",
        "market": "IN",
        "decisionAction": "BUY",
        "decisionConfidence": 0.83,
        "decisionGrade": "A",
        "decisionReasoning": "HIGH CONVICTION INDICATOR_SYSTEM: MACD Divergence at 92.0% confidence overrides consensus; Position sizing: 60% due to system classification; Minervini SEPA: HOLD (40.0%); Minervini SEPA: HOLD (40.0%); Minervini SEPA: BUY (92.0%)",
        "systemsAgreement": "PARTIAL",
        "systemsAnalyzed": 5,
        "executionData": {
          "entry": 2601.9,
          "stop": 2496.52,
          "riskReward": 1.5,
          "target1": 2759.97,
          "target2": 2865.34,
          "positionSize": {
            "shares": 107,
            "value": 278403,
            "risk": "0.8%"
          }
        },
        "systemsData": {
          "elderTripleScreen": {
            "system": "triple_screen",
            "systemName": "Elder's Triple Screen",
            "decision": "HOLD",
            "confidence": 0.4,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "minerviniSEPA": {
            "system": "sepa_method",
            "systemName": "Minervini SEPA",
            "decision": "HOLD",
            "confidence": 0.39999999999999997,
            "reasoning": [
              "Analysis complete"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": null,
            "grade": "D"
          },
          "cupWithHandle": {
            "system": "cup_handle",
            "systemName": "Cup-with-Handle",
            "decision": "AVOID",
            "confidence": 0.25,
            "reasoning": [
              "No valid cup-with-handle pattern detected"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "D"
          },
          "rsiMeanReversion": {
            "system": "rsi_mean",
            "systemName": "RSI Mean Reversion",
            "decision": "AVOID",
            "confidence": 0.51,
            "reasoning": [
              "RSI mean reversion conditions not met"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "AVOID",
              "entryStrategy": null,
              "exitStrategy": null,
              "positionSizing": null
            },
            "grade": "C-"
          },
          "macdDivergence": {
            "system": "divergence",
            "systemName": "MACD Divergence",
            "decision": "BUY",
            "confidence": 0.92,
            "reasoning": [
              "Bullish MACD divergence detected; Confirmed with bullish candle structure; Divergence strength: 100%"
            ],
            "riskReward": {
              "currentPrice": 0,
              "stopLoss": null,
              "target1": null,
              "target2": null,
              "riskReward": 0,
              "riskAmount": 0
            },
            "executionPlan": {
              "action": "BUY",
              "entryStrategy": {
                "type": "DIVERGENCE",
                "method": "Market order on bullish divergence confirmation",
                "conditions": [
                  "BULLISH MACD divergence",
                  "Candle confirmation",
                  "Volume support"
                ]
              },
              "exitStrategy": {
                "stopLoss": 2303.98,
                "targets": [
                  3197.74,
                  3495.66
                ],
                "timeStop": "Review if no follow-through within 5-7 days",
                "macdExit": "Consider exit when MACD turns negative"
              },
              "positionSizing": {
                "risk": "1-2% of portfolio at stop loss",
                "recommendation": "HALF"
              }
            },
            "grade": "A"
          }
        },
        "status": "ACTIVE",
        "priority": 1,
        "nextStepSummary": "Execute buy order at market with 2524-2680 range",
        "addedAt": "2025-08-18T08:49:50.090Z",
        "lastAnalyzedAt": "2025-08-18T08:49:50.090Z",
        "updatedAt": "2025-08-18T08:49:50.091Z"
      }
    ],
    "pagination": {
      "total": 15,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    },
    "filters": {},
    "sort": {
      "field": "addedAt",
      "order": "desc"
    }
  }

}

export default AnalysisAPI;
