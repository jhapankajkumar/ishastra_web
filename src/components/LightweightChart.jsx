import React, { useEffect, useMemo, useRef, useState } from "react";
import { createChart, CandlestickSeries, BaselineSeries, LineSeries, HistogramSeries } from "lightweight-charts";

// Utility function to convert daily data to weekly
const convertToWeekly = (dailyData) => {
  if (!dailyData || dailyData.length === 0) return [];

  const weeklyData = [];
  let currentWeek = null;

  dailyData.forEach(day => {
    const date = new Date(day.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Get Sunday of the week
    const weekKey = weekStart.toISOString().substring(0, 10);

    if (!currentWeek || currentWeek.date !== weekKey) {
      if (currentWeek) weeklyData.push(currentWeek);
      currentWeek = {
        date: weekKey,
        open: day.open,
        high: day.high,
        low: day.low,
        close: day.close,
        volume: day.volume || 0
      };
    } else {
      currentWeek.high = Math.max(currentWeek.high, day.high);
      currentWeek.low = Math.min(currentWeek.low, day.low);
      currentWeek.close = day.close;
      currentWeek.volume = (currentWeek.volume || 0) + (day.volume || 0);
    }
  });

  if (currentWeek) weeklyData.push(currentWeek);
  return weeklyData;
};

// Technical Indicators Calculations
const calculateEMA = (data, period) => {
  const k = 2 / (period + 1);
  const ema = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      ema.push(data[i].close);
    } else {
      const currentEMA = (data[i].close * k) + (ema[i - 1] * (1 - k));
      ema.push(currentEMA);
    }
  }
  return ema;
};

const calculateSMA = (data, period) => {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + curr.close, 0);
      sma.push(sum / period);
    }
  }
  return sma;
};

const calculateVolumeSMA = (data, period) => {
  const sma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, curr) => acc + (curr.volume || 0), 0);
      sma.push(sum / period);
    }
  }
  return sma;
};

const formatCompactNumber = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'N/A';
  if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(0);
};

const normalizeChartTime = (time) => {
  if (!time) return null;
  if (typeof time === 'string') return time.substring(0, 10);
  if (typeof time === 'number') return new Date(time * 1000).toISOString().substring(0, 10);
  if (typeof time === 'object' && time.year && time.month && time.day) {
    return `${time.year}-${String(time.month).padStart(2, '0')}-${String(time.day).padStart(2, '0')}`;
  }
  return null;
};

const calculateRSI = (data, period = 14) => {
  if (!data || data.length < period + 1) return [];

  const rsi = [];
  let avgGain = 0;
  let avgLoss = 0;

  // Calculate initial averages
  for (let i = 1; i <= period; i++) {
    const change = data[i].close - data[i - 1].close;
    avgGain += Math.max(change, 0);
    avgLoss += Math.max(-change, 0);
  }

  avgGain /= period;
  avgLoss /= period;

  // Add null values for first period
  for (let i = 0; i < period; i++) {
    rsi.push(null);
  }

  // Calculate RSI
  for (let i = period; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsiValue = 100 - (100 / (1 + rs));

    rsi.push(isNaN(rsiValue) ? null : rsiValue);
  }

  return rsi;
};

const calculateATR = (data, period = 14) => {
  const atr = [];
  const trueRanges = [];

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      trueRanges.push(data[i].high - data[i].low);
      atr.push(null);
    } else {
      const highLow = data[i].high - data[i].low;
      const highClosePrev = Math.abs(data[i].high - data[i - 1].close);
      const lowClosePrev = Math.abs(data[i].low - data[i - 1].close);
      const trueRange = Math.max(highLow, highClosePrev, lowClosePrev);
      trueRanges.push(trueRange);

      if (i < period) {
        atr.push(null);
      } else if (i === period) {
        const avgTR = trueRanges.slice(1, period + 1).reduce((sum, tr) => sum + tr, 0) / period;
        atr.push(avgTR);
      } else {
        const currentATR = (atr[i - 1] * (period - 1) + trueRanges[i]) / period;
        atr.push(currentATR);
      }
    }
  }
  return atr;
};

