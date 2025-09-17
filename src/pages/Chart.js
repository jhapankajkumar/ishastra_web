import React, { useState, useEffect } from "react";
import { getChartData } from "../api/analysisApi";
import LightweightChart from "../components/LightweightChart";
import TickerSearch from "../components/TickerSearch";
import styles from "./Chart.module.css";
import { useParams } from "react-router-dom";

export default function ChartPage() {
  const { symbol } = useParams();
  const [selectedTicker, setSelectedTicker] = useState(symbol || "");
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTickerChange = (value) => {
    setSelectedTicker(value);
    setChartData(null);
    setError(null);
  };

  const handleTickerSelect = async (tickerData) => {
    setSelectedTicker(tickerData.symbol);
    setLoading(true);
    setError(null);
    setChartData(null);
    try {
      // API expects 'symbol' param
      const response = await getChartData(tickerData.symbol);
      setChartData(response?.data || []);
    } catch (err) {
      setError("Failed to fetch chart data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-load chart if symbol param is present
  useEffect(() => {
    if (symbol) {
      const tickerData = { symbol }; // Create an object to pass
      handleTickerSelect(tickerData);
    }
    // eslint-disable-next-line
  }, [symbol]);

  return (
    <div className={styles.fullPageChartContainer}>
      <div className={styles.searchBarWrapper}>
        <TickerSearch
          value={selectedTicker}
          onChange={handleTickerChange}
          onSelect={handleTickerSelect}
          placeholder="Search for stocks (e.g., AAPL, GOOGL)..."
        />
      </div>
      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <span>Loading chart...</span>
        </div>
      )}
      {error && (
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <div>{error}</div>
        </div>
      )}
      {chartData && chartData.length > 0 && (
        <div className={styles.chartWrapper}>
          <LightweightChart ohlcv={chartData} />
        </div>
      )}
      {!loading && !error && (!chartData || chartData.length === 0) && (
        <div className={styles.emptyState}>
          <span>Search for a symbol to view its chart.</span>
        </div>
      )}
    </div>
  );
}
