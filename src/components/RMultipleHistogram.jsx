// src/components/RMultipleHistogram.jsx
//
// Buckets closed trades' R-multiples into fixed bins so a trader can see
// their actual outcome shape — "a few big winners" vs "death by 1000 cuts"
// — rather than just an average. Trades with no computable R (missing
// stop-loss) are excluded and called out explicitly in the caption, since
// silently dropping them would make the chart look more complete than the
// underlying data actually is.
import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import { getRMultiple } from '../common/Helper';

const BUCKETS = [
  { label: '< -2R', min: -Infinity, max: -2 },
  { label: '-2..-1R', min: -2, max: -1 },
  { label: '-1..0R', min: -1, max: 0 },
  { label: '0..1R', min: 0, max: 1 },
  { label: '1..2R', min: 1, max: 2 },
  { label: '2..3R', min: 2, max: 3 },
  { label: '> 3R', min: 3, max: Infinity },
];

const CustomTooltip = ({ active, payload, theme }) => {
  if (!active || !payload || !payload.length) return null;
  const value = payload[0].payload;
  const isDark = theme !== 'light';
  return (
    <div style={{
      background: isDark ? '#1A2332' : '#fff',
      border: `1px solid ${value.count >= 0 && value.label.includes('-') === false ? '#10B981' : '#9CA3AF'}`,
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: isDark ? '#fff' : '#1e293b' }}>{value.label}</div>
      <div style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#64748b' }}>{value.count} trade{value.count !== 1 ? 's' : ''}</div>
    </div>
  );
};

const RMultipleHistogram = ({ trades }) => {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const { data, excludedCount, totalClosed } = useMemo(() => {
    const closed = (trades || []).filter(t => t.exitDate);
    const buckets = BUCKETS.map(b => ({ ...b, count: 0 }));
    let excluded = 0;

    closed.forEach(trade => {
      const r = getRMultiple(trade);
      if (r == null) {
        excluded += 1;
        return;
      }
      const bucket = buckets.find(b => r >= b.min && r < b.max) || buckets[buckets.length - 1];
      bucket.count += 1;
    });

    return { data: buckets, excludedCount: excluded, totalClosed: closed.length };
  }, [trades]);

  if (!totalClosed) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#9CA3AF', fontSize: 14 }}>
        No closed trades to display
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke={isDark ? 'rgba(42,52,65,0.8)' : 'rgba(226,232,240,0.7)'}
          />
          <XAxis
            dataKey="label"
            stroke="transparent"
            tick={{ fontSize: 10, fill: isDark ? '#6B7280' : '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="transparent"
            tick={{ fontSize: 11, fill: isDark ? '#6B7280' : '#64748b' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={30}
          />
          <ReferenceLine x="0..1R" stroke="transparent" />
          <Tooltip content={<CustomTooltip theme={theme} />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={40} isAnimationActive>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.min >= 0 ? '#10B981' : '#EF4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 12, color: isDark ? '#6B7280' : '#94a3b8', marginTop: 8, textAlign: 'center' }}>
        {excludedCount > 0
          ? `${excludedCount} of ${totalClosed} closed trades excluded — no stop-loss recorded, R-multiple not computable.`
          : `All ${totalClosed} closed trades have a computable R-multiple.`}
      </div>
    </div>
  );
};

export default RMultipleHistogram;