const calculateMACD = (data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) => {
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);

  const signalLine = calculateEMA(
    macdLine.map((value, i) => ({ close: value })),
    signalPeriod
  );

  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

  return { macdLine, signalLine, histogram };
};

// Supertrend calculation
const calculateSupertrend = (data, period = 10, multiplier = 3) => {
  if (!data || data.length < period) return { supertrend: [], trend: [] };

  const atr = calculateATR(data, period);
  const hl2 = data.map(d => (d.high + d.low) / 2);

  const basicUpperBand = [];
  const basicLowerBand = [];
  const finalUpperBand = [];
  const finalLowerBand = [];
  const supertrend = [];
  const trend = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1 || !atr[i]) {
      basicUpperBand.push(null);
      basicLowerBand.push(null);
      finalUpperBand.push(null);
      finalLowerBand.push(null);
      supertrend.push(null);
      trend.push(null);
      continue;
    }

    const currentATR = atr[i];
    const currentHL2 = hl2[i];

    // Calculate basic bands
    const basicUpper = currentHL2 + (multiplier * currentATR);
    const basicLower = currentHL2 - (multiplier * currentATR);

    basicUpperBand.push(basicUpper);
    basicLowerBand.push(basicLower);

    // Calculate final bands
    let finalUpper, finalLower;

    if (i === period - 1) {
      finalUpper = basicUpper;
      finalLower = basicLower;
    } else {
      finalUpper = basicUpper < finalUpperBand[i - 1] || data[i - 1].close > finalUpperBand[i - 1]
        ? basicUpper
        : finalUpperBand[i - 1];

      finalLower = basicLower > finalLowerBand[i - 1] || data[i - 1].close < finalLowerBand[i - 1]
        ? basicLower
        : finalLowerBand[i - 1];
    }

    finalUpperBand.push(finalUpper);
    finalLowerBand.push(finalLower);

    // Determine trend and supertrend
    let currentTrend;
    if (i === period - 1) {
      currentTrend = 1;
    } else {
      if (trend[i - 1] === 1 && data[i].close <= finalLower) {
        currentTrend = -1;
      } else if (trend[i - 1] === -1 && data[i].close >= finalUpper) {
        currentTrend = 1;
      } else {
        currentTrend = trend[i - 1];
      }
    }

    trend.push(currentTrend);

    const supertrendValue = currentTrend === 1 ? finalLower : finalUpper;
    supertrend.push(supertrendValue);
  }

  return { supertrend, trend };
};

