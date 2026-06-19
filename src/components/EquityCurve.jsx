// src/components/EquityCurve.jsx
import React, { useMemo } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine
} from 'recharts';
import { useTheme } from '../contexts/ThemeContext';

const getMonthShort = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

const fmtRupee = (val) => {
  if (val == null || isNaN(val)) return '₹0';
  const abs = Math.abs(val);
  if (abs >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)}Cr`;
  if (abs >= 100_000) return `₹${(val / 100_000).toFixed(2)}L`;
  if (abs >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`;
  return `₹${val.toFixed(0)}`;
};

const CustomTooltip = ({ active, payload, label, theme, initialCapital }) => {
  if (!active || !payload || !payload.length) return null;
  const equity = payload[0]?.value;
  const change = equity - initialCapital;
  const changePct = ((change / initialCapital) * 100).toFixed(2);
  const isUp = change >= 0;
  const isDark = theme !== 'light';
  return (
    <div style={{
      background: isDark ? '#1A2332' : '#fff',
      border: `1px solid ${isUp ? '#10B981' : '#EF4444'}`,
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      minWidth: 170,
    }}>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6, fontWeight: 600, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: isDark ? '#fff' : '#1e293b', marginBottom: 4 }}>
        {fmtRupee(equity)}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: isUp ? '#10B981' : '#EF4444' }}>
        {isUp ? '▲ +' : '▼ '}{fmtRupee(Math.abs(change))}
        <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.85 }}>({isUp ? '+' : ''}{changePct}%)</span>
      </div>
    </div>
  );
};

const EquityCurve = ({ trades, initialCapital: propInitial }) => {
  const { theme } = useTheme();
  const isDark = theme !== 'light';
  const INITIAL_CAPITAL = propInitial > 0 ? propInitial : 100000;

  const { chartData, minEquity, maxEquity, totalReturn, isProfit, currentEquity } = useMemo(() => {
    const INIT = propInitial > 0 ? propInitial : 100000;
    if (!trades || trades.length === 0) {
      return { chartData: [], minEquity: INIT * 0.97, maxEquity: INIT * 1.03, totalReturn: 0, isProfit: true, currentEquity: INIT };
    }

    const sorted = [...trades]
      .filter(t => t.exitDate)
      .sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));

    const allExits = [];
    sorted.forEach(trade => {
      const entry = Number(trade.entryPrice || 0);
      const sign = (trade.direction || 'long').toLowerCase() === 'long' ? 1 : -1;
      const txs = trade.exitTransactions || [];
      if (txs.length === 0 && trade.exitPrice != null && trade.exitDate) {
        const soldQty = Number(trade.quantity || 0) - Number(trade.remainingQuantity || 0);
        if (soldQty > 0) {
          allExits.push({ date: trade.exitDate, pnl: sign * (Number(trade.exitPrice) - entry) * soldQty });
        }
      } else {
        txs.forEach(tx => {
          if (!tx.transactionDate || tx.price == null || tx.quantity == null) return;
          const d = typeof tx.transactionDate === 'number'
            ? new Date(tx.transactionDate).toISOString().slice(0, 10)
            : String(tx.transactionDate).slice(0, 10);
          allExits.push({ date: d, pnl: sign * (Number(tx.price) - entry) * Number(tx.quantity) });
        });
      }
    });
    allExits.sort((a, b) => new Date(a.date) - new Date(b.date));

    let equity = INIT;
    const raw = allExits.map(exit => {
      equity += exit.pnl;
      return { date: exit.date, label: getMonthShort(exit.date), equity: parseFloat(equity.toFixed(2)) };
    });

    const monthMap = new Map();
    raw.forEach(d => { monthMap.set(d.label, d); });
    const chartData = [{ label: 'Start', equity: INIT }, ...Array.from(monthMap.values())];

    const equities = chartData.map(d => d.equity);
    const minE = Math.min(...equities);
    const maxE = Math.max(...equities);
    // Ensure at least 5% of initial capital as visual padding so tiny moves still show curve
    const minPad = INIT * 0.05;
    const dataPad = (maxE - minE) * 0.25;
    const padding = Math.max(minPad, dataPad);

    return {
      chartData,
      minEquity: Math.floor((minE - padding) / 1000) * 1000,
      maxEquity: Math.ceil((maxE + padding) / 1000) * 1000,
      totalReturn: ((equity - INIT) / INIT) * 100,
      isProfit: equity >= INIT,
      currentEquity: equity,
    };
  }, [trades, propInitial]);

  const formatYAxis = (val) => {
    if (Math.abs(val) >= 10_000_000) return (val / 10_000_000).toFixed(1) + 'Cr';
    if (Math.abs(val) >= 100_000) return (val / 100_000).toFixed(1) + 'L';
    if (Math.abs(val) >= 1_000) return (val / 1_000).toFixed(0) + 'K';
    return val;
  };

  const lineColor = isProfit ? '#10B981' : '#EF4444';
  const gradientStart = isProfit ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)';
  const gradientId = isProfit ? 'eqGradUp' : 'eqGradDn';
  const pnlAbs = currentEquity - INITIAL_CAPITAL;

  if (!chartData.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#9CA3AF', fontSize: 14 }}>
        No exit history to display
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Current Value</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: isDark ? '#fff' : '#1e293b', lineHeight: 1 }}>{fmtRupee(currentEquity)}</div>
        </div>
        <div style={{ width: 1, height: 36, background: isDark ? '#2D3748' : '#E2E8F0' }} />
        <div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Total P&amp;L</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: lineColor, lineHeight: 1 }}>
            {pnlAbs >= 0 ? '+' : ''}{fmtRupee(pnlAbs)}
          </div>
        </div>
        <div style={{ width: 1, height: 36, background: isDark ? '#2D3748' : '#E2E8F0' }} />
        <div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Return</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: lineColor, lineHeight: 1 }}>
            {isProfit ? '+' : ''}{totalReturn.toFixed(2)}%
          </div>
        </div>
        <div style={{ width: 1, height: 36, background: isDark ? '#2D3748' : '#E2E8F0' }} />
        <div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Starting Capital</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: isDark ? '#9CA3AF' : '#64748b', lineHeight: 1 }}>{fmtRupee(INITIAL_CAPITAL)}</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientStart} stopOpacity={1} />
              <stop offset="100%" stopColor={gradientStart} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke={isDark ? 'rgba(45,55,72,0.8)' : 'rgba(226,232,240,0.8)'}
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="transparent"
            tick={{ fontSize: 10, fill: isDark ? '#6B7280' : '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            stroke="transparent"
            tick={{ fontSize: 10, fill: isDark ? '#6B7280' : '#94a3b8' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatYAxis}
            domain={[minEquity, maxEquity]}
            width={42}
          />
          <Tooltip
            content={<CustomTooltip theme={theme} initialCapital={INITIAL_CAPITAL} />}
            cursor={{ stroke: isDark ? '#4B5563' : '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <ReferenceLine
            y={INITIAL_CAPITAL}
            stroke={isDark ? '#374151' : '#CBD5E1'}
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{ value: 'Start', position: 'insideTopLeft', fontSize: 9, fill: isDark ? '#6B7280' : '#94a3b8' }}
          />
          <Area
            type="monotone"
            dataKey="equity"
            stroke={lineColor}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, fill: lineColor, strokeWidth: 2, stroke: isDark ? '#1A2332' : '#fff' }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EquityCurve;
