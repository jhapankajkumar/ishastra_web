import React, { useState, useEffect } from "react";
import TradeContextSection from "../../components/tradeLogSections/TradeContextSection";
import TradePlanSection from "../../components/tradeLogSections/TradePlanSection";
import NotesSection from "../../components/tradeLogSections/NotesSection";
import PostTradeAnalysisSection from "../../components/tradeLogSections/PostTradeAnalysisSection";
import TechnicalIndicators from "../../components/TechnicalIndicators";
import { useNavigate } from "react-router-dom";
import styles from "./TradeAdd.module.css";
import PageHeader from "../../components/PageHeader";
import { createTrade, updateTrade, addPostAnalysis } from '../../api/tradeApi';
import { fetchExitTactics, fetchSetups } from '../../api/firebaseMetaApi';
import { getCurrentPrice, getATR, getTechnicalIndicators } from '../../api/tickerApi';
import { useNotification } from '../../components/NotificationProvider';
import ErrorPage from '../../components/ErrorPage';
import { getTickerBySymbol } from '../../data/tickerData';

const initialState = {
  tradeId: "",
  currency: "USD",
  entryCommission: 0,
  ticker: "",
  companyName: "",
  instrumentType: "Stocks",
  market: "India",
  positionType: "Swing",
  direction: "Long", // Default to Long (capitalized to match backend)
  reasonForEntry: "",
  entryDate: new Date().toISOString().split('T')[0], // Default to today's date in YYYY-MM-DD format
  entryCharts: [],
  entryOrderPrice: "",
  entryFilledShares: "",
  exitDate: "",
  exitOrderPrice: "",
  exitFilledShares: "",
  reasonForExit: "",
  exitTactic: "",
  exitCharts: [],
  postTradeFiles: [],
  setupType: "",
  timeframesUsed: [],
  riskPerTrade: "1.5%",
  stopLossPrice: "",
  stopLossMethod: "ATR",
  atrMultiplier: 1.5,
  target1: "",
  target2: "",
  target3: "",
  atrValue: "",
  setupConfidence: "",
  exitEmotionalState: "",
  exitMistake: false,
  exitMistakeNotes: "",
  exitLessons: "",
  exitConfidence: "",
  exitNotes: "",
  tradeStatus: "Planned",
  tradeSetupId: 2001, // Use tradeSetupId directly
};

function mapTradeDataToForm(tradeData) {
  // Use tradeSetupId directly since that's what we store and what the dropdown uses
  const setupValue = tradeData.tradeSetupId || "";
  
  // Helper function to safely format dates for input[type="date"]
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      
      // Return date in YYYY-MM-DD format required by input[type="date"]
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Error formatting date:', error);
      return "";
    }
  };
  
  return {
    ...initialState,
    ticker: tradeData.ticker || "",
    companyName: tradeData.ticker ? (getTickerBySymbol(tradeData.ticker)?.name || "") : "",
    direction: tradeData.direction || "Long",
    reasonForEntry: tradeData.reasonForEntry || "",
    entryDate: formatDateForInput(tradeData.entryDate),
    entryOrderPrice: tradeData.entryOrderPrice ?? "",
    entryFilledShares: tradeData.entryFilledShares ?? tradeData.quantity ?? "",
    exitDate: formatDateForInput(tradeData.exitDate),
    exitOrderPrice: tradeData.exitOrderPrice ?? "",
    exitFilledShares: tradeData.exitFilledShares ?? "",
    reasonForExit: tradeData.reasonForExit ?? "",
    exitTactic: tradeData.exitTacticId ?? "",
    postTradeAnalysis: tradeData.postTradeAnalysis ?? "",
    entryCharts: [],
    exitCharts: [],
    postTradeFiles: [],
    id: tradeData.id,
    setupType: setupValue,
    timeframesUsed: tradeData.timeframesUsed || [],
    riskPerTrade: tradeData.riskPerTrade || "",
    stopLossPrice: tradeData.stopLossPrice || "",
    stopLossMethod: tradeData.stopLossMethod || "",
    target1: tradeData.target1 || "",
    target2: tradeData.target2 || "",
    target3: tradeData.target3 || "",
    atrValue: tradeData.atrValue || "",
    setupConfidence: tradeData.setupConfidence || "",
    tradeStatus: tradeData.tradeStatus || "Planned",
    currency: tradeData.currency || "USD"
  };
}

