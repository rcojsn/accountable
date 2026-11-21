// Small helpers so each mockup can draw its charts as inline SVG.
(function () {
  const M = window.MOCK;

  const money = n => 'R' + Math.round(n).toLocaleString('en-US');
  const short = n => {
    if (n >= 1e6) return 'R' + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
    if (n >= 1e3) return 'R' + Math.round(n / 1e3) + 'k';
    return 'R' + n;
  };
  const stage = key => M.stages.find(s => s.key === key);
  const initials = name => name.split(' ').filter(w => w[0] === w[0].toUpperCase()).map(w => w[0]).slice(0, 2).join('');

  function niceStep(x) {
    const p = Math.pow(10, Math.floor(Math.log10(x)));
    const n = x / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }

  function columnTotals(key) {
    const ds = M.deals.filter(d => d.stage === key);
    const value = ds.reduce((a, d) => a + d.value, 0);
    return { deals: ds, count: ds.length, value, expected: value * stage(key).prob / 100 };
  }

  // Line chart. o: { values, labels, color, height, fillOpacity, grid, text, format, dots, highlightLast }
  function lineChart(el, o) {
    const W = el.clientWidth, H = o.height || 240;
    const m = { l: 52, r: 18, t: o.highlightLast ? 62 : 18, b: 30 };
    const step = niceStep(Math.max(...o.values) / 4), max = step * 4;
    const n = o.values.length;
    const x = i => m.l + i * (W - m.l - m.r) / (n - 1);
    const y = v => m.t + (H - m.t - m.b) * (1 - v / max);
    const pts = o.values.map((v, i) => [x(i), y(v)]);
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, t = 0.18;
      d += ` C${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
    }
    const area = `${d} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`;
    const grid = o.grid || 'rgba(7,59,76,.08)', text = o.text || '#4F6B75', fmt = o.format || short;
    let s = `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    for (let k = 0; k <= 4; k++) {
      const v = step * k;
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${grid}"/>`;
      s += `<text x="${m.l - 10}" y="${y(v) + 4}" text-anchor="end" style="fill:${text}">${fmt(v)}</text>`;
    }
    o.labels.forEach((l, i) => { s += `<text x="${x(i)}" y="${H - 8}" text-anchor="middle" style="fill:${text}">${l}</text>`; });
    s += `<path d="${area}" fill="${o.color}" fill-opacity="${o.fillOpacity ?? 0.12}"/>`;
    s += `<path d="${d}" fill="none" stroke="${o.color}" stroke-width="${o.width || 3}" stroke-linecap="round"/>`;
    if (o.dots !== false) pts.forEach(p => { s += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${o.dotFill || '#fff'}" stroke="${o.color}" stroke-width="2"/>`; });
    if (o.highlightLast) {
      const p = pts[n - 2];
      s += `<line x1="${p[0]}" x2="${p[0]}" y1="48" y2="${y(0)}" stroke="${o.color}" stroke-dasharray="3 4" stroke-opacity=".6"/>`;
      s += `<circle cx="${p[0]}" cy="${p[1]}" r="6" fill="${o.color}" stroke="#fff" stroke-width="3"/>`;
      const bw = 132, bx = Math.min(p[0] - bw / 2, W - m.r - bw), by = 4;
      s += `<g><rect x="${bx}" y="${by}" width="${bw}" height="44" rx="10" fill="${o.tipBg || '#073B4C'}"/>`;
      s += `<text x="${bx + 12}" y="${by + 18}" style="fill:${o.tipMuted || '#CDD8DB'};font-family:var(--sans);font-size:11px">October · ${M.won[n - 2]} deals</text>`;
      s += `<text x="${bx + 12}" y="${by + 35}" style="fill:#fff;font-size:13px;font-weight:600">${money(o.values[n - 2])}</text></g>`;
    }
    el.innerHTML = s + '</svg>';
  }

  // Grouped bars. o: { series: [{values, color, label}], labels, height, radius }
  function barChart(el, o) {
    const W = el.clientWidth, H = o.height || 220;
    const m = { l: 30, r: 8, t: 12, b: 30 };
    const all = o.series.flatMap(s => s.values);
    const max = Math.max(4, Math.ceil(Math.max(...all) + 1));
    const n = o.labels.length, group = (W - m.l - m.r) / n;
    const bw = Math.min(14, (group - 10) / o.series.length);
    const y = v => m.t + (H - m.t - m.b) * (1 - v / max);
    const grid = o.grid || 'rgba(7,59,76,.08)', text = o.text || '#4F6B75';
    let s = `<svg class="chart" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    for (let k = 0; k <= max; k++) {
      if (k % (max > 4 ? 2 : 1)) continue;
      s += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(k)}" y2="${y(k)}" stroke="${grid}"/>`;
      s += `<text x="${m.l - 10}" y="${y(k) + 4}" text-anchor="end" style="fill:${text}">${k}</text>`;
    }
    o.labels.forEach((l, i) => {
      const cx = m.l + group * i + group / 2;
      const start = cx - (bw * o.series.length + 3 * (o.series.length - 1)) / 2;
      o.series.forEach((se, j) => {
        const v = se.values[i], bx = start + j * (bw + 3), r = Math.min(o.radius ?? 4, bw / 2);
        if (v > 0) s += `<rect x="${bx}" y="${y(v)}" width="${bw}" height="${y(0) - y(v)}" rx="${r}" fill="${se.color}"/>`;
      });
      s += `<text x="${cx}" y="${H - 8}" text-anchor="middle" style="fill:${text}">${l}</text>`;
    });
    el.innerHTML = s + '</svg>';
  }

  const typeIcon = t => ({ call: 'phone', email: 'mail', note: 'sticky-note', stage: 'arrow-right-left' }[t]);

  window.MK = { money, short, stage, initials, columnTotals, lineChart, barChart, typeIcon };
})();
