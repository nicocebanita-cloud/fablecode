(() => {
  'use strict';

  // ---------- Données de démonstration (générées, déterministes) ----------
  const DAYS = 180;
  const SOURCES = [
    { name: 'Recherche organique', share: 0.41 },
    { name: 'Accès direct', share: 0.22 },
    { name: 'Réseaux sociaux', share: 0.16 },
    { name: 'Sites référents', share: 0.11 },
    { name: 'E-mail', share: 0.07 },
    { name: 'Publicité', share: 0.03 },
  ];
  const DEVICES = [
    { name: 'Mobile', share: 0.56, color: 'var(--series-1)' },
    { name: 'Ordinateur', share: 0.36, color: 'var(--series-2)' },
    { name: 'Tablette', share: 0.08, color: 'var(--series-3)' },
  ];
  const PAGES = [
    { path: '/', share: 0.27, time: 48, bounce: 38 },
    { path: '/tarifs', share: 0.16, time: 95, bounce: 31 },
    { path: '/blog/guide-de-demarrage', share: 0.13, time: 212, bounce: 54 },
    { path: '/fonctionnalites', share: 0.12, time: 104, bounce: 36 },
    { path: '/blog', share: 0.09, time: 66, bounce: 47 },
    { path: '/contact', share: 0.07, time: 58, bounce: 42 },
    { path: '/a-propos', share: 0.05, time: 71, bounce: 51 },
  ];

  function mulberry32(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildData() {
    const rnd = mulberry32(20261112);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < DAYS; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - (DAYS - 1 - i));
      const dow = date.getDay();
      const weekend = dow === 0 || dow === 6 ? 0.68 : 1;
      const trend = 1 + (i / DAYS) * 0.55;
      const wave = 1 + 0.08 * Math.sin(i / 9);
      const visits = Math.round(1400 * trend * weekend * wave * (0.9 + rnd() * 0.2));
      days.push({
        date,
        visits,
        visitors: Math.round(visits * (0.68 + rnd() * 0.06)),
        bounce: 41 + Math.sin(i / 14) * 3 + (rnd() - 0.5) * 4 - (i / DAYS) * 3,
        duration: 128 + Math.cos(i / 11) * 12 + (rnd() - 0.5) * 16 + (i / DAYS) * 14,
        jitter: rnd(),
      });
    }
    return days;
  }

  const DATA = buildData();

  // ---------- Formatage ----------
  const nf = new Intl.NumberFormat('fr-FR');
  const pf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const dShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });
  const dLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const dFull = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const duration = (s) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
  const compact = (n) => (n >= 10000 ? `${pf.format(n / 1000).replace(',0', '')} k` : nf.format(n));
  const sum = (arr, key) => arr.reduce((a, d) => a + d[key], 0);
  const avg = (arr, key) => sum(arr, key) / arr.length;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---------- Infobulle ----------
  const tip = $('tooltip');
  function showTip(html, x, y) {
    tip.innerHTML = html;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let left = x + 14;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - 14;
    tip.style.left = `${Math.max(8, left)}px`;
    tip.style.top = `${Math.max(8, Math.min(y - r.height / 2, window.innerHeight - r.height - 8))}px`;
  }
  const hideTip = () => { tip.hidden = true; };

  // ---------- Indicateurs ----------
  function renderKpis(cur, prev) {
    const items = [
      { label: 'Visites', cur: sum(cur, 'visits'), prev: sum(prev, 'visits'), fmt: compact, upGood: true },
      { label: 'Visiteurs uniques', cur: sum(cur, 'visitors'), prev: sum(prev, 'visitors'), fmt: compact, upGood: true },
      { label: 'Taux de rebond', cur: avg(cur, 'bounce'), prev: avg(prev, 'bounce'), fmt: (v) => `${pf.format(v)} %`, upGood: false },
      { label: 'Durée moyenne', cur: avg(cur, 'duration'), prev: avg(prev, 'duration'), fmt: duration, upGood: true },
    ];
    $('kpis').innerHTML = items.map((k) => {
      const change = ((k.cur - k.prev) / k.prev) * 100;
      const up = change >= 0;
      const cls = `${up ? 'up' : 'down'}-${up === k.upGood ? 'good' : 'bad'}`;
      return `<div class="kpi">
        <div class="label">${k.label}</div>
        <div class="value">${k.fmt(k.cur)}</div>
        <div class="delta"><b class="${cls}">${up ? '▲' : '▼'} ${pf.format(Math.abs(change))} %</b> vs période précédente</div>
      </div>`;
    }).join('');
  }

  // ---------- Courbe d'audience ----------
  function niceMax(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    return [1, 2, 2.5, 5, 10].map((m) => m * p).find((s) => s >= v);
  }

  function renderLine(cur) {
    const el = $('line-chart');
    const W = Math.max(300, el.clientWidth);
    const H = W < 520 ? 220 : 280;
    const m = { l: 40, r: 52, t: 12, b: 26 };
    const iw = W - m.l - m.r;
    const ih = H - m.t - m.b;
    const max = niceMax(Math.max(...cur.map((d) => d.visits)));
    const x = (i) => m.l + (cur.length === 1 ? iw / 2 : (i / (cur.length - 1)) * iw);
    const y = (v) => m.t + ih - (v / max) * ih;
    const path = (key) => cur.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join('');
    const last = cur.length - 1;

    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      grid += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}" stroke="${i ? 'var(--grid)' : 'var(--axis)'}"/>
        <text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${compact(v).replace(' ', ' ')}</text>`;
    }
    const nTicks = Math.min(cur.length, W < 520 ? 4 : 7);
    let ticks = '';
    for (let t = 0; t < nTicks; t++) {
      const i = Math.round((t / (nTicks - 1)) * last);
      ticks += `<text x="${x(i)}" y="${H - 6}" text-anchor="${t === 0 ? 'start' : t === nTicks - 1 ? 'end' : 'middle'}">${dShort.format(cur[i].date)}</text>`;
    }

    // Étiquettes de fin de courbe, écartées si elles se chevauchent
    let y1 = y(cur[last].visits) + 4;
    let y2 = y(cur[last].visitors) + 4;
    if (y2 - y1 < 14) y2 = y1 + 14;

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Visites et visiteurs uniques par jour">
      ${grid}${ticks}
      <path d="${path('visits')}L${x(last)},${y(0)}L${x(0)},${y(0)}Z" fill="var(--series-1)" opacity=".10"/>
      <path d="${path('visitors')}" fill="none" stroke="var(--series-2)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${path('visits')}" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      <circle cx="${x(last)}" cy="${y(cur[last].visitors)}" r="4" fill="var(--series-2)" stroke="var(--surface)" stroke-width="2"/>
      <circle cx="${x(last)}" cy="${y(cur[last].visits)}" r="4" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2"/>
      <text class="end-label" x="${x(last) + 9}" y="${y1}">${compact(cur[last].visits)}</text>
      <text class="end-label" x="${x(last) + 9}" y="${y2}">${compact(cur[last].visitors)}</text>
      <g id="hover" visibility="hidden">
        <line id="h-line" y1="${m.t}" y2="${m.t + ih}" stroke="var(--muted)"/>
        <circle id="h-c2" r="5" fill="var(--series-2)" stroke="var(--surface)" stroke-width="2"/>
        <circle id="h-c1" r="5" fill="var(--series-1)" stroke="var(--surface)" stroke-width="2"/>
      </g>
      <rect id="h-zone" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}" fill="transparent"/>
    </svg>`;

    const svg = el.querySelector('svg');
    const zone = svg.querySelector('#h-zone');
    const hover = svg.querySelector('#hover');
    const move = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      const box = svg.getBoundingClientRect();
      const px = ((pt.clientX - box.left) / box.width) * W;
      const i = Math.max(0, Math.min(last, Math.round(((px - m.l) / iw) * last)));
      const d = cur[i];
      hover.setAttribute('visibility', 'visible');
      svg.querySelector('#h-line').setAttribute('x1', x(i));
      svg.querySelector('#h-line').setAttribute('x2', x(i));
      svg.querySelector('#h-c1').setAttribute('cx', x(i));
      svg.querySelector('#h-c1').setAttribute('cy', y(d.visits));
      svg.querySelector('#h-c2').setAttribute('cx', x(i));
      svg.querySelector('#h-c2').setAttribute('cy', y(d.visitors));
      showTip(`<div class="t-title">${dLong.format(d.date)}</div>
        <div class="t-row"><span class="key" style="background:var(--series-1)"></span><span>Visites</span><b>${nf.format(d.visits)}</b></div>
        <div class="t-row"><span class="key" style="background:var(--series-2)"></span><span>Visiteurs uniques</span><b>${nf.format(d.visitors)}</b></div>`,
        box.left + (x(i) / W) * box.width, pt.clientY);
    };
    const leave = () => { hover.setAttribute('visibility', 'hidden'); hideTip(); };
    zone.addEventListener('mousemove', move);
    zone.addEventListener('mouseleave', leave);
    zone.addEventListener('touchstart', move, { passive: true });
    zone.addEventListener('touchmove', move, { passive: true });
    zone.addEventListener('touchend', leave);

    $('line-table').innerHTML = `<thead><tr><th>Date</th><th>Visites</th><th>Visiteurs uniques</th></tr></thead><tbody>${
      cur.slice().reverse().map((d) => `<tr><td class="dim">${dFull.format(d.date)}</td><td>${nf.format(d.visits)}</td><td>${nf.format(d.visitors)}</td></tr>`).join('')
    }</tbody>`;
  }

  // ---------- Répartitions ----------
  // Fait varier légèrement les parts selon la période, puis répartit le total.
  function split(defs, total, cur) {
    const j = avg(cur, 'jitter') - 0.5;
    const w = defs.map((d, i) => d.share * (1 + j * (i % 2 ? -1.6 : 1.6)));
    const wsum = w.reduce((a, b) => a + b, 0);
    return defs.map((d, i) => ({ ...d, value: Math.round((total * w[i]) / wsum), pct: (w[i] / wsum) * 100 }))
      .sort((a, b) => b.value - a.value);
  }

  function renderSources(cur) {
    const rows = split(SOURCES, sum(cur, 'visits'), cur);
    const max = rows[0].value;
    $('sources').innerHTML = rows.map((r) => `<div class="bar-row" data-tip="${esc(r.name)}|${nf.format(r.value)} visites|${pf.format(r.pct)} % du total">
      <span class="name">${r.name}</span>
      <span class="track"><span class="fill" style="display:block;width:${(r.value / max) * 100}%"></span></span>
      <span class="num">${compact(r.value)}</span>
    </div>`).join('');
  }

  function renderDevices(cur) {
    const rows = split(DEVICES, sum(cur, 'visits'), cur);
    $('devices').innerHTML = `<div class="segbar" role="img" aria-label="Répartition des visites par appareil">${
      rows.map((r) => `<div style="flex:${r.pct};background:${r.color}" data-tip="${esc(r.name)}|${nf.format(r.value)} visites|${pf.format(r.pct)} % du total"></div>`).join('')
    }</div><ul class="seg-list">${
      rows.map((r) => `<li><span class="key" style="background:${r.color}"></span><span class="name">${r.name}</span><span class="num">${compact(r.value)}</span><span class="pct">${pf.format(r.pct)} %</span></li>`).join('')
    }</ul>`;
  }

  function renderPages(cur) {
    const rows = split(PAGES, Math.round(sum(cur, 'visits') * 1.9), cur);
    $('pages').innerHTML = `<thead><tr><th>Page</th><th>Vues</th><th>Part</th><th>Temps moyen</th><th>Taux de rebond</th></tr></thead><tbody>${
      rows.map((r) => `<tr><td class="path">${r.path}</td><td>${nf.format(r.value)}</td><td class="dim">${pf.format(r.pct)} %</td><td class="dim">${duration(r.time)}</td><td class="dim">${r.bounce} %</td></tr>`).join('')
    }</tbody>`;
  }

  // Infobulles des barres (délégation d'événements)
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { if (!e.target.closest || !e.target.closest('#line-chart')) hideTip(); return; }
    const [title, a, b] = t.dataset.tip.split('|');
    showTip(`<div class="t-title">${esc(title)}</div><div><b>${esc(a)}</b></div><div class="muted">${esc(b)}</div>`, e.clientX, e.clientY);
  });

  // ---------- Assemblage ----------
  let range = 30;
  function render() {
    const cur = DATA.slice(-range);
    const prev = DATA.slice(-2 * range, -range);
    $('period-label').textContent = `Du ${dFull.format(cur[0].date)} au ${dFull.format(cur[cur.length - 1].date)}`;
    renderKpis(cur, prev);
    renderLine(cur);
    renderSources(cur);
    renderDevices(cur);
    renderPages(cur);
  }

  document.querySelectorAll('.range button').forEach((b) => {
    b.addEventListener('click', () => {
      range = Number(b.dataset.range);
      document.querySelectorAll('.range button').forEach((o) => o.classList.toggle('active', o === b));
      render();
    });
  });

  let raf;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => renderLine(DATA.slice(-range)));
  });

  render();
})();
