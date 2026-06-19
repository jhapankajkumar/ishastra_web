const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatValue = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return 'N/A';
  if (typeof value === 'number') return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${suffix}`;
  return `${escapeHtml(value)}${suffix}`;
};

const verdictClass = (verdict) => {
  if (verdict === 'PASS') return 'pass';
  if (verdict === 'REJECT') return 'reject';
  return 'watch';
};

const annotationSummaryRows = (annotations = {}) => {
  const rows = [
    ['Pole', annotations.pole?.visible, annotations.pole?.startPrice, annotations.pole?.endPrice],
    ['Flag upper', annotations.flagUpper?.visible, annotations.flagUpper?.startPrice, annotations.flagUpper?.endPrice],
    ['Flag lower', annotations.flagLower?.visible, annotations.flagLower?.startPrice, annotations.flagLower?.endPrice],
    ['Support', annotations.supportZone?.visible, annotations.supportZone?.lowPrice, annotations.supportZone?.highPrice],
    ['Resistance', annotations.resistanceZone?.visible, annotations.resistanceZone?.lowPrice, annotations.resistanceZone?.highPrice],
    ['Entry', annotations.entryZone?.visible, annotations.entryZone?.lowPrice, annotations.entryZone?.highPrice],
    ['Stop', annotations.stopLoss?.visible, annotations.stopLoss?.price, null],
    ['Target', annotations.targetZone?.visible, annotations.targetZone?.lowPrice, annotations.targetZone?.highPrice],
  ];

  return rows.map(([label, visible, low, high]) => `
    <tr>
      <td>${escapeHtml(label)}</td>
      <td>${visible ? 'Visible' : 'Not clear'}</td>
      <td>${formatValue(low)}</td>
      <td>${formatValue(high)}</td>
    </tr>
  `).join('');
};

export function buildSetupReportHtml({
  symbol,
  chartImageDataUrl,
  review,
  metadata,
  generatedAt = new Date()
}) {
  const technical = metadata?.technicalSummary || {};
  const ohlc = metadata?.ohlcSummary || {};
  const blockers = Array.isArray(review?.passBlockers) ? review.passBlockers : [];
  const verdict = review?.verdict || 'WATCH';
  const setupType = review?.setupType || 'UNCLEAR';
  const setupMaturity = review?.setupMaturity || 'EARLY';
  const reportTitle = `${symbol || review?.symbol || 'UNKNOWN'} Swing Setup Review`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(reportTitle)}</title>
  <style>
    :root {
      --navy: #17335c;
      --ink: #111827;
      --muted: #64748b;
      --border: #cbd5e1;
      --panel: #ffffff;
      --green: #15803d;
      --red: #b91c1c;
      --purple: #7e22ce;
      --amber: #b45309;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: #f8fafc;
    }
    .page {
      width: 100%;
      min-height: 100vh;
      background: #fff;
      border: 1px solid #bfdbfe;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      padding: 18px 24px;
      border-bottom: 1px solid #dbeafe;
      background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
    }
    .title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: 0;
    }
    .subtitle {
      margin-top: 4px;
      color: var(--muted);
      font-size: 13px;
    }
    .stamp {
      text-align: right;
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 360px;
      gap: 18px;
      padding: 18px;
    }
    .chart-panel {
      border: 1px solid #e2e8f0;
      background: #fff;
      min-width: 0;
    }
    .chart-image {
      display: block;
      width: 100%;
      height: auto;
    }
    .side {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .card {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 4px;
      overflow: hidden;
    }
    .card-title {
      padding: 12px 16px;
      color: #fff;
      background: var(--navy);
      font-weight: 800;
      font-size: 15px;
      text-transform: uppercase;
      letter-spacing: 0;
    }
    .card-body {
      padding: 14px 16px;
    }
    .verdict {
      border: 1px solid #86efac;
      background: #f0fdf4;
      color: #14532d;
      text-align: center;
      padding: 18px;
      border-radius: 4px;
      font-size: 18px;
      font-weight: 900;
    }
    .verdict.watch {
      border-color: #fde68a;
      background: #fffbeb;
      color: #92400e;
    }
    .verdict.reject {
      border-color: #fecaca;
      background: #fef2f2;
      color: #991b1b;
    }
    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .metric {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 9px 10px;
      background: #f8fafc;
    }
    .metric-label {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .metric-value {
      font-size: 15px;
      font-weight: 800;
    }
    ul {
      margin: 0;
      padding-left: 18px;
    }
    li {
      margin: 8px 0;
      line-height: 1.35;
    }
    .summary {
      line-height: 1.5;
      color: #1f2937;
    }
    .footer-note {
      border-top: 1px solid #dbeafe;
      background: #eff6ff;
      padding: 14px 24px;
      text-align: center;
      color: #17335c;
      font-size: 16px;
      font-weight: 700;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th, td {
      border-bottom: 1px solid #e2e8f0;
      padding: 7px 6px;
      text-align: left;
    }
    th {
      color: var(--muted);
      font-size: 11px;
      text-transform: uppercase;
    }
    .legend {
      display: grid;
      gap: 8px;
      font-size: 13px;
    }
    .legend span {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .swatch {
      width: 26px;
      height: 3px;
      display: inline-block;
      border-radius: 2px;
    }
    .dashed { border-top: 2px dashed currentColor; height: 0; background: transparent; }
    @media print {
      body { background: #fff; }
      .page { border: 0; }
      .layout { grid-template-columns: minmax(0, 1fr) 330px; }
    }
    @media (max-width: 980px) {
      .layout { grid-template-columns: 1fr; }
      .stamp { text-align: left; }
      .header { flex-direction: column; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div>
        <div class="title">${escapeHtml(reportTitle)}</div>
        <div class="subtitle">Daily chart technical setup review · AI visual analysis · Candles preserved</div>
      </div>
      <div class="stamp">
        Generated ${escapeHtml(generatedAt.toLocaleString())}<br />
        Last close: ${formatValue(ohlc.lastClose)}
      </div>
    </header>

    <section class="layout">
      <div class="chart-panel">
        <img class="chart-image" src="${chartImageDataUrl}" alt="${escapeHtml(symbol)} annotated swing trading chart" />
      </div>

      <aside class="side">
        <section class="card">
          <div class="card-title">Setup Verdict</div>
          <div class="card-body">
            <div class="verdict ${verdictClass(verdict)}">${escapeHtml(verdict)} · ${escapeHtml(review?.qualityGrade || 'N/A')}</div>
            <div class="metrics" style="margin-top: 14px;">
              <div class="metric">
                <div class="metric-label">Setup Type</div>
                <div class="metric-value">${escapeHtml(setupType)}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Maturity</div>
                <div class="metric-value">${escapeHtml(setupMaturity)}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Pivot Visible</div>
                <div class="metric-value">${review?.pivotVisible ? 'Yes' : 'No'}</div>
              </div>
              <div class="metric">
                <div class="metric-label">Pivot Price</div>
                <div class="metric-value">${formatValue(review?.estimatedPivotPrice)}</div>
              </div>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-title">Pattern Check</div>
          <div class="card-body">
            ${blockers.length
              ? `<ul>${blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join('')}</ul>`
              : '<div class="summary">No pass blockers. Setup is actionable based on current chart evidence.</div>'}
          </div>
        </section>

        <section class="card">
          <div class="card-title">Annotation Legend</div>
          <div class="card-body legend">
            <span><i class="swatch" style="background:#16a34a"></i>Pole / support</span>
            <span><i class="swatch dashed" style="color:#7e22ce"></i>Bull flag channel</span>
            <span><i class="swatch" style="background:#dc2626"></i>Resistance</span>
            <span><i class="swatch" style="background:#bbf7d0"></i>Entry zone</span>
            <span><i class="swatch dashed" style="color:#dc2626"></i>Stop loss</span>
            <span><i class="swatch dashed" style="color:#16a34a"></i>Target zone</span>
          </div>
        </section>

        <section class="card">
          <div class="card-title">Key Levels</div>
          <div class="card-body">
            <table>
              <thead>
                <tr><th>Item</th><th>Status</th><th>Low / From</th><th>High / To</th></tr>
              </thead>
              <tbody>${annotationSummaryRows(review?.annotations)}</tbody>
            </table>
          </div>
        </section>
      </aside>
    </section>

    <section class="layout" style="padding-top: 0;">
      <section class="card">
        <div class="card-title">Technical Summary</div>
        <div class="card-body metrics">
          <div class="metric"><div class="metric-label">52W High</div><div class="metric-value">${formatValue(technical.high52w)}</div></div>
          <div class="metric"><div class="metric-label">From 52W High</div><div class="metric-value">${formatValue(technical.distanceFrom52wHighPct, '%')}</div></div>
          <div class="metric"><div class="metric-label">EMA 10</div><div class="metric-value">${formatValue(technical.ema10)}</div></div>
          <div class="metric"><div class="metric-label">EMA 20</div><div class="metric-value">${formatValue(technical.ema20)}</div></div>
          <div class="metric"><div class="metric-label">EMA 50</div><div class="metric-value">${formatValue(technical.ema50)}</div></div>
          <div class="metric"><div class="metric-label">EMA 200</div><div class="metric-value">${formatValue(technical.ema200)}</div></div>
          <div class="metric"><div class="metric-label">ATR %</div><div class="metric-value">${formatValue(technical.atrPct, '%')}</div></div>
          <div class="metric"><div class="metric-label">Vol vs 50D</div><div class="metric-value">${formatValue(technical.volumeVs50dAvg)}x</div></div>
        </div>
      </section>

      <section class="card">
        <div class="card-title">Reviewer Summary</div>
        <div class="card-body summary">${escapeHtml(review?.summary || '')}</div>
      </section>
    </section>

    <div class="footer-note">
      ${verdict === 'PASS'
        ? 'Verdict: Setup is suitable for today’s active entry shortlist.'
        : verdict === 'WATCH'
          ? 'Verdict: Structurally interesting, but wait for better timing or a clearer pivot.'
          : 'Verdict: Setup quality is not acceptable for current swing entry consideration.'}
    </div>
  </main>
</body>
</html>`;
}

export function downloadHtmlReport(html, fileName) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
