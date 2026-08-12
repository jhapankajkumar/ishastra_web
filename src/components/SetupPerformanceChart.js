import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { getPartialPL } from "../common/Helper";
import { useTheme } from "../contexts/ThemeContext";

function SetupPerformanceChart({ trades, setups, currencySymbol = '$' }) {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  // Build id-to-name map from setups
  const idToName = React.useMemo(() => {
    if (!Array.isArray(setups)) return {};
    return Object.fromEntries(setups.map(s => [s.id, s.name]));
  }, [setups]);

  // Aggregate trades by setup name
  const setupMap = {};
  trades.forEach(trade => {
    // Prefer trade.tradeSetupId, fallback to trade.setup
    const setupId = trade.tradeSetupId
    const setupName = idToName[setupId] || setupId || "Other";

    if (!setupMap[setupName]) {
      setupMap[setupName] = { count: 0, pnl: 0 };
    }
    setupMap[setupName].count += 1;
    // Use your calculatePnl function or getPartialPL
    const pnl = Number(getPartialPL(trade));
    setupMap[setupName].pnl += pnl;
  });
  const data = Object.entries(setupMap).map(([setup, { count, pnl }]) => ({
    setup,
    count,
    pnl
  }));

  if (!data.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#9CA3AF', fontSize: 14 }}>
        No trades to display
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].payload;
      return (
        <div style={{
          background: isDark ? "linear-gradient(90deg, #1A2332 60%, #232e42 100%)" : "#fff",
          border: `1px solid ${isDark ? "#2A3441" : "#e2e8f0"}`,
          borderRadius: "10px",
          padding: "14px 18px",
          color: isDark ? "#fff" : "#1e293b",
          boxShadow: isDark ? "0 2px 8px rgba(16,185,129,0.08)" : "0 8px 32px rgba(0,0,0,0.1)"
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{value.setup}</div>
          <div style={{ fontWeight: 600, fontSize: 14, color: value.pnl >= 0 ? "#10B981" : "#EF4444" }}>
            {`Trades: ${value.count}`}
          </div>
          <div style={{ fontWeight: 600, fontSize: 14, color: value.pnl >= 0 ? "#10B981" : "#EF4444" }}>
            {`P&L: ${value.pnl >= 0 ? '+' : ''}${currencySymbol}${value.pnl.toLocaleString()}`}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={Math.max(60 + data.length * 48, 320)}>
      <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 70, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#232e42" : "rgba(226,232,240,0.7)"} />
        <XAxis type="number" dataKey="count" stroke={isDark ? "#9CA3AF" : "#64748b"} fontSize={16} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="setup"
          stroke={isDark ? "#9CA3AF" : "#64748b"}
          fontSize={13}
          width={110}
          tick={({ x, y, payload }) => {
            // Word wrap for long setup names
            const words = String(payload.value).split(' ');
            const lines = [];
            let line = '';
            words.forEach((word, idx) => {
              if ((line + ' ' + word).length > 18) {
                lines.push(line);
                line = word;
              } else {
                line = line ? line + ' ' + word : word;
              }
              if (idx === words.length - 1) lines.push(line);
            });
            return (
              <g transform={`translate(${x - 10},${y})`}>
                {lines.map((txt, i) => (
                  <text
                    key={i}
                    x={0}
                    y={i * 15}
                    textAnchor="end"
                    fontSize={13}
                    fill="#9CA3AF"
                    style={{ fontWeight: 500 }}
                  >
                    {txt}
                  </text>
                ))}
              </g>
            );
          }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="count" radius={[6, 6, 6, 6]} isAnimationActive={false} barSize={28} >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? "#10B981" : "#EF4444"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export default SetupPerformanceChart;
