import React, { useCallback, useState, useEffect, useRef } from "react";
import { getChartData, reviewAISetup } from "../api/analysisApi";
import LightweightChart from "../components/LightweightChart";
import TickerSearch from "../components/TickerSearch";
import styles from "./Chart.module.css";
import { useParams } from "react-router-dom";
import { captureElementCanvasesAsDataUrl, captureElementVisualAsDataUrl } from "../utils/chartImageCapture";
import { buildSetupReportHtml, downloadHtmlReport } from "../utils/setupReportHtml";

const filterLatestYears = (data, years = 2) => {
  if (!Array.isArray(data) || data.length === 0) return [];

  const latestDate = new Date(data[data.length - 1]?.date);
  if (Number.isNaN(latestDate.getTime())) return data;

  const cutoff = new Date(latestDate);
  cutoff.setFullYear(cutoff.getFullYear() - years);

  return data.filter((bar) => {
    const barDate = new Date(bar.date);
    return !Number.isNaN(barDate.getTime()) && barDate >= cutoff;
  });
};

const round = (value, digits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
};

const average = (values) => {
  const validValues = values.filter((value) => typeof value === 'number' && !Number.isNaN(value));
  if (!validValues.length) return null;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const calculateEMAValue = (data, period) => {
  if (!Array.isArray(data) || data.length < period) return null;

  const closes = data.map((bar) => bar.close).filter((value) => typeof value === 'number' && !Number.isNaN(value));
  if (closes.length < period) return null;

  const multiplier = 2 / (period + 1);
  let ema = average(closes.slice(0, period));
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] * multiplier) + (ema * (1 - multiplier));
  }

  return ema;
};

const calculateATRValue = (data, period = 14) => {
  if (!Array.isArray(data) || data.length < period + 1) return null;

  const trueRanges = [];
  for (let i = 1; i < data.length; i++) {
    const current = data[i];
    const previous = data[i - 1];
    trueRanges.push(Math.max(
      current.high - current.low,
      Math.abs(current.high - previous.close),
      Math.abs(current.low - previous.close)
    ));
  }

  return average(trueRanges.slice(-period));
};

const getVisibleWindowData = (data, visibleRange) => {
  if (!visibleRange?.from || !visibleRange?.to) return data;

  return data.filter((bar) => {
    const date = bar.date ? bar.date.substring(0, 10) : null;
    return date && date >= visibleRange.from && date <= visibleRange.to;
  });
};

// As-of view for AI review: scrolling the chart back must rewind ALL data,
// not just the visible candles — otherwise EMAs/52w stats leak future bars
// and contradict the image (mixed-date payload). Also drops today's
// still-forming candle so reviews only ever see completed daily bars.
const getAsOfData = (data, visibleRange) => {
  if (!Array.isArray(data) || data.length === 0) return [];

  let asOf = data;
  if (visibleRange?.to) {
    asOf = asOf.filter((bar) => {
      const date = bar.date ? bar.date.substring(0, 10) : null;
      return date && date <= visibleRange.to;
    });
  }

  const todayStr = new Date().toISOString().substring(0, 10);
  if (asOf.length && asOf[asOf.length - 1].date?.substring(0, 10) === todayStr) {
    asOf = asOf.slice(0, -1);
  }

  return asOf;
};

