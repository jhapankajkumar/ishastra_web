import React, { useEffect, useRef, useState } from "react";
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

const LightweightChart = ({ ohlcv }) => {
  const chartContainerRef = useRef();
  const mainChartRef = useRef();
  const volumeChartRef = useRef();
  const seriesRefs = useRef({});

  // State for controls
  const [timeframe, setTimeframe] = useState('daily');
  const [indicators, setIndicators] = useState({
    ema13: false,
    ema20: false,
    ema26: false,
    ema50: false,
    ema200: false,
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
  const processedData = timeframe === 'weekly' ? convertToWeekly(ohlcv) : ohlcv;

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
      case 'ema13':
        const ema13Values = calculateEMA(data, 13);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema13Values[i]
        }));
        seriesOptions = { color: '#2196F3', lineWidth: 2, title: 'EMA 13' };
        break;

      case 'ema20':
        const ema20Values = calculateEMA(data, 20);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema20Values[i]
        }));
        seriesOptions = { color: '#FF9800', lineWidth: 2, title: 'EMA 20' };
        break;

      case 'ema26':
        const ema26Values = calculateEMA(data, 26);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema26Values[i]
        }));
        seriesOptions = { color: '#9C27B0', lineWidth: 2, title: 'EMA 26' };
        break;

      case 'ema50':
        const ema50Values = calculateEMA(data, 50);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema50Values[i]
        }));
        seriesOptions = { color: '#F44336', lineWidth: 2, title: 'EMA 50' };
        break;

      case 'ema200':
        const ema200Values = calculateEMA(data, 200);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: ema200Values[i]
        }));
        seriesOptions = { color: '#795548', lineWidth: 2, title: 'EMA 200' };
        break;

      case 'sma20':
        const sma20Values = calculateSMA(data, 20);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma20Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#4CAF50', lineWidth: 2, title: 'SMA 20' };
        break;

      case 'sma50':
        const sma50Values = calculateSMA(data, 50);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma50Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#607D8B', lineWidth: 2, title: 'SMA 50' };
        break;

      case 'sma100':
        const sma100Values = calculateSMA(data, 100);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma100Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#FF5722', lineWidth: 2, title: 'SMA 100' };
        break;

      case 'sma200':
        const sma200Values = calculateSMA(data, 200);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: sma200Values[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#9E9E9E', lineWidth: 2, title: 'SMA 200' };
        break;

      case 'rsi':
        const rsiValues = calculateRSI(data);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: rsiValues[i]
        })).filter(d => d.value !== null);
        seriesOptions = { color: '#E91E63', lineWidth: 2, title: 'RSI' };
        break;

      case 'atr':
        const atrValues = calculateATR(data);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: atrValues[i]
        })).filter(d => d.value !== null && !isNaN(d.value));
        seriesOptions = { color: '#00BCD4', lineWidth: 2, title: 'ATR' };
        break;

      case 'macd':
        const macdData = calculateMACD(data);
        seriesData = data.map((d, i) => ({
          time: d.date ? d.date.substring(0, 10) : "",
          value: macdData.histogram[i]
        })).filter(d => d.value !== null && !isNaN(d.value));
        seriesOptions = { color: '#673AB7', lineWidth: 2, title: 'MACD Histogram' };
        break;

      case 'supertrend': {
  const { supertrend, trend } = calculateSupertrend(data, 10, 3);

  const lineData = [];
  let lastPoint = null;

  for (let i = 0; i < data.length; i++) {
    const time = data[i].date ? data[i].date.substring(0, 10) : "";
    if (supertrend[i] === null || isNaN(supertrend[i])) continue;

    const color = trend[i] === 1 ? 'green' : 'red';

    // If trend flipped, duplicate the last point with old color
    if (lastPoint && lastPoint.color !== color) {
      lineData.push({
        time,
        value: lastPoint.value, // duplicate last value
        color,
      });
    }

    lineData.push({
      time,
      value: supertrend[i],
      color,
    });

    lastPoint = { value: supertrend[i], color };
  }

  if (seriesRefs.current[indicator]) {
    chart.removeSeries(seriesRefs.current[indicator]);
  }

  const stSeries = chart.addSeries(LineSeries, {
    lineWidth: 2,
    priceScaleId,
    lastValueVisible: true,
    crossHairMarkerVisible: true,
  });

  stSeries.setData(lineData);
  seriesRefs.current[indicator] = stSeries;
  return;
}
    }

    if (seriesRefs.current[indicator]) {
      chart.removeSeries(seriesRefs.current[indicator]);
    }
    seriesOptions.priceScaleId = priceScaleId;
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
    const totalHeight = 500;
    const mainChartHeight = Math.round(totalHeight * 0.75);
    const volumeChartHeight = totalHeight - mainChartHeight;

    // Get container divs
    const mainDiv = chartContainerRef.current?.querySelector('.main-chart-pane');
    const volumeDiv = chartContainerRef.current?.querySelector('.volume-chart-pane');
    if (!mainDiv || !volumeDiv) return;

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
      });
      const volumeData = processedData.map(d => ({
        time: d.date ? d.date.substring(0, 10) : "",
        value: d.volume,
        color: d.close >= d.open ? "#22c55e" : "#ef4444"
      }));
      volumeSeries.setData(volumeData);
      // Hide price axis labels for volume chart
      volumeChart.priceScale('right').applyOptions({
        borderVisible: false,
        entireTextOnly: true,
        visible: true,
        ticksVisible: false,
        autoScale: true,
        mode: 0,
        alignLabels: false,
        drawTicks: false,
        borderColor: '#fff',
        textColor: '#fff',
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
        syncing = false;
      };
      const syncVolumeToMain = (range) => {
        if (syncing) return;
        syncing = true;
        const mainTimeScale = mainChartRef.current.timeScale();
        mainTimeScale.setVisibleRange(range);
        syncing = false;
      };
      mainChartRef.current.timeScale().subscribeVisibleTimeRangeChange(syncMainToVolume);
      volumeChartRef.current.timeScale().subscribeVisibleTimeRangeChange(syncVolumeToMain);
      // Fit content for both
      mainChartRef.current.timeScale().fitContent();
      volumeChartRef.current.timeScale().fitContent();
    } else if (mainChartRef.current) {
      mainChartRef.current.timeScale().fitContent();
    }

    const handleResize = () => {
      if (mainChartRef.current && mainDiv) {
        mainChartRef.current.applyOptions({
          width: mainDiv.offsetWidth,
        });
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
    };
  }, [processedData, indicators, timeframe]);

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
          {['ema13', 'ema20', 'ema26', 'ema50', 'ema200'].map((ema) => (
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

      {/* Chart Container with main and volume charts stacked */}
      <div
        ref={chartContainerRef}
        style={{
          width: "100%",
          height: 500,
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
          gap: 0
        }}
      >
        <div
          className="main-chart-pane"
          style={{ flex: "0 0 75%", height: "75%", minHeight: 0 }}
        />
        <div
          className="volume-chart-pane"
          style={{ flex: "0 0 25%", height: "25%", minHeight: 0 }}
        />
      </div>

      {/* Active Indicators Legend */}
      {Object.entries(indicators).some(([_, enabled]) => enabled) && (
        <div style={{
          position: "absolute",
          top: 100,
          left: 10,
          background: "rgba(255, 255, 255, 0.95)",
          padding: "8px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          border: "1px solid #e9ecef",
          maxWidth: "200px"
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>📊 Active Indicators</div>
          {Object.entries(indicators)
            .filter(([_, enabled]) => enabled)
            .map(([indicator, _]) => {
              const colors = {
                ema13: '#2196F3', ema20: '#FF9800', ema26: '#9C27B0', ema50: '#F44336', ema200: '#795548',
                sma20: '#4CAF50', sma50: '#607D8B', sma100: '#FF5722', sma200: '#9E9E9E',
                rsi: '#E91E63', atr: '#00BCD4', macd: '#673AB7', supertrend: '#009688'
              };

              const labels = {
                ema13: 'EMA 13', ema20: 'EMA 20', ema26: 'EMA 26', ema50: 'EMA 50', ema200: 'EMA 200',
                sma20: 'SMA 20', sma50: 'SMA 50', sma100: 'SMA 100', sma200: 'SMA 200',
                rsi: 'RSI', atr: 'ATR', macd: 'MACD', supertrend: 'Supertrend'
              };

              return (
                <div key={indicator} style={{
                  color: colors[indicator] || '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  margin: '2px 0'
                }}>
                  <span>●</span> {labels[indicator]}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default LightweightChart;
