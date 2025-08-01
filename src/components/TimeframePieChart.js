import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ["#6366F1", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#A7F3D0", "#F472B6", "#FBBF24", "#60A5FA", "#3B2F1A"];

function getTimeframeCounts(trades) {
  const acc = {};
  trades.forEach(trade => {
    console.log("Trade:", trade.timeframeUsed);
    const tf = trade.timeframeUsed || 'Unknown';
    acc[tf] = (acc[tf] || 0) + 1;
  });
  return Object.entries(acc).map(([name, value]) => ({ name, value }));
}

const TimeframePieChart = ({ trades }) => {
  const data = React.useMemo(() => getTimeframeCounts(trades), [trades]);
  if (!data.length) return <div style={{ color: '#9CA3AF', textAlign: 'center', padding: 24 }}>No timeframe data</div>;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
        >
          {data.map((entry, idx) => (
            <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value, name) => [`${value} trades`, name]} />
        <Legend verticalAlign="middle" align="right" layout="vertical" />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default TimeframePieChart;
