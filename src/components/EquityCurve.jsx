// src/components/EquityCurve.jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import styles from './EquityCurve.module.css';

// Helper to format month from date string
const getMonthShort = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { month: 'short' });
};

// Helper to calculate P&L for each trade
const calculatePnl = (trade) => {
  if (
    trade.entry_price == null ||
    trade.quantity == null ||
    !trade.direction
  ) return 0;
  // If exit_price is missing (open trade), use entry_price (P&L = 0)
  const exit = trade.exit_price != null ? trade.exit_price : trade.entry_price;
  const priceDiff =
    trade.direction.toLowerCase() === 'long'
      ? exit - trade.entry_price
      : trade.entry_price - exit;
  return priceDiff * trade.quantity;
};

const INITIAL_CAPITAL = 100000; // Set your starting capital here

const EquityCurve = ({ trades }) => {
  // Calculate P&L for each trade
  const tradesWithPnl = trades
    .sort((a, b) => new Date(a.exit_date) - new Date(b.exit_date))
    .map(trade => ({
      ...trade,
      pnl: calculatePnl(trade)
    }));

  // Build cumulative equity curve
  let equity = INITIAL_CAPITAL;
  const data = tradesWithPnl.map(trade => {
    equity += trade.pnl || 0;
    return {
      date: trade.exit_date?.slice(0, 10),
      month: getMonthShort(trade.exit_date),
      equity: parseFloat(equity.toFixed(2))
    };
  });

  // Get unique months with their first date
  const uniqueMonthTicks = [];
  const seenMonths = new Set();
  data.forEach(d => {
    const month = getMonthShort(d.date);
    if (!seenMonths.has(month)) {
      uniqueMonthTicks.push(d.date);
      seenMonths.add(month);
    }
  });

  // Find the first trade's month
  const firstTradeMonth = data.length > 0 ? data[0].month : null;

  // Add initial capital point at the very start
  const monthlyData = [{
    month: "",
    equity: INITIAL_CAPITAL
  }];

  // Then fill in the rest as before
  let lastMonth = null;
  data.forEach(d => {
    if (d.month !== lastMonth) {
      monthlyData.push(d);
      lastMonth = d.month;
    } else {
      // Replace the last entry for this month with the latest one
      monthlyData[monthlyData.length - 1] = d;
    }
  });

  const minEquity = INITIAL_CAPITAL;
  const maxEquity = Math.ceil(Math.max(...monthlyData.map(d => d.equity)) / 1000) * 1000;

  // Calculate dynamic interval for at least 10 ticks
  const range = maxEquity - minEquity;
  const approxInterval = range / 10;

  // Helper to round interval to a "nice" value (1K, 2K, 5K, 10K, etc.)
  function niceInterval(val) {
    if (val <= 1000) return 1000;
    if (val <= 2000) return 2000;
    if (val <= 5000) return 5000;
    if (val <= 10000) return 10000;
    if (val <= 20000) return 20000;
    if (val <= 50000) return 50000;
    if (val <= 100000) return 100000;
    if (val <= 200000) return 200000;
    if (val <= 500000) return 500000;
    return Math.ceil(val / 100000) * 100000;
  }
  const interval = niceInterval(approxInterval);

  // Generate yTicks dynamically
  const yTicks = [];
  for (let i = minEquity; i <= maxEquity; i += interval) {
    yTicks.push(i);
  }
  if (yTicks[yTicks.length - 1] < maxEquity) yTicks.push(maxEquity);

  // Helper to format large numbers as 109K, 1.2M, etc.
  function formatYAxisTick(value) {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1) + 'K';
    return value;
  }

  function formatTooltipValue(value) {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(2) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(2) + 'K';
    return value.toFixed(2);
  }

  return (
    <div className={styles.card}>
      <h3>Equity Curve</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={monthlyData}>
          <CartesianGrid stroke="#22304a" strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            stroke="#b3b8c7"
            tick={{ fontSize: 13 }}
          />
          <YAxis
            stroke="#b3b8c7"
            tick={{ fontSize: 13 }}
            tickFormatter={formatYAxisTick}
            domain={[minEquity, maxEquity]}
            ticks={yTicks}
            label={{ value: 'Equity ($)', angle: -90, position: 'insideLeft', fill: '#b3b8c7', fontSize: 13 }}
          />
          <Tooltip
            contentStyle={{ background: "#1a2233", border: "none", color: "#fff" }}
            labelStyle={{ color: "#fff" }}
            itemStyle={{ color: "#fff" }}
            formatter={(value, name) =>
              name === "equity"
                ? [formatTooltipValue(value), "Equity"]
                : [value, name]
            }
          />
          <Line
            type="monotone"
            dataKey="equity"
            stroke="#4f8cff"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EquityCurve;