const buildAIChartMetadata = (data, visibleRange = null) => {
  if (!Array.isArray(data) || data.length === 0) {
    return {
      chartContext: null,
      technicalSummary: null,
      ohlcSummary: null
    };
  }

  const lastBar = data[data.length - 1];
  const close = lastBar?.close;
  const highs = data.map((bar) => bar.high).filter((value) => typeof value === 'number');
  const lows = data.map((bar) => bar.low).filter((value) => typeof value === 'number');
  const volumes = data.map((bar) => bar.volume).filter((value) => typeof value === 'number');
  const last252 = data.slice(-252);
  const last50 = data.slice(-50);
  const last20 = data.slice(-20);
  const last10 = data.slice(-10);
  const high52w = Math.max(...last252.map((bar) => bar.high));
  const low52w = Math.min(...last252.map((bar) => bar.low));
  const high2y = Math.max(...highs);
  const low2y = Math.min(...lows);
  const ema10 = calculateEMAValue(data, 10);
  const ema20 = calculateEMAValue(data, 20);
  const ema50 = calculateEMAValue(data, 50);
  const ema200 = calculateEMAValue(data, 200);
  const atr14 = calculateATRValue(data, 14);
  const avgVolume20 = average(volumes.slice(-20));
  const avgVolume50 = average(volumes.slice(-50));
  const avgVolume10 = average(volumes.slice(-10));
  const recentRangeHigh = Math.max(...last10.map((bar) => bar.high));
  const recentRangeLow = Math.min(...last10.map((bar) => bar.low));
  const visibleWindowData = getVisibleWindowData(data, visibleRange);
  const visibleOhlc = visibleWindowData.slice(-120).map((bar) => ({
    date: bar.date ? bar.date.substring(0, 10) : null,
    open: round(bar.open),
    high: round(bar.high),
    low: round(bar.low),
    close: round(bar.close),
    volume: bar.volume ?? null
  }));
  const visibleLastBar = visibleWindowData[visibleWindowData.length - 1] || null;
  const visibleHigh = visibleWindowData.length ? Math.max(...visibleWindowData.map((bar) => bar.high)) : null;
  const visibleLow = visibleWindowData.length ? Math.min(...visibleWindowData.map((bar) => bar.low)) : null;
  const visibleAvgVolume = visibleWindowData.length ? average(visibleWindowData.map((bar) => bar.volume)) : null;

  const pctFrom = (base) => {
    if (!close || !base) return null;
    return round(((close - base) / base) * 100);
  };

  return {
    chartContext: {
      renderedTimeframe: '2Y daily',
      capturedImageScope: visibleRange?.isZoomed ? 'CURRENT_ZOOMED_CHART_VIEW' : 'FULL_2Y_CHART_VIEW',
      visibleRange: visibleRange ?? null,
      visibleIndicators: [
        { name: 'EMA 10', colorName: 'blue', hex: '#2563EB' },
        { name: 'EMA 20', colorName: 'orange', hex: '#FF9800' },
        { name: 'EMA 50', colorName: 'red line', hex: '#F44336' },
        { name: 'EMA 200', colorName: 'brown', hex: '#795548' },
        { name: 'Volume up bars', colorName: 'green', hex: '#22c55e' },
        { name: 'Volume down bars', colorName: 'red', hex: '#ef4444' },
        { name: '50D average volume line', colorName: 'blue in volume pane', hex: '#2563EB' }
      ],
      intendedUse: 'Swing setup visual quality review'
    },
    technicalSummary: {
      high52w: round(high52w),
      low52w: round(low52w),
      high2y: round(high2y),
      low2y: round(low2y),
      distanceFrom52wHighPct: high52w ? round(((close - high52w) / high52w) * 100) : null,
      distanceFrom52wLowPct: low52w ? round(((close - low52w) / low52w) * 100) : null,
      ema10: round(ema10),
      ema20: round(ema20),
      ema50: round(ema50),
      ema200: round(ema200),
      priceVsEma10Pct: pctFrom(ema10),
      priceVsEma20Pct: pctFrom(ema20),
      priceVsEma50Pct: pctFrom(ema50),
      priceVsEma200Pct: pctFrom(ema200),
      atr14: round(atr14),
      atrPct: close && atr14 ? round((atr14 / close) * 100) : null,
      avgVolume10: round(avgVolume10, 0),
      avgVolume20: round(avgVolume20, 0),
      avgVolume50: round(avgVolume50, 0),
      volumeVs20dAvg: avgVolume20 ? round(lastBar.volume / avgVolume20) : null,
      volumeVs50dAvg: avgVolume50 ? round(lastBar.volume / avgVolume50) : null,
      recent10dRangePct: close ? round(((recentRangeHigh - recentRangeLow) / close) * 100) : null,
      recent20dHigh: round(Math.max(...last20.map((bar) => bar.high))),
      recent50dHigh: round(Math.max(...last50.map((bar) => bar.high))),
      visibleWindowBars: visibleWindowData.length,
      visibleWindowHigh: round(visibleHigh),
      visibleWindowLow: round(visibleLow),
      visibleWindowRangePct: visibleLastBar?.close && visibleHigh && visibleLow
        ? round(((visibleHigh - visibleLow) / visibleLastBar.close) * 100)
        : null,
      visibleWindowAvgVolume: round(visibleAvgVolume, 0)
    },
    ohlcSummary: {
      bars: data.length,
      firstDate: data[0]?.date ?? null,
      lastDate: lastBar?.date ?? null,
      lastOpen: round(lastBar?.open),
      lastHigh: round(lastBar?.high),
      lastLow: round(lastBar?.low),
      lastClose: round(lastBar?.close),
      lastVolume: lastBar?.volume ?? null
    },
    visibleOhlc
  };
};

