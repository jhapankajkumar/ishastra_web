import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
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
        boxShadow: "0 2px 8px rgba(0, 0, 246, 0)"
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
    // Build last 12 months keys
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last12Months.push({ month: MONTHS[d.getMonth()], year: d.getFullYear(), key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    // Build a map for last 6 months only
    const monthlyPnlMap = {};
    last12Months.forEach(({ key }) => {
      monthlyPnlMap[key] = 0;
    });
    trades.forEach(trade => {
      const exits = trade.exitTransactions || [];
      if (!exits || exits.length === 0) return; // Skip trades without exits
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
        }
      });

    });
    data = last12Months.map(({ month, key }) => ({
      month,
      pnl: monthlyPnlMap[key] || 0
    }));
  }
  // Defensive: always use an array
  data = Array.isArray(data) ? data : [];
  return (
    <ResponsiveContainer width="99%" height="100%" debounce={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#232e42" />
        <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
        <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxisTick} width={56} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="pnl" radius={[6, 6, 0, 0]} isAnimationActive={false} >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10B981" : "#EF4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PerformanceChart;
