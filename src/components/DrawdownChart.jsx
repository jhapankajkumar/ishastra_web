// src/components/DrawdownChart.jsx
//
// Plots drawdown — how far equity has fallen from its running peak — as a
// negative-only area. This is the metric serious traders/prop firms check
// first and that EquityCurve alone can't answer (a rising curve can still
// hide a brutal mid-period drawdown).
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

const CustomTooltip = ({ active, payload, label, theme, currencySymbol }) => {
  if (!active || !payload || !payload.length) return null;
  const dd = payload[0]?.value;
  const isDark = theme !== 'light';
  return (
    <div style={{
      background: isDark ? '#1A2332' : '#fff',
      border: '1px solid #EF4444',
      borderRadius: 10,
      padding: '12px 16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      minWidth: 150,
    }}>
      <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 6, fontWeight: 600, letterSpacing: 0.3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: '#EF4444' }}>
        {dd.toFixed(2)}%
      </div>
      <div style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#64748b', marginTop: 2 }}>
        below peak equity
      </div>
    </div>
  );
};

const DrawdownChart = ({ trades, initialCapital: propInitial, currencySymbol = '₹' }) => {
  const { theme } = useTheme();
  const isDark = theme !== 'light';

  const { chartData, maxDrawdown, maxDrawdownAmount } = useMemo(() => {
    const INIT = propInitial > 0 ? propInitial : 100000;
    if (!trades || trades.length === 0) {
      return { chartData: [], maxDrawdown: 0, maxDrawdownAmount: 0 };
    }

    const sorted = [...trades].filter(t => t.exitDate);

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
    let peak = INIT;
    let worstDrawdown = 0;
    let worstDrawdownAmount = 0;
    const raw = allExits.map(exit => {
      equity += exit.pnl;
      if (equity > peak) peak = equity;
      const drawdownPct = peak > 0 ? ((equity - peak) / peak) * 100 : 0;
      const drawdownAmount = equity - peak;
      if (drawdownPct < worstDrawdown) {
        worstDrawdown = drawdownPct;
        worstDrawdownAmount = drawdownAmount;
      }
      return { date: exit.date, label: getMonthShort(exit.date), drawdown: parseFloat(drawdownPct.toFixed(2)) };
    });

    const monthMap = new Map();
    raw.forEach(d => { monthMap.set(d.label, d); });
    const chartData = [{ label: 'Start', drawdown: 0 }, ...Array.from(monthMap.values())];

    return { chartData, maxDrawdown: worstDrawdown, maxDrawdownAmount: worstDrawdownAmount };
  }, [trades, propInitial]);

  if (!chartData.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: '#9CA3AF', fontSize: 14 }}>
        No exit history to display
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: 20, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Max Drawdown</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>{maxDrawdown.toFixed(2)}%</div>
        </div>
        <div style={{ width: 1, height: 36, background: isDark ? '#2D3748' : '#E2E8F0' }} />
        <div>
          <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>In value</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#EF4444', lineHeight: 1 }}>
            {currencySymbol}{Math.abs(maxDrawdownAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(239,68,68,0.05)" stopOpacity={1} />
              <stop offset="100%" stopColor="rgba(239,68,68,0.5)" stopOpacity={1} />
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
            tickFormatter={(v) => `${v}%`}
            domain={[Math.floor(maxDrawdown * 1.2) - 1, 1]}
            width={42}
          />
          <Tooltip
            content={<CustomTooltip theme={theme} currencySymbol={currencySymbol} />}
            cursor={{ stroke: isDark ? '#4B5563' : '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
          />
          <ReferenceLine y={0} stroke={isDark ? '#374151' : '#CBD5E1'} strokeWidth={1.5} />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#EF4444"
            strokeWidth={2}
            fill="url(#ddGrad)"
            dot={false}
            activeDot={{ r: 5, fill: '#EF4444', strokeWidth: 2, stroke: isDark ? '#1A2332' : '#fff' }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DrawdownChart;
