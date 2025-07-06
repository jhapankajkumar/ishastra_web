import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function formatYAxisTick(value) {
  if (value >= 1000 || value <= -1000) return (value / 1000) + 'K';
  return value;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div style={{
        backgroundColor: "#1A2332",
        border: "1px solid #2A3441",
        borderRadius: "8px",
        padding: "12px",
        color: "#fff"
      }}>
        <p style={{ margin: 0, fontWeight: "600" }}>{`${label}`}</p>
        <p style={{ 
          margin: "4px 0 0 0", 
          color: value >= 0 ? "#10B981" : "#EF4444",
          fontWeight: "600"
        }}>
          {`P&L: ${value >= 0 ? '+' : ''}$${value.toLocaleString()}`}
        </p>
      </div>
    );
  }
  return null;
};

const PerformanceChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data}>
      <XAxis dataKey="month" stroke="#9CA3AF" fontSize={12} />
      <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatYAxisTick} />
      <Tooltip content={<CustomTooltip />} />
      <Bar dataKey="pnl">
        {data.map((entry, index) => (
          <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10B981" : "#EF4444"} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
);

export default PerformanceChart;