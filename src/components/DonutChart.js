import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ['#4f8cff', '#00c9a7', '#ffb347', '#ff5e57', '#a259ff'];

function getTotal(data) {
  return data.reduce((sum, d) => sum + d.value, 0);
}

function getMainPercent(data) {
  if (!data.length) return 0;
  const total = getTotal(data);
  const max = Math.max(...data.map(d => d.value));
  return Math.round((max / total) * 100);
}

function wrapLabel(label, maxLen = 10) {
  if (label.length <= maxLen) return [label];
  // Try to split at space if possible
  const idx = label.lastIndexOf(' ', maxLen);
  if (idx > 0) {
    return [label.slice(0, idx), label.slice(idx + 1)];
  }
  // Otherwise, just split at maxLen
  return [label.slice(0, maxLen), label.slice(maxLen)];
}

// Custom tooltip for donut chart
const CustomTooltip = ({ active, payload, total }) => {
  if (active && payload && payload.length) {
    const { label, value } = payload[0].payload;
    return (
      <div style={{
        background: "var(--bg-tertiary)",
        color: "var(--text-primary)",
        padding: "8px 12px",
        borderRadius: 6,
        boxShadow: "var(--shadow-lg)",
        fontSize: 14,
        border: "1px solid var(--border-primary)"
      }}>
        <div><strong>{label}</strong></div>
        <div>Count: {value}</div>
        <div>Percent: {Math.round((value / total) * 100)}%</div>
      </div>
    );
  }
  return null;
};

const DonutChart = ({ data, title }) => {
  const total = getTotal(data);
  const mainPercent = getMainPercent(data);

  // Sort data by value descending for legend display
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Legend on the left */}
      <div style={{ marginRight: 28, minWidth: 120 }}>
        {sortedData.map((entry, idx) => (
          <div key={entry.label} style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <span style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: COLORS[idx % COLORS.length],
              marginRight: 8
            }} />
            <span style={{ color: "#cfd8dc", fontSize: 14, marginRight: 6, minWidth: 28 }}>
              {Math.round((entry.value / total) * 100)}%
            </span>
            <span style={{ color: "#fff", fontSize: 14, lineHeight: "1.1" }}>
              {wrapLabel(entry.label).map((line, i) => (
                <span key={i} style={{ display: "block" }}>{line}</span>
              ))}
            </span>
          </div>
        ))}
      </div>
      {/* Donut Chart */}
      <div>
        <h3 style={{ marginBottom: 0, color: "#fff" }}>{title}</h3>
        <div style={{ width: "100%", height: 320, maxWidth: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
                {/* Center label */}
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="32"
                  fill="#cfd8dc"
                  fontWeight="bold"
                >
                  {mainPercent}%
                </text>
              </Pie>
              <Tooltip content={<CustomTooltip total={total} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DonutChart;