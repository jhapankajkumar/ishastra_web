import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, defs, linearGradient, stop } from "recharts";
import { getPartialPL } from "../common/Helper";

function formatYAxisTick(value) {
  if (value >= 1000 || value <= -1000) return (value / 1000) + 'K';
  return value;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div style={{
        background: "linear-gradient(90deg, #1A2332 60%, #232e42 100%)",
        border: "1px solid #2A3441",
        borderRadius: "10px",
        padding: "14px 18px",
        color: "#fff",
        boxShadow: "0 2px 8px rgba(16,185,129,0.08)"
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: 16, color: value >= 0 ? "#10B981" : "#EF4444" }}>
          {`P&L: ${value >= 0 ? '+' : ''}$${value.toLocaleString()}`}
        </div>
      </div>
    );
  }
  return null;
};


// Accepts either 'trades' (raw trade array) or 'data' (already aggregated)
const PerformanceChart = (props) => {
  // Support both 'trades' and 'data' props for backward compatibility
  let data = Array.isArray(props.data) ? props.data : undefined;
  // If 'trades' is provided, aggregate to monthly PnL (last 6 months)
  if (!data && Array.isArray(props.trades)) {
    // Defensive: fallback to empty array if not an array
    const trades = props.trades;
    // Build last 6 months keys
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push({ month: MONTHS[d.getMonth()], year: d.getFullYear(), key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    // Build a map for last 6 months only
    const monthlyPnlMap = {};
    last6Months.forEach(({ key }) => {
      monthlyPnlMap[key] = 0;
    });
    // // Calculate PnL for each trade
    // function calculatePnl(trade) {
    //   if (
    //     trade.entryPrice == null ||
    //     trade.exitPrice == null ||
    //     trade.quantity == null ||
    //     !trade.direction
    //   ) return 0;
    //   const priceDiff =
    //     trade.direction.toLowerCase() === 'long'
    //       ? trade.exitPrice - trade.entryPrice
    //       : trade.entryPrice - trade.exitPrice;
    //   return priceDiff * trade.quantity;
    // }
    trades.forEach(trade => {
      const exits = trade.exitTransactions || [];
      if (!exits || exits.length === 0) return; // Skip trades without exits
      const date = new Date(exits[0].transactionDate);
      exits.forEach(tx => {
        if (!tx.transactionDate) return; // Skip if no transaction date
        const date = typeof tx.transactionDate === 'number' ? new Date(tx.transactionDate) : new Date(tx.transactionDate);
        if (isNaN(date)) return; // Skip if date is invalid
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyPnlMap.hasOwnProperty(key)) {
          let pl = 0;
          if (tx.price !== undefined && tx.quantity !== undefined) {
            const priceDiff = trade.direction.toLowerCase() === 'long'
                ? Number(tx.price) - Number(trade.entryPrice)
                : Number(trade.entryPrice) - Number(tx.price);
            pl += priceDiff * Number(tx.quantity);
            monthlyPnlMap[key] += pl;
          }
          console.log(key, pl);
        }
      });
      // if (isNaN(date)) return; // Skip if date is invalid
      // // Use year-month as key
      // date.setDate(1); // Normalize to first of month
      // const key = `${date.getFullYear()}-${date.getMonth()}`;
      // if (monthlyPnlMap.hasOwnProperty(key)) {
      //   const pnl = Number(getPartialPL(trade));
      //   monthlyPnlMap[key] += pnl;
      // }
    });
    data = last6Months.map(({ month, key }) => ({
      month,
      pnl: monthlyPnlMap[key] || 0
    }));
  }
  // Defensive: always use an array
  data = Array.isArray(data) ? data : [];
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.7}/>
            <stop offset="100%" stopColor="#10B981" stopOpacity={0.1}/>
          </linearGradient>
          <linearGradient id="pnlGradientNeg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.7}/>
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.1}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#232e42" />
        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
        <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxisTick} />
        <Tooltip content={<CustomTooltip />} />
        <Line 
          type="monotone"
          dataKey="pnl"
          stroke="#10B981"
          strokeWidth={3}
          dot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
          activeDot={{ r: 7 }}
          fillOpacity={1}
          fill={
            data.some(d => d.pnl < 0)
              ? "url(#pnlGradientNeg)"
              : "url(#pnlGradient)"
          }
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PerformanceChart;