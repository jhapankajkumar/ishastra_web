import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from "recharts";
import { useTheme } from '../contexts/ThemeContext';
import { getPartialPL } from "../common/Helper";

function formatYAxisTick(value) {
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(value) >= 1_000) return Math.round(value / 1000) + 'K';
  return Math.round(value);
}

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const sym = currency === 'USD' ? '$' : '₹';
    const isPos = value >= 0;
    return (
      <div style={{
        background: "linear-gradient(135deg, #1A2332 60%, #232e42 100%)",
        border: `1px solid ${isPos ? '#10B981' : '#EF4444'}`,
        borderRadius: 10,
        padding: "12px 16px",
        color: "#fff",
        boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        minWidth: 140
      }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#9CA3AF' }}>{label}</div>
        <div style={{ fontWeight: 800, fontSize: 18, color: isPos ? "#10B981" : "#EF4444" }}>
          {isPos ? '+' : ''}{sym}{Math.abs(value).toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </div>
      </div>
    );
  }
  return null;
};

const PerformanceChart = (props) => {
  const { theme } = useTheme();
  const currency = props.currency || 'INR';

  let data = Array.isArray(props.data) ? props.data : undefined;
  if (!data && Array.isArray(props.trades)) {
    const trades = props.trades;
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last12Months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last12Months.push({ month: MONTHS[d.getMonth()], year: d.getFullYear(), key: `${d.getFullYear()}-${d.getMonth()}` });
    }
    const monthlyPnlMap = {};
    last12Months.forEach(({ key }) => { monthlyPnlMap[key] = 0; });
    trades.forEach(trade => {
      const exits = trade.exitTransactions || [];
      if (!exits || exits.length === 0) return;
      exits.forEach(tx => {
        if (!tx.transactionDate) return;
        const date = typeof tx.transactionDate === 'number' ? new Date(tx.transactionDate) : new Date(tx.transactionDate);
        if (isNaN(date)) return;
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
  data = Array.isArray(data) ? data : [];

  const maxAbs = Math.max(...data.map(d => Math.abs(d.pnl)), 1);
  const yDomain = [-(maxAbs * 1.15), maxAbs * 1.15];

  return (
    <ResponsiveContainer width="99%" height="100%" debounce={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          vertical={false}
          stroke={theme === 'light' ? 'rgba(226,232,240,0.7)' : 'rgba(42,52,65,0.8)'}
        />
        <XAxis
          dataKey="month"
          stroke="transparent"
          tick={{ fontSize: 11, fill: theme === 'light' ? '#64748b' : '#6B7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="transparent"
          tick={{ fontSize: 11, fill: theme === 'light' ? '#64748b' : '#6B7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={formatYAxisTick}
          width={44}
          domain={yDomain}
        />
        <ReferenceLine
          y={0}
          stroke={theme === 'light' ? '#94a3b8' : '#374151'}
          strokeWidth={1.5}
        />
        <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="pnl" radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive={true} animationDuration={600}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10B981" : "#EF4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default PerformanceChart;
