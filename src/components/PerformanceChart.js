import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

function formatYAxisTick(value) {
  if (value >= 1000 || value <= -1000) return (value / 1000) + 'K';
  return value;
}

const PerformanceChart = ({ data }) => (
  <ResponsiveContainer width="100%" height={220}>
    <BarChart data={data}>
      <XAxis dataKey="month" stroke="#fff" />
      <YAxis stroke="#fff" tickFormatter={formatYAxisTick} />
      <Tooltip />
      <Bar dataKey="pnl" fill="#4f8cff" />
    </BarChart>
  </ResponsiveContainer>
);

export default PerformanceChart;