const LightweightChart = ({ ohlcv, height = 500, onVisibleRangeChange, annotations }) => {
  const chartContainerRef = useRef();
  const mainChartRef = useRef();
  const volumeChartRef = useRef();
  const seriesRefs = useRef({});
  const annotationsRef = useRef(annotations);
  const updateAnnotationOverlayRef = useRef(() => {});
  const [annotationShapes, setAnnotationShapes] = useState({
    lines: [],
    zones: [],
    priceLines: []
  });

  const cleanedData = useMemo(() => ohlcv.filter(candle =>
    typeof candle.open === 'number' &&
    typeof candle.high === 'number' &&
    typeof candle.low === 'number' &&
    typeof candle.close === 'number' &&
    !isNaN(candle.open) && !isNaN(candle.high) &&
    !isNaN(candle.low) && !isNaN(candle.close)
  ), [ohlcv]);

  // State for controls
  const [timeframe, setTimeframe] = useState('daily');
  const [indicators, setIndicators] = useState({
    ema10: true,
    ema13: false,
    ema20: true,
    ema26: false,
    ema50: true,
    ema200: true,
    sma20: false,
    sma50: false,
    sma100: false,
    sma200: false,
    rsi: false,
    atr: false,
    macd: false,
    supertrend: false,
    volume: true
  });

  // Process data based on timeframe
  const processedData = useMemo(
    () => timeframe === 'weekly' ? convertToWeekly(cleanedData) : cleanedData,
    [cleanedData, timeframe]
  );
  const lastBar = processedData[processedData.length - 1] || null;
  const volumeSma50ValuesForLegend = calculateVolumeSMA(processedData, 50);
  const latestVolumeSma50 = volumeSma50ValuesForLegend[volumeSma50ValuesForLegend.length - 1] || null;

  useEffect(() => {
    annotationsRef.current = annotations;
    requestAnimationFrame(() => {
      updateAnnotationOverlayRef.current();
    });
  }, [annotations]);

  const handleIndicatorToggle = (indicator) => {
    setIndicators(prev => ({
      ...prev,
      [indicator]: !prev[indicator]
    }));
  };

  const addIndicatorSeries = (chart, data, indicator, isEnabled, priceScaleId = 'right') => {
    // Remove series if not enabled
    if (!isEnabled) {
      if (Array.isArray(seriesRefs.current[indicator])) {
        seriesRefs.current[indicator].forEach(s => chart.removeSeries(s));
      } else if (seriesRefs.current[indicator]) {
        chart.removeSeries(seriesRefs.current[indicator]);
      }
      delete seriesRefs.current[indicator];
      return;
    }

    // Add or update series
    let seriesData = [];
    let seriesOptions = {};
    let series;
    switch (indicator) {
      case 'ema10':
        const ema10Values = calculateEMA(data, 10);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema10Values[i]
        }));
        seriesOptions = { color: '#2563EB', lineWidth: 1 };
        break;

      case 'ema13':
        const ema13Values = calculateEMA(data, 13);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema13Values[i]
        }));
        seriesOptions = { color: '#2196F3', lineWidth: 1 };
        break;

      case 'ema20':
        const ema20Values = calculateEMA(data, 20);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema20Values[i]
        }));
        seriesOptions = { color: '#FF9800', lineWidth: 1 };
        break;

      case 'ema26':
        const ema26Values = calculateEMA(data, 26);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema26Values[i]
        }));
        seriesOptions = { color: '#9C27B0', lineWidth: 1 };
        break;

      case 'ema50':
        const ema50Values = calculateEMA(data, 50);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema50Values[i]
        }));
        seriesOptions = { color: '#F44336', lineWidth: 1 };
        break;

      case 'ema200':
        const ema200Values = calculateEMA(data, 200);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema200Values[i]
        }));
        seriesOptions = { color: '#795548', lineWidth: 1 };
        break;

      case 'sma20':
        const sma20Values = calculateSMA(data, 20);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma20Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#4CAF50', lineWidth: 1 };
        break;

      case 'sma50':
        const sma50Values = calculateSMA(data, 50);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma50Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#607D8B', lineWidth: 1 };
        break;

      case 'sma100':
        const sma100Values = calculateSMA(data, 100);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma100Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#FF5722', lineWidth: 1 };
        break;

      case 'sma200':
        const sma200Values = calculateSMA(data, 200);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma200Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#9E9E9E', lineWidth: 1 };
        break;

      case 'rsi':
        const rsiValues = calculateRSI(data);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: rsiValues[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#E91E63', lineWidth: 1 };
        break;

      case 'atr':
        const atrValues = calculateATR(data);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: atrValues[i]
        })).filter(d => d.value !== null && !isNaN(d.value));
        seriesOptions = { color: '#00BCD4', lineWidth: 1 };
        break;

      case 'macd':
        const macdData = calculateMACD(data);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: macdData.histogram[i]
        })).filter(d => d.value !== null && !isNaN(d.value));
        seriesOptions = { color: '#673AB7', lineWidth: 1 };
        break;

      case 'supertrend': {
        const { supertrend, trend } = calculateSupertrend(data, 10, 3);

        const upperBandData = [];
        const lowerBandData = [];

        for (let i = 0; i < data.length; i++) {
          const time = data[i].date ? data[i].date.substring(0, 10) : "";
          if (supertrend[i] === null || isNaN(supertrend[i])) continue;

          if (trend[i] === 1) {
            // Bullish → green lower band only
            lowerBandData.push({ time, value: supertrend[i] });
          } else {
            // Bearish → red upper band only
            upperBandData.push({ time, value: supertrend[i] });
          }
        }

        // Cleanup old series
        if (seriesRefs.current[indicator]) {
          chart.removeSeries(seriesRefs.current[indicator].upper);
          chart.removeSeries(seriesRefs.current[indicator].lower);
        }

        // Add the two line series
        const upperSeries = chart.addSeries(LineSeries, {
          color: 'red',
          lineWidth: 1,
          priceScaleId,
          lastValueVisible: false,
          priceLineVisible: false,
        });

        const lowerSeries = chart.addSeries(LineSeries, {
          color: 'green',
          lineWidth: 1,
          priceScaleId,
          lastValueVisible: false,
          priceLineVisible: false,
        });

        upperSeries.setData(upperBandData);
        lowerSeries.setData(lowerBandData);

        seriesRefs.current[indicator] = { upper: upperSeries, lower: lowerSeries };
        return;
      }
    }

    if (seriesRefs.current[indicator]) {
      chart.removeSeries(seriesRefs.current[indicator]);
    }
    seriesOptions.priceScaleId = priceScaleId;
    seriesOptions.lastValueVisible = false;
    seriesOptions.priceLineVisible = false;
    series = chart.addSeries(LineSeries, seriesOptions);
    series.setData(seriesData);
    seriesRefs.current[indicator] = series;
  };

  useEffect(() => {
    if (!processedData || processedData.length === 0) return;

    // Clean up existing charts
    if (mainChartRef.current) {
      mainChartRef.current.remove();
      mainChartRef.current = null;
    }
    if (volumeChartRef.current) {
      volumeChartRef.current.remove();
      volumeChartRef.current = null;
    }
    seriesRefs.current = {};

    // Chart height split: 75% main, 25% volume
    const totalHeight = height;
    const mainChartHeight = Math.round(totalHeight * 0.78);
    const volumeChartHeight = totalHeight - mainChartHeight;

    // Get container divs
    const mainDiv = chartContainerRef.current?.querySelector('.main-chart-host');
    const volumeDiv = chartContainerRef.current?.querySelector('.volume-chart-pane');
    if (!mainDiv || !volumeDiv) return;

    const publishVisibleRange = (range) => {
      if (!range || !onVisibleRangeChange) return;

      const from = normalizeChartTime(range.from);
      const to = normalizeChartTime(range.to);
      const visibleBars = processedData.filter((bar) => {
        const date = bar.date ? bar.date.substring(0, 10) : null;
        return date && (!from || date >= from) && (!to || date <= to);
      }).length;

      onVisibleRangeChange({
        from,
        to,
        visibleBars,
        timeframe,
        isZoomed: visibleBars > 0 && visibleBars < processedData.length
      });
    };

    // Create main chart
    const mainChart = createChart(mainDiv, {
      width: mainDiv.offsetWidth || 800,
      height: mainChartHeight,
      layout: { background: { color: "#fff" }, textColor: "#222" },
      grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
      timeScale: { timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      rightPriceScale: {
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
    });
    mainChartRef.current = mainChart;

    // Main candlestick series
    const candlestickSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderVisible: false,
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceScaleId: 'right',
    });
    const candleData = processedData.map(d => ({
      time: d.date ? d.date.substring(0, 10) : "",
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    candlestickSeries.setData(candleData);

    const updateAnnotationOverlay = () => {
      const currentAnnotations = annotationsRef.current;
      if (!currentAnnotations) {
        setAnnotationShapes({ lines: [], zones: [], priceLines: [] });
        return;
      }

      const toDate = (value) => value ? String(value).substring(0, 10) : null;
      const toX = (date) => {
        const normalizedDate = toDate(date);
        if (!normalizedDate) return null;
        const coordinate = mainChart.timeScale().timeToCoordinate(normalizedDate);
        return typeof coordinate === 'number' ? coordinate : null;
      };
      const toY = (price) => {
        if (typeof price !== 'number' || Number.isNaN(price)) return null;
        const coordinate = candlestickSeries.priceToCoordinate(price);
        return typeof coordinate === 'number' ? coordinate : null;
      };
      const isNumber = (value) => typeof value === 'number' && !Number.isNaN(value);
      const visibleDates = processedData.map((bar) => bar.date?.substring(0, 10)).filter(Boolean);
      const fallbackStartDate = visibleDates[0] || null;
      const fallbackEndDate = visibleDates[visibleDates.length - 1] || null;
      const overlayWidth = mainDiv.offsetWidth || 0;

      const lineShapes = [];
      const zoneShapes = [];
      const priceLineShapes = [];

      const addLine = (key, config, color, dashed = false) => {
        if (!config?.visible) return;
        const x1 = toX(config.startDate);
        const y1 = toY(config.startPrice);
        const x2 = toX(config.endDate);
        const y2 = toY(config.endPrice);
        if (![x1, y1, x2, y2].every(isNumber)) return;
        lineShapes.push({
          key,
          label: config.label || key,
          x1,
          y1,
          x2,
          y2,
          color,
          dashed
        });
      };

      const addZone = (key, config, stroke, fill, dashed = false) => {
        if (!config?.visible) return;
        const x1 = toX(config.startDate || fallbackStartDate);
        const x2 = toX(config.endDate || fallbackEndDate);
        const yLow = toY(config.lowPrice);
        const yHigh = toY(config.highPrice);
        if (![x1, x2, yLow, yHigh].every(isNumber)) return;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(yLow, yHigh);
        const bottom = Math.max(yLow, yHigh);
        zoneShapes.push({
          key,
          label: config.label || key,
          x: left,
          y: top,
          width: Math.max(right - left, 6),
          height: Math.max(bottom - top, 4),
          stroke,
          fill,
          dashed
        });
      };

      const addPriceLine = (key, config, color, dashed = true) => {
        if (!config?.visible) return;
        const y = toY(config.price);
        if (!isNumber(y)) return;
        priceLineShapes.push({
          key,
          label: config.label || key,
          x1: 0,
          x2: overlayWidth,
          y,
          color,
          dashed
        });
      };

      addLine('pole', currentAnnotations.pole, '#16a34a');
      addLine('flagUpper', currentAnnotations.flagUpper, '#7e22ce', true);
      addLine('flagLower', currentAnnotations.flagLower, '#7e22ce', true);
      addZone('supportZone', currentAnnotations.supportZone, '#16a34a', 'rgba(22, 163, 74, 0.12)');
      addZone('resistanceZone', currentAnnotations.resistanceZone, '#dc2626', 'rgba(220, 38, 38, 0.12)');
      addZone('entryZone', currentAnnotations.entryZone, '#22c55e', 'rgba(187, 247, 208, 0.38)');
      addPriceLine('stopLoss', currentAnnotations.stopLoss, '#dc2626', true);
      addZone('targetZone', currentAnnotations.targetZone, '#16a34a', 'rgba(34, 197, 94, 0.10)', true);

      setAnnotationShapes({
        lines: lineShapes,
        zones: zoneShapes,
        priceLines: priceLineShapes
      });
    };
    updateAnnotationOverlayRef.current = updateAnnotationOverlay;

    // Add all enabled indicators (except volume, which is handled separately)
    Object.entries(indicators).forEach(([indicator, isEnabled]) => {
      if (indicator === 'volume') return;
      addIndicatorSeries(mainChart, processedData, indicator, isEnabled, 'right');
    });

    // Create volume chart (if enabled)
    let volumeSeries;
    if (indicators.volume && processedData[0] && processedData[0].volume !== undefined) {
      const volumeChart = createChart(volumeDiv, {
        width: volumeDiv.offsetWidth || 800,
        height: volumeChartHeight,
        layout: { background: { color: "#fff" }, textColor: "#222" },
        grid: { vertLines: { color: "#eee" }, horzLines: { color: "#eee" } },
        timeScale: { timeVisible: true, secondsVisible: false },
        crosshair: { mode: 1 },
        rightPriceScale: {
          scaleMargins: { top: 0.1, bottom: 0.05 },
        },
      });
      volumeChartRef.current = volumeChart;
      volumeSeries = volumeChart.addSeries(HistogramSeries, {
        color: '#888',
        priceFormat: { type: 'volume' },
        priceScaleId: 'right',
        lineWidth: 1,
        lastValueVisible: false,
        priceLineVisible: false,
      });
      const volumeData = processedData.map(d => ({
        time: d.date ? d.date.substring(0, 10) : "",
        value: d.volume,
        color: d.close >= d.open ? "#22c55e" : "#ef4444"
      }));
      volumeSeries.setData(volumeData);

      const volumeSma50Values = calculateVolumeSMA(processedData, 50);
      const volumeSma50Data = processedData.map((d, i) => ({
        time: d.date ? d.date.substring(0, 10) : "",
        value: volumeSma50Values[i]
      })).filter(d => d.value !== null && !isNaN(d.value));
      const volumeSma50Series = volumeChart.addSeries(LineSeries, {
        color: '#2563EB',
        lineWidth: 1,
        priceScaleId: 'right',
        lastValueVisible: false,
        priceLineVisible: false
      });
      volumeSma50Series.setData(volumeSma50Data);

      // Keep the volume scale readable without floating last-value labels.
      volumeChart.priceScale('right').applyOptions({
        borderVisible: true,
        entireTextOnly: true,
        visible: true,
        ticksVisible: true,
        autoScale: true,
        mode: 0,
        alignLabels: true,
        drawTicks: true,
        borderColor: '#e5e7eb',
        textColor: '#475569',
      });
    }

    // --- Time scale sync between main and volume chart ---
    // Always sync timescales if both charts exist
    if (mainChartRef.current && volumeChartRef.current) {
      let syncing = false;
      const syncMainToVolume = (range) => {
        if (syncing) return;
        syncing = true;
        const volumeTimeScale = volumeChartRef.current.timeScale();
        volumeTimeScale.setVisibleRange(range);
        publishVisibleRange(range);
        updateAnnotationOverlay();
        syncing = false;
      };
      const syncVolumeToMain = (range) => {
        if (syncing) return;
        syncing = true;
        const mainTimeScale = mainChartRef.current.timeScale();
        mainTimeScale.setVisibleRange(range);
        publishVisibleRange(range);
        updateAnnotationOverlay();
        syncing = false;
      };
      mainChartRef.current.timeScale().subscribeVisibleTimeRangeChange(syncMainToVolume);
      volumeChartRef.current.timeScale().subscribeVisibleTimeRangeChange(syncVolumeToMain);
      // Fit content for both
      mainChartRef.current.timeScale().fitContent();
      volumeChartRef.current.timeScale().fitContent();
      publishVisibleRange(mainChartRef.current.timeScale().getVisibleRange());
      updateAnnotationOverlay();
    } else if (mainChartRef.current) {
      mainChartRef.current.timeScale().fitContent();
      publishVisibleRange(mainChartRef.current.timeScale().getVisibleRange());
      updateAnnotationOverlay();
    }

    const handleResize = () => {
      if (mainChartRef.current && mainDiv) {
        mainChartRef.current.applyOptions({
          width: mainDiv.offsetWidth,
        });
        updateAnnotationOverlay();
      }
      if (volumeChartRef.current && volumeDiv) {
        volumeChartRef.current.applyOptions({
          width: volumeDiv.offsetWidth,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (mainChartRef.current) {
        mainChartRef.current.remove();
        mainChartRef.current = null;
      }
      if (volumeChartRef.current) {
        volumeChartRef.current.remove();
        volumeChartRef.current = null;
      }
      seriesRefs.current = {};
      updateAnnotationOverlayRef.current = () => {};
    };
  }, [processedData, indicators, timeframe, height, onVisibleRangeChange]);

  return (
    <div style={{ width: "100%", position: "relative" }}>
      {/* Timeframe and Indicator Controls */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1rem',
        padding: '1rem',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        {/* Timeframe Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Timeframe:</span>
          <button
            onClick={() => setTimeframe('daily')}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: timeframe === 'daily' ? '#007bff' : '#fff',
              color: timeframe === 'daily' ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeframe('weekly')}
            style={{
              padding: '6px 12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              background: timeframe === 'weekly' ? '#007bff' : '#fff',
              color: timeframe === 'weekly' ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Weekly
          </button>
        </div>

        {/* EMA Indicators */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>EMA:</span>
          {['ema10', 'ema13', 'ema20', 'ema26', 'ema50', 'ema200'].map((ema) => (
            <label key={ema} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={indicators[ema]}
                onChange={() => handleIndicatorToggle(ema)}
                style={{ cursor: 'pointer' }}
              />
              {ema.toUpperCase().replace('EMA', 'EMA ')}
            </label>
          ))}
        </div>

        {/* SMA Indicators */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>SMA:</span>
          {['sma20', 'sma50', 'sma100', 'sma200'].map((sma) => (
            <label key={sma} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={indicators[sma]}
                onChange={() => handleIndicatorToggle(sma)}
                style={{ cursor: 'pointer' }}
              />
              {sma.toUpperCase().replace('SMA', 'SMA ')}
            </label>
          ))}
        </div>

        {/* Other Indicators */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>Oscillators:</span>
          {[
            { key: 'volume', label: 'Volume' },
            { key: 'rsi', label: 'RSI' },
            { key: 'atr', label: 'ATR' },
            { key: 'macd', label: 'MACD' },
            { key: 'supertrend', label: 'Supertrend' }
          ].map((indicator) => (
            <label key={indicator.key} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={indicators[indicator.key] || false}
                onChange={() => handleIndicatorToggle(indicator.key)}
                style={{ cursor: 'pointer' }}
              />
              {indicator.label}
            </label>
          ))}
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        padding: '0 12px 10px',
        color: '#334155',
        fontSize: '12px'
      }}>
        <span><span style={{ color: '#2563EB', fontWeight: 700 }}>Blue</span>: EMA 10</span>
        <span><span style={{ color: '#FF9800', fontWeight: 700 }}>Orange</span>: EMA 20</span>
        <span><span style={{ color: '#F44336', fontWeight: 700 }}>Red line</span>: EMA 50</span>
        <span><span style={{ color: '#795548', fontWeight: 700 }}>Brown</span>: EMA 200</span>
        <span><span style={{ color: '#22c55e', fontWeight: 700 }}>Green</span>/<span style={{ color: '#ef4444', fontWeight: 700 }}>Red</span>: volume</span>
        <span><span style={{ color: '#2563EB', fontWeight: 700 }}>Blue volume line</span>: 50D avg volume</span>
        <span>Last volume: {formatCompactNumber(lastBar?.volume)}</span>
        <span>50D avg volume: {formatCompactNumber(latestVolumeSma50)}</span>
      </div>

      {/* Chart Container with main and volume charts stacked */}
      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height,
          minHeight: Math.min(height, 600),
          display: "flex",
          flexDirection: "column",
          gap: 0
        }}
      >
        <div
          className="main-chart-pane"
          style={{ flex: "0 0 75%", height: "75%", minHeight: 0, position: "relative" }}
        >
          <div className="main-chart-host" style={{ width: "100%", height: "100%" }} />
          <svg
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "hidden"
            }}
          >
            {annotationShapes.zones.map((zone) => (
              <g key={zone.key}>
                <rect
                  x={zone.x}
                  y={zone.y}
                  width={zone.width}
                  height={zone.height}
                  fill={zone.fill}
                  stroke={zone.stroke}
                  strokeWidth="1.5"
                  strokeDasharray={zone.dashed ? '6 4' : undefined}
                  rx="2"
                />
              </g>
            ))}
            {annotationShapes.lines.map((line) => (
              <g key={line.key}>
                <line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={line.color}
                  strokeWidth="2"
                  strokeDasharray={line.dashed ? '6 4' : undefined}
                />
              </g>
            ))}
            {annotationShapes.priceLines.map((line) => (
              <g key={line.key}>
                <line
                  x1={line.x1}
                  y1={line.y}
                  x2={line.x2}
                  y2={line.y}
                  stroke={line.color}
                  strokeWidth="1.8"
                  strokeDasharray={line.dashed ? '7 5' : undefined}
                />
              </g>
            ))}
          </svg>
        </div>
        <div
          className="volume-chart-pane"
          style={{ flex: "0 0 25%", height: "25%", minHeight: 0 }}
        />
      </div>
    </div>
  );
};

export default LightweightChart;