export default function TradeAdd({ mode = "add", tradeData = null, onSubmit }) {

  const [form, setForm] = useState(tradeData ? mapTradeDataToForm(tradeData) : initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [setups, setSetups] = useState([]);
  const [setupsLoaded, setSetupsLoaded] = useState(false);
  const [exitTactics, setExitTactics] = useState([]);
  const [openTrades, setOpenTrades] = useState([]);
  const [today] = useState(() => new Date().toISOString().split('T')[0]);
  const [entryDisabled, setEntryDisabled] = useState(false);
  const [exitDisabled, setExitDisabled] = useState(false);
  const [postDisabled, setPostDisabled] = useState(false);
  const notification = useNotification();
  const navigate = useNavigate();

  // Mode helpers
  const isAdd = mode === 'add';
  const isUpdate = mode === 'update';
  const isReview = mode === 'review';

  // Placeholder for backend formatting
  const formDataForBackend = form; // TODO: map form to backend format if needed

  // Generic change handler for form fields
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'file') {
      setForm((prev) => ({ ...prev, [name]: files }));
    } else {
      console.log(`Updating field: ${name} with value: ${value}`); // Debug log
      if (name === 'setupType') {
        // Special handling for setupType to also set setupName
        setForm((prev) => ({ ...prev, tradeSetupId: e.target.setupId }));
      }
      
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handler for ticker selection (from TickerSearch)
  const handleTickerSelect = async (tickerObj, companyNameArg) => {
    // Support both {symbol, name} object and (ticker, companyName) string args
    let symbol = tickerObj;
    let companyName = companyNameArg;
    if (typeof tickerObj === 'object' && tickerObj !== null) {
      symbol = tickerObj.symbol;
      companyName = tickerObj.name || '';
    }
    if (symbol.includes('.NS') || symbol.includes('.BSE') || symbol.includes('.BO')) {
      setForm((prev) => ({ ...prev, currency: "INR" }));
    } else {
      setForm((prev) => ({ ...prev, currency: "USD" }));
    }
    setForm((prev) => ({ ...prev, ticker: symbol, companyName, entryFilledShares: "" }));

    // Calculate period for ATR: last 30 days from today
    const today = new Date();
    const period2 = today.toISOString().split('T')[0];
    const period1Date = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const period1 = period1Date.toISOString().split('T')[0];

    // Fetch and set current price and technical indicators
    try {
      const [priceRes, indicatorsRes] = await Promise.all([
        getCurrentPrice(symbol),
        getATR(symbol) // Now returns all technical indicators
      ]);
      const price = priceRes.data && priceRes.data.price ? String(priceRes.data.price) : '';
      const indicators = indicatorsRes.data || {};
      const atr = indicators.atr14 || '';
      
      setForm((prev) => ({
        ...prev,
        entryOrderPrice: price,
        atrValue: atr,
        // Store all technical indicators for potential future use
        technicalIndicators: indicators
      }));
    } catch (err) {
      // Optionally handle error
    }
  };

  // Fetch setups and exit tactics on mount
  useEffect(() => {
    let mounted = true;
    setSetupsLoaded(false);
    fetchSetups().then((data) => {
      if (mounted) {
        setSetups(data || []);
        setSetupsLoaded(true);
      }
    }).catch((error) => {
      console.error('Error fetching setups:', error);
      setSetupsLoaded(true);
    });
    fetchExitTactics().then((data) => {
      if (mounted) setExitTactics(data || []);
    });
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validate setup selection
    if (!form.setupType || form.setupType === "") {
      notification.error("Please select a trade setup before submitting.");
      return;
    }
    try {
      if (isAdd) {
        await createTrade(formDataForBackend);
        notification.success("Trade added successfully!");
        navigate("/trades", { replace: true });
        window.location.reload();
      }
      if (onSubmit) onSubmit();
    } catch (err) {
      console.error('Operation failed:', err);
      let errorMessage = "Operation failed. Please try again.";
      if (err.type === 'NETWORK_ERROR') {
        errorMessage = "Unable to connect to server. Please check your internet connection.";
      } else if (err.type === 'SERVER_ERROR') {
        errorMessage = "Server error. Please try again later.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      notification.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle ticker search change (when user types)
  const handleTickerChange = (value) => {
    setForm((prev) => ({ 
      ...prev, 
      ticker: value,
      companyName: ""
    }));
  };

  const handleRetry = () => {
    setError(null);
    // Retry loading the initial data
    window.location.reload();
  };

  // Show error page if there's a network error during initial load
  if (error && error.type === 'NETWORK_ERROR') {
    return (
      <ErrorPage
        title="Unable to Connect"
        message={error.message}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formContainer}>
        <form onSubmit={handleSubmit}>
          <TradeContextSection {...{form, handleChange, isReview, isUpdate, setups, setupsLoaded, entryDisabled, styles}} />
          <div className={styles.sectionDivider} />
          <TradePlanSection {...{form, handleChange, handleTickerChange, handleTickerSelect, entryDisabled, today, styles, openTrades}} />
          <div className={styles.sectionDivider} />
          {form.ticker && (
            <>
              <TechnicalIndicators 
                symbol={form.ticker} 
                onATRChange={(atr) => {
                  handleChange({ target: { name: 'atrValue', value: atr } });
                }}
              />
              <div className={styles.sectionDivider} />
            </>
          )}
          <NotesSection {...{form, handleChange, entryDisabled, styles}} />
          <div className={styles.sectionDivider} />
          {isReview && <PostTradeAnalysisSection {...{form, handleChange, postDisabled, styles}} />}
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading 
              ? "Processing..." 
              : (isAdd ? "Add Trade" : isUpdate ? "Update Trade" : "Save Analysis")
            }
          </button>
        </form>
      </div>
    </div>
  );
}