export default function ChartPage() {
  const { symbol } = useParams();
  const chartWrapperRef = useRef(null);
  const reportPreviewRef = useRef(null);
  const [selectedTicker, setSelectedTicker] = useState(symbol || "");
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiReview, setAiReview] = useState(null);
  const [aiReviewLoading, setAiReviewLoading] = useState(false);
  const [aiReviewError, setAiReviewError] = useState(null);
  const [chartVisibleRange, setChartVisibleRange] = useState(null);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportHtml, setReportHtml] = useState(null);
  const [reportFileName, setReportFileName] = useState(null);

  const handleVisibleRangeChange = useCallback((range) => {
    setChartVisibleRange((previous) => {
      const previousValue = JSON.stringify(previous);
      const nextValue = JSON.stringify(range);
      return previousValue === nextValue ? previous : range;
    });
  }, []);

  const handleTickerChange = (value) => {
    setSelectedTicker(value);
    setChartData(null);
    setError(null);
    setAiReview(null);
    setAiReviewError(null);
    setChartVisibleRange(null);
    setReportHtml(null);
    setReportFileName(null);
  };

  const handleTickerSelect = async (tickerData) => {
    setSelectedTicker(tickerData.symbol);
    setLoading(true);
    setError(null);
    setChartData(null);
    setAiReview(null);
    setAiReviewError(null);
    setChartVisibleRange(null);
    setReportHtml(null);
    setReportFileName(null);
    try {
      // API expects 'symbol' param
      const response = await getChartData(tickerData.symbol, '2y');
      setChartData(filterLatestYears(response?.data || [], 2));
    } catch (err) {
      setError("Failed to fetch chart data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAIReview = async () => {
    if (!chartWrapperRef.current || !chartData?.length || !selectedTicker) return;

    setAiReviewLoading(true);
    setAiReviewError(null);
    try {
      const imageDataUrl = captureElementCanvasesAsDataUrl(chartWrapperRef.current, {
        pixelRatio: 2
      });
      const asOfData = getAsOfData(chartData, chartVisibleRange);
      if (!asOfData.length) {
        throw new Error('No completed bars available for the selected chart window');
      }
      const lastBar = asOfData[asOfData.length - 1];
      const chartMetadata = buildAIChartMetadata(asOfData, chartVisibleRange);
      const response = await reviewAISetup({
        symbol: selectedTicker,
        timeframe: '1D',
        currentPrice: lastBar?.close ?? null,
        imageDataUrl,
        chartContext: chartMetadata.chartContext,
        technicalSummary: chartMetadata.technicalSummary,
        ohlcSummary: chartMetadata.ohlcSummary,
        visibleOhlc: chartMetadata.visibleOhlc,
        notes: 'Manual chart page AI setup review using 2-year daily chart with EMA 10/20 and 50-day average volume.'
      });
      setAiReview(response.review);
      setReportHtml(null);
      setReportFileName(null);
    } catch (err) {
      setAiReviewError(err?.response?.data?.error || err?.message || 'AI review failed');
    } finally {
      setAiReviewLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!chartWrapperRef.current || !chartData?.length || !aiReview || !selectedTicker) return;

    setReportGenerating(true);
    try {
      const chartImageDataUrl = await captureElementVisualAsDataUrl(chartWrapperRef.current, {
        pixelRatio: 2
      });
      const metadata = buildAIChartMetadata(getAsOfData(chartData, chartVisibleRange), chartVisibleRange);
      const generatedAt = new Date();
      const html = buildSetupReportHtml({
        symbol: selectedTicker,
        chartImageDataUrl,
        review: aiReview,
        metadata,
        generatedAt
      });
      const timestamp = generatedAt.toISOString().replace(/[:.]/g, '-');
      setReportHtml(html);
      setReportFileName(`${selectedTicker}_swing_setup_report_${timestamp}.html`);
      window.requestAnimationFrame(() => {
        reportPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (err) {
      setAiReviewError(err?.message || 'Failed to generate report');
    } finally {
      setReportGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportHtml || !reportFileName) return;
    downloadHtmlReport(reportHtml, reportFileName);
  };

  // Auto-generate report when AI review completes
  useEffect(() => {
    if (!aiReview || !chartWrapperRef.current || !chartData?.length || !selectedTicker) return;
    if (reportHtml) return; // Already generated

    const generateReport = async () => {
      setReportGenerating(true);
      try {
        const chartImageDataUrl = await captureElementVisualAsDataUrl(chartWrapperRef.current, {
          pixelRatio: 2
        });
        const metadata = buildAIChartMetadata(getAsOfData(chartData, chartVisibleRange), chartVisibleRange);
        const generatedAt = new Date();
        const html = buildSetupReportHtml({
          symbol: selectedTicker,
          chartImageDataUrl,
          review: aiReview,
          metadata,
          generatedAt
        });
        const timestamp = generatedAt.toISOString().replace(/[:.]/g, '-');
        setReportHtml(html);
        setReportFileName(`${selectedTicker}_swing_setup_report_${timestamp}.html`);
        window.requestAnimationFrame(() => {
          reportPreviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      } catch (err) {
        console.error('Failed to auto-generate report:', err);
      } finally {
        setReportGenerating(false);
      }
    };

    generateReport();
    // eslint-disable-next-line
  }, [aiReview]);

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
        <div className={styles.chartSection}>
          <div className={styles.chartActions}>
            <button
              type="button"
              className={styles.aiReviewButton}
              onClick={handleAIReview}
              disabled={aiReviewLoading}
            >
              {aiReviewLoading ? 'Reviewing...' : 'AI Review'}
            </button>
          </div>
          <div className={styles.chartWrapper} ref={chartWrapperRef}>
            <LightweightChart
              ohlcv={chartData}
              height={820}
              onVisibleRangeChange={handleVisibleRangeChange}
              annotations={aiReview?.annotations}
            />
          </div>
          {aiReviewError && (
            <div className={styles.aiReviewError}>{aiReviewError}</div>
          )}
          {aiReview && (
            <div className={styles.aiReviewPanel}>
              <div className={styles.aiReviewHeader}>
                <span>{aiReview.verdict}</span>
                <span>{aiReview.qualityGrade}</span>
              </div>
              <div className={styles.aiReviewMeta}>
                {aiReview.setupType} | {aiReview.setupMaturity} | Pivot: {aiReview.pivotVisible ? aiReview.estimatedPivotPrice ?? 'Visible' : 'Not clear'}
              </div>
              {aiReview.annotations && (
                <div className={styles.aiReviewAnnotationNote}>
                  Chart annotations are drawn above from AI-returned coordinates. Candles remain unchanged.
                </div>
              )}
              <div className={styles.aiReviewSummary}>{aiReview.summary}</div>
              {aiReview.passBlockers?.length > 0 && (
                <div className={styles.aiReviewFlags}>
                  {aiReview.passBlockers.join(' | ')}
                </div>
              )}
            </div>
          )}
          {reportHtml && (
            <section className={styles.reportPreview} ref={reportPreviewRef}>
              <div className={styles.reportPreviewHeader}>
                <div>
                  <div className={styles.reportPreviewTitle}>Generated Setup Report</div>
                  <div className={styles.reportPreviewMeta}>{reportFileName}</div>
                </div>
                <button
                  type="button"
                  className={styles.reportButton}
                  onClick={handleDownloadReport}
                >
                  Download HTML
                </button>
              </div>
              <iframe
                title={`${selectedTicker} swing setup report`}
                className={styles.reportFrame}
                srcDoc={reportHtml}
              />
            </section>
          )}
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
