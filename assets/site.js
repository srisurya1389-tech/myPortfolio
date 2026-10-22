/* =====================================================================
   Portfolio site. All content comes from /content.json.
   Edit content with the admin panel at /admin (no need to touch this file).
   ===================================================================== */

/* ---------------- Sound (synthesised in the browser, no audio files) ---------------- */
var Sound = (function () {
  var AC = null, master, verb, on = false;
  function init() {
    if (AC) return true;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      var comp = AC.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 5;
      master = AC.createGain(); master.gain.value = .85; master.connect(comp); comp.connect(AC.destination);
      verb = AC.createConvolver();
      var len = AC.sampleRate * 3, b = AC.createBuffer(2, len, AC.sampleRate);
      for (var c = 0; c < 2; c++) { var d = b.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
      verb.buffer = b; var vg = AC.createGain(); vg.gain.value = .45; verb.connect(vg); vg.connect(master);
      on = true; return true;
    } catch (e) { AC = null; return false; }
  }
  function T(o) { return AC.currentTime + (o || 0); }
  function out(n) { n.connect(master); n.connect(verb); }
  function noise(sec) { var len = AC.sampleRate * sec, b = AC.createBuffer(1, len, AC.sampleRate), d = b.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; var s = AC.createBufferSource(); s.buffer = b; return s; }
  function boom(o, f0, dur, vol) {
    if (!AC || !on) return; var w = T(o);
    var s = AC.createOscillator(), g = AC.createGain(); s.type = 'sine';
    s.frequency.setValueAtTime(f0, w); s.frequency.exponentialRampToValueAtTime(f0 * .35, w + dur * .6);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(vol, w + .01); g.gain.exponentialRampToValueAtTime(.0001, w + dur);
    s.connect(g); out(g); s.start(w); s.stop(w + dur + .1);
    var n = noise(.3), f = AC.createBiquadFilter(), ng = AC.createGain(); f.type = 'lowpass'; f.frequency.value = 900;
    ng.gain.setValueAtTime(vol * .5, w); ng.gain.exponentialRampToValueAtTime(.0001, w + .25);
    n.connect(f); f.connect(ng); out(ng); n.start(w);
  }
  function swell(o, dur) {
    if (!AC || !on) return; var w = T(o);
    var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(200, w); lp.frequency.exponentialRampToValueAtTime(2400, w + dur);
    var g = AC.createGain(); g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(.16, w + dur * .85); g.gain.exponentialRampToValueAtTime(.0001, w + dur + 1.8);
    lp.connect(g); out(g);
    [73.42, 110, 146.83, 220, 277.18].forEach(function (f, i) { var s = AC.createOscillator(); s.type = 'sawtooth'; s.frequency.value = f; s.detune.value = (i % 2 ? 7 : -7); s.connect(lp); s.start(w); s.stop(w + dur + 2); });
  }
  function whoosh() {
    if (!AC || !on) return; var w = T();
    var n = noise(1), bp = AC.createBiquadFilter(), g = AC.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(300, w); bp.frequency.exponentialRampToValueAtTime(2600, w + .45); bp.frequency.exponentialRampToValueAtTime(400, w + .9);
    g.gain.setValueAtTime(.0001, w); g.gain.exponentialRampToValueAtTime(.25, w + .4); g.gain.exponentialRampToValueAtTime(.0001, w + .95);
    n.connect(bp); bp.connect(g); out(g); n.start(w);
  }
  function tick() {
    if (!AC || !on) return; var w = T();
    var s = AC.createOscillator(), g = AC.createGain(); s.type = 'triangle'; s.frequency.value = 1400;
    g.gain.setValueAtTime(.06, w); g.gain.exponentialRampToValueAtTime(.0001, w + .06); s.connect(g); g.connect(master); s.start(w); s.stop(w + .08);
  }
  function signature() { boom(0, 95, 1.6, .9); boom(.32, 62, 2.4, 1); swell(.1, 2.2); }
  function set(v) { if (v && !AC) init(); if (!AC) return false; on = v; if (AC.state === 'suspended') AC.resume(); return on; }
  return { set: set, isOn: function () { return !!AC && on; }, signature: signature, whoosh: whoosh, tick: tick, boom: boom };
})();

/* ---------------- Load content ---------------- */
(function () {
  var params = new URLSearchParams(location.search);
  var PREVIEW = params.has('preview');

  function start(C) {
    document.getElementById('loading').remove();
    try { App(C, params); }
    catch (e) { console.error(e); document.body.insertAdjacentHTML('afterbegin', '<p style="padding:20px;color:#f88">Content error: ' + e.message + '</p>'); }
  }
  if (PREVIEW) {
    try {
      var d = localStorage.getItem('portfolio_draft');
      if (d) { start(JSON.parse(d)); document.body.insertAdjacentHTML('beforeend', '<div class="preview-badge">PREVIEW · unpublished draft</div>'); return; }
    } catch (e) {}
  }
  fetch('content.json', { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(start)
    .catch(function () {
      document.getElementById('loading').innerHTML = 'Could not load content.json.<br>If you opened this file directly, run it with a local server (see README).';
    });
})();

/* ---------------- Build the site ---------------- */
function App(C, params) {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ME = C.me || {};
  var fill = function (s) { return String(s || '').replace(/\{name\}/g, ME.name || '').replace(/\{fullName\}/g, ME.fullName || ''); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SEC = C.sections || {};
  var ALL = ['story', 'moments', 'skills', 'originals', 'about', 'journey', 'picks'];

  /* Theme & meta */
  var root = document.documentElement.style;
  if (C.site && C.site.accent) { root.setProperty('--red', C.site.accent); root.setProperty('--red2', mix(C.site.accent, '#ffffff', .25)); }
  if (C.site && C.site.gold) { root.setProperty('--gold', C.site.gold); root.setProperty('--gold2', mix(C.site.gold, '#ffffff', .4)); }
  if (C.site && C.site.grain === false) { var g = $('.grain'); if (g) g.remove(); }
  if (window.CursorTrail) CursorTrail.init(C.site && C.site.cursor);
  document.title = fill((C.site && C.site.title) || ME.name);
  setMeta('description', fill(C.site && C.site.description));
  setMeta('og:title', document.title, true); setMeta('og:description', fill(C.site && C.site.description), true);
  if (ME.photo) setMeta('og:image', ME.photo.indexOf('data:') === 0 ? '' : new URL(ME.photo, location.href).href, true);

  function setMeta(n, v, og) { var el = document.querySelector(og ? 'meta[property="' + n + '"]' : 'meta[name="' + n + '"]'); if (!el) { el = document.createElement('meta'); el.setAttribute(og ? 'property' : 'name', n); document.head.appendChild(el); } el.setAttribute('content', v || ''); }
  function mix(a, b, t) { var p = function (h) { h = h.replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }; try { var x = p(a), y = p(b); return 'rgb(' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(',') + ')'; } catch (e) { return a; } }

  var ICON = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 4l14 8-14 8z"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 5l7 7-7 7"/></svg>',
    sOn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12"/></svg>',
    sOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg>'
  };
  var GLYPH = window.PORTFOLIO_GLYPHS = {
    orbit: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><circle cx="50" cy="50" r="14" fill="currentColor"/><ellipse cx="50" cy="50" rx="44" ry="16" transform="rotate(-25 50 50)"/><ellipse cx="50" cy="50" rx="44" ry="16" transform="rotate(35 50 50)" opacity=".6"/><circle cx="88" cy="36" r="5" fill="currentColor"/></svg>',
    people: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><circle cx="36" cy="36" r="13"/><circle cx="68" cy="40" r="10"/><path d="M12 82c2-16 12-24 24-24s22 8 24 24M58 62c4-3 7-4 10-4 10 0 18 7 20 22"/></svg>',
    leaf: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 80C20 40 45 18 84 16c-2 40-24 64-64 64z"/><path d="M20 80L62 38M40 60h14M50 50V36"/></svg>',
    code: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4"><path d="M34 30L12 50l22 20M66 30l22 20-22 20M58 18L42 82"/></svg>',
    shield: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M50 10l34 12v26c0 22-14 36-34 44C30 84 16 70 16 48V22z"/><path d="M36 50l10 10 20-22"/></svg>',
    chart: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M14 86h74M24 74V52M42 74V36M60 74V46M78 74V22"/><path d="M20 40l20-16 20 12 24-22"/></svg>',
    cart: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M10 18h12l10 46h46l8-32H28"/><circle cx="40" cy="80" r="6"/><circle cx="72" cy="80" r="6"/></svg>',
    phone: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><rect x="28" y="10" width="44" height="80" rx="8"/><path d="M44 78h12"/></svg>',
    brain: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M50 20c-6-8-24-6-26 6-10 2-12 16-6 22-6 8 0 22 10 22 2 10 16 12 22 4V20zM50 20c6-8 24-6 26 6 10 2 12 16 6 22 6 8 0 22-10 22-2 10-16 12-22 4"/><path d="M50 20v54"/></svg>',
    cube: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M50 10l36 20v40L50 90 14 70V30z"/><path d="M14 30l36 20 36-20M50 50v40"/></svg>',
    game: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M28 30h44c12 0 18 14 18 30 0 14-10 16-16 8l-8-10H34l-8 10c-6 8-16 6-16-8 0-16 6-30 18-30z"/><path d="M30 44v12M24 50h12"/><circle cx="66" cy="46" r="3" fill="currentColor"/><circle cx="74" cy="54" r="3" fill="currentColor"/></svg>',
    heart: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M50 84S12 62 12 36c0-12 9-22 21-22 8 0 14 4 17 10 3-6 9-10 17-10 12 0 21 10 21 22 0 26-38 48-38 48z"/></svg>'
  };

  var phN = 0;
  function photo(label, src) {
    src = src || ME.photo;
    if (src) return '<img src="' + esc(src) + '" alt="' + esc(ME.fullName) + '" style="width:100%;height:100%;object-fit:cover;object-position:50% 18%">';
    var id = 'p' + (phN++);
    return '<svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMax slice" width="100%" height="100%" role="img" aria-label="Photo placeholder">' +
      '<defs><radialGradient id="' + id + 'g" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#e8233a" stop-opacity=".55"/><stop offset="1" stop-color="#e8233a" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + id + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2230"/><stop offset="1" stop-color="#121016"/></linearGradient></defs>' +
      '<rect width="400" height="500" fill="url(#' + id + 'g)"/>' +
      '<path d="M200 330c-70 0-135 40-150 170h300c-15-130-80-170-150-170z" fill="url(#' + id + 'b)" stroke="#ff5468" stroke-opacity=".55" stroke-width="2"/>' +
      '<rect x="176" y="270" width="48" height="70" rx="20" fill="#1e1922"/>' +
      '<ellipse cx="200" cy="200" rx="72" ry="88" fill="url(#' + id + 'b)" stroke="#ff5468" stroke-opacity=".55" stroke-width="2"/>' +
      (label ? '<text x="200" y="440" fill="#ffffff" fill-opacity=".55" font-family="DM Sans,sans-serif" font-size="13" font-weight="700" letter-spacing="3" text-anchor="middle">YOUR PHOTO HERE</text>' : '') + '</svg>';
  }
  function fillPhotos(r) { $$('[data-photo]', r).forEach(function (el) { var k = el.dataset.photo; el.innerHTML = photo(k === 'about', k === 'about' ? ((C.about && C.about.photo) || ME.photo) : ME.photo); }); }

  function laurel() {
    var leaves = '';
    for (var side = -1; side <= 1; side += 2) for (var i = 0; i < 8; i++) {
      var a = (200 + i * 17) * Math.PI / 180, r = 36, cx = 75 + side * Math.cos(a) * -r * 1.75, cy = 56 + Math.sin(a) * -r * .95, rot = (side < 0 ? -1 : 1) * (i * 17 - 20);
      leaves += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" rx="4" ry="9" transform="rotate(' + (side < 0 ? rot - 30 : rot + 30).toFixed(0) + ' ' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ')"/>';
    }
    return '<svg viewBox="0 0 150 84" fill="var(--gold)" aria-hidden="true">' + leaves + '</svg>';
  }

  /* ---------- Intro ---------- */
  var I = C.intro || {};
  var nm = String(ME.name || '').toUpperCase();
  $('#iName').innerHTML = nm.split('').map(function (ch, i) { return '<span style="--i:' + i + '">' + (ch === ' ' ? '&nbsp;' : esc(ch)) + '</span>'; }).join('');
  $('#iRole').textContent = ME.role || '';
  $('#iSeries').textContent = I.seriesText || '';
  $('#iPlayLbl').textContent = I.playLabel || 'Play';
  $('#skip').textContent = I.skipLabel || 'Skip intro';
  $('#navLogo').textContent = ME.initials || '';
  $('#navSub').textContent = (C.site && C.site.brandSuffix) || '';

  /* ---------- Profiles ---------- */
  var PROFILES = (C.profiles || []).filter(function (p) { return p && p.id; });
  if (!PROFILES.length) PROFILES = [{ id: 'main', name: '', tag: 'MAIN', desc: '', c1: '#7a1020', c2: '#e8233a', usePhoto: true, order: ALL }];
  PROFILES.forEach(function (p) {
    p.order = (p.order || []).filter(function (id) { return ALL.indexOf(id) > -1 && !(SEC[id] && SEC[id].hidden); });
    if (!p.order.length) p.order = ALL.slice();
    p.bg = 'linear-gradient(140deg,' + (p.c1 || '#333') + ',' + (p.c2 || '#666') + ')';
    p.bgAttr = esc(p.bg);
  });
  $('#profiles').innerHTML = PROFILES.map(function (p, i) {
    var face = p.usePhoto ? '<div class="ph" data-photo="prof"></div>' : esc(p.letter || (p.name || '?').charAt(0));
    return '<button class="prof" type="button" data-id="' + esc(p.id) + '" style="--i:' + i + '">' +
      '<span class="av" style="background:' + p.bgAttr + '">' + face + (p.tag ? '<span class="tag">' + esc(p.tag) + '</span>' : '') + '</span>' +
      '<b>' + esc(p.name || ME.name) + '</b><small>' + esc(p.desc) + '</small></button>';
  }).join('');
  var W = C.who || {};
  $('#whoTitle').textContent = W.title || "Who's watching?";
  $('#whoNote').innerHTML = esc(W.note || '').replace(/\{name\}/g, '<em>' + esc(ME.name) + '</em>').replace(/\{fullName\}/g, '<em>' + esc(ME.fullName) + '</em>');

  /* ---------- Billboard ---------- */
  var m = ME.meta || {}, B = C.billboard || {};
  var metaBits = ['years', 'degree', 'originals', 'certs'].filter(function (k) { return m[k]; }).map(function (k) { return '<span>' + esc(m[k]) + '</span>'; }).join('');
  $('#billCopy').innerHTML =
    '<div class="mini-brand" style="--d:0"><b>' + esc(ME.initials) + '</b>' + esc((C.site && C.site.brandSuffix) || '') + '</div>' +
    '<h2 class="big-name" style="--d:1">' + esc(nm) + '</h2>' +
    (I.seriesText ? '<div class="series" style="--d:2">' + esc(I.seriesText) + '</div>' : '') +
    '<div class="meta" style="--d:3">' + (m.match ? '<span class="match">' + esc(m.match) + '</span>' : '') + (m.badge ? '<span class="badge">' + esc(m.badge) + '</span>' : '') + metaBits + '</div>' +
    '<div class="role" style="--d:4">' + esc(ME.role) + '</div>' +
    '<p class="bio" style="--d:5">' + esc(ME.bio) + '</p>' +
    '<div class="ctas" style="--d:6"><button class="b-white" type="button" id="replay">' + ICON.play + esc(B.playIntroLabel || 'Play intro') + '</button>' +
    '<a class="b-grey" href="' + esc((ME.links && ME.links.resume) || '#story') + '"' + ext((ME.links && ME.links.resume)) + '>' + ICON.doc + esc(B.resumeLabel || 'View résumé') + '</a>' +
    '<a class="b-round" href="#about" aria-label="More about me">' + ICON.info + '</a></div>';
  function ext(u) { return u && /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''; }

  /* ---------- Sections ---------- */
  var html = {};
  function head(id) { var s = SEC[id] || {}; return '<div class="sec-head"><div><div class="eyebrow">' + esc(fill(s.eyebrow)) + '</div><h2 class="h-sec">' + esc(fill(s.title)) + '</h2></div>' + (s.note ? '<p>' + esc(fill(s.note)) + '</p>' : '') + '</div>'; }
  function rowWrap(inner) { return '<div class="row-wrap"><button class="arrow l" type="button" aria-label="Scroll left">' + ICON.left + '</button><div class="row">' + inner + '</div><button class="arrow r" type="button" aria-label="Scroll right">' + ICON.right + '</button></div>'; }
  function items(list) { return (list || []).map(function (x) { return '<div class="item"><b>' + esc(x.t) + '</b><div class="w"><span>' + esc(x.w) + '</span><span>' + esc(x.y) + '</span></div>' + (x.d ? '<p>' + esc(x.d) + '</p>' : '') + '</div>'; }).join(''); }
  function arr(a) { return Array.isArray(a) ? a : []; }

  var S = C.story || {};
  html.story = '<div class="in">' + head('story') +
    '<div class="doc"><article class="paper rv"><h3>' + esc(String(ME.fullName || '').toUpperCase()) + '</h3><div class="sub">' + esc(ME.role) + ' · ' + esc(ME.email) + '</div>' +
    '<div class="cols">' +
    (arr(S.education).length ? '<div class="blk"><h4>Education</h4>' + items(S.education) + '</div>' : '') +
    (arr(S.experience).length ? '<div class="blk"><h4>Experience</h4>' + items(S.experience) + '</div>' : '') +
    (arr(S.highlights).length ? '<div class="blk"><h4>Highlights</h4>' + items(S.highlights) + '</div>' : '') +
    (arr(S.skills).length ? '<div class="blk"><h4>Skills</h4>' + items(S.skills) + '</div>' : '') +
    '</div></article>' +
    '<aside class="side-card rv" style="--i:2"><h4>' + esc(S.sideTitle) + '</h4><p>' + esc(S.sideText) + '</p>' +
    '<div class="kpis">' + arr(S.kpis).map(function (k) { return '<div><b>' + esc(k.value) + '</b><span>' + esc(k.label) + '</span></div>'; }).join('') + '</div>' +
    '<a class="b-red" href="' + esc((ME.links && ME.links.resume) || '#') + '"' + ext(ME.links && ME.links.resume) + '>' + ICON.doc + esc(S.buttonLabel || 'Open résumé') + '</a></aside></div></div>';

  html.moments = '<div class="in">' + head('moments') +
    '<div class="awards">' + arr(C.moments).map(function (a, i) { return '<div class="award rv" style="--i:' + i + '"><small>' + esc(a.by) + '</small><div class="laurel">' + laurel() + '<b>' + esc(a.t) + '</b></div><small>' + esc(a.y) + '</small><p>' + esc(a.d) + '</p></div>'; }).join('') + '</div>' +
    (arr(C.certs).length ? '<div class="certs-h"><b>Certified</b><span>' + C.certs.length + ' credentials</span></div></div>' +
      rowWrap(C.certs.map(function (c) { var tag = c.url ? 'a' : 'div'; return '<' + tag + ' class="cert"' + (c.url ? ' href="' + esc(c.url) + '" target="_blank" rel="noopener" style="text-decoration:none"' : '') + '><span class="org">' + esc(c.org) + '</span><b>' + esc(c.t) + '</b><span>Issued ' + esc(c.y) + '</span></' + tag + '>'; }).join('')) : '</div>');

  var cats = arr(C.skills);
  html.skills = '<div class="in">' + head('skills') +
    '<div class="universe"><div class="tabs" role="tablist">' + cats.map(function (c, i) { return '<button class="tab' + (i ? '' : ' on') + '" role="tab" type="button" data-cat="' + i + '" aria-selected="' + (i ? 'false' : 'true') + '"><b>' + esc(c.name) + '</b><span>' + arr(c.items).length + ' skills · ' + esc(c.sub) + '</span></button>'; }).join('') +
    '</div><div class="tiles" id="tiles"></div></div></div>';

  html.originals = '<div class="in">' + head('originals') + '</div>' +
    rowWrap(arr(C.originals).map(function (o, i) {
      var img = o.image ? ' has-img" style="background-image:url(\'' + esc(o.image) + '\')' : '';
      return '<article class="poster" style="--c1:' + esc(o.c1) + ';--c2:' + esc(o.c2) + '"><div class="vis' + img + '"><div class="o-tag"><b>' + esc(ME.initials) + '</b>ORIGINAL</div><div class="glyph">' + (GLYPH[o.icon] || GLYPH.orbit) + '</div><div class="num">' + (i < 9 ? '0' : '') + (i + 1) + '</div></div>' +
        '<div class="info"><div class="eyebrow">' + esc(o.g) + '</div><h3>' + esc(o.t) + '</h3><p>' + esc(o.d) + '</p><div class="chips">' + arr(o.stack).map(function (s) { return '<span>' + esc(s) + '</span>'; }).join('') + '</div>' +
        '<div class="ctas">' + (o.demo ? '<a class="b-white" href="' + esc(o.demo) + '"' + ext(o.demo) + '>' + ICON.play + esc(o.demoLabel || 'Watch demo') + '</a>' : '') + (o.code ? '<a class="b-grey" href="' + esc(o.code) + '"' + ext(o.code) + '>' + esc(o.codeLabel || 'Source code') + '</a>' : '') + '</div></div></article>';
    }).join(''));

  var A = C.about || {};
  var quote = esc(A.quote).replace(/\*(.+?)\*/g, '<em>$1</em>');
  html.about = '<div class="in">' + head('about') +
    '<div class="about"><figure class="portrait rv" style="margin:0"><div class="ph" data-photo="about"></div><figcaption>' + esc(String(ME.fullName || '').toUpperCase()) + '</figcaption></figure>' +
    '<div class="rv" style="--i:2"><blockquote>“' + quote + '”</blockquote><div class="facts">' + arr(A.facts).map(function (f) { return '<div><small>' + esc(f.label) + '</small><b>' + esc(f.value) + '</b></div>'; }).join('') + '</div></div></div></div>';

  var J = arr(C.journey);
  html.journey = '<div class="in">' + head('journey') +
    (J.length ? '<div class="season"><b>' + esc(fill((SEC.journey || {}).eyebrow || 'Season 1')) + '</b><span>' + J.length + ' episodes · ' + esc(J[0].y) + ' – now</span></div>' : '') + '</div>' +
    rowWrap(J.map(function (j) { return '<article class="jep" style="--c1:' + esc(j.c1) + ';--c2:' + esc(j.c2) + '"><div class="top"><small>EPISODE ' + esc(String(j.ep || '').replace(/^E/i, '')) + '</small><span class="yr">' + esc(j.y) + '</span><b>' + esc(j.ep) + '</b></div><div class="pg"><i style="width:' + (+j.p || 0) + '%"></i></div>' +
      '<div class="bd"><h3>' + esc(j.t) + '</h3><p>' + esc(j.d) + '</p></div></article>'; }).join(''));

  html.picks = '<div class="in">' + head('picks') + '</div>' +
    rowWrap(arr(C.picks).map(function (p, i) { return '<a class="pick" href="#' + esc(p.link || 'home') + '"><span class="n">' + (i + 1) + '</span><span class="pc" style="--c1:' + esc(p.c1) + ';--c2:' + esc(p.c2) + '">' + (p.badge ? '<span class="tt">TOP ' + C.picks.length + '</span>' : '') + '<small>' + esc(String(p.s || '').toUpperCase()) + '</small><b>' + esc(p.t) + '</b></span></a>'; }).join(''));

  /* ---------- Contact & footer ---------- */
  var K = C.contact || {}, L = ME.links || {};
  var social = [['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['instagram', 'Instagram']].filter(function (s) { return L[s[0]]; })
    .map(function (s) { return '<a class="pill" href="' + esc(L[s[0]]) + '" target="_blank" rel="noopener">' + s[1] + ' ' + ICON.ext + '</a>'; }).join('');
  $('#contact').innerHTML = '<div class="inner"><div class="eyebrow">' + esc(K.eyebrow) + '</div>' +
    '<h2 class="tbc">' + esc(K.title) + '<span class="dot" style="--i:0">.</span><span class="dot" style="--i:1">.</span><span class="dot" style="--i:2">.</span></h2>' +
    '<div class="who">' + esc(ME.fullName) + '<span>' + esc(ME.role) + '</span></div>' +
    '<div class="ctas"><button class="pill red" type="button" id="copyMail">' + esc(K.ctaLabel || 'Copy email') + '</button>' + social + '</div>' +
    '<div class="mail" id="mailTxt">' + esc(ME.email) + '</div>' + (K.nextLine ? '<div class="next">' + esc(K.nextLine) + '</div>' : '') + '</div>';
  var F = C.footer || {};
  $('#foot').innerHTML = '<span>' + esc(fill(F.left)) + '</span><span>' + esc(fill(F.right)) + '</span>';

  fillPhotos();

  /* ---------- Skill tabs ---------- */
  function showCat(i) {
    var k = cats[i]; if (!k) { $('#tiles').innerHTML = ''; return; }
    $('#tiles').innerHTML = arr(k.items).map(function (s, n) {
      var lv = Math.max(1, Math.min(5, +s.level || 3)), l = '';
      for (var x = 1; x <= 5; x++) l += '<i class="' + (x <= lv ? 'f' : '') + '"></i>';
      return '<div class="tile" style="--i:' + n + '"><span class="ic">' + esc(String(s.name || '?').charAt(0)) + '</span><b>' + esc(s.name) + '</b><div class="lvl" aria-label="Level ' + lv + ' of 5">' + l + '</div><span>' + ['', 'Learning', 'Basics', 'Comfortable', 'Strong', 'Expert'][lv] + '</span></div>';
    }).join('');
  }

  /* ---------- Build sections in the profile's order ---------- */
  var secWrap = $('#sections'), current = PROFILES[0], observer = null;
  function build(p) {
    current = p;
    secWrap.innerHTML = p.order.map(function (id) { return '<section class="band" id="' + id + '">' + html[id] + '</section>'; }).join('');
    fillPhotos(secWrap);
    if ($('#tiles')) showCat(0);
    $$('.tab', secWrap).forEach(function (b) {
      b.addEventListener('click', function () {
        $$('.tab', secWrap).forEach(function (x) { x.classList.remove('on'); x.setAttribute('aria-selected', 'false'); });
        b.classList.add('on'); b.setAttribute('aria-selected', 'true'); showCat(+b.dataset.cat); Sound.tick();
      });
    });
    wireRows(secWrap);
    $('#cwRow').innerHTML = p.order.map(function (id) {
      var s = SEC[id] || {};
      return '<a class="ep" href="#' + id + '" style="--c1:' + esc(s.c1) + ';--c2:' + esc(s.c2) + '" data-w="' + esc(s.w) + '"><span class="pl">' + ICON.play + '</span><span class="t"><small>' + esc(String(s.ep || '').toUpperCase()) + '</small><b>' + esc(s.card) + '</b><span>' + esc(s.cardSub) + '</span></span><span class="pg"><i style="width:' + (+s.progress || 0) + '%"></i></span></a>';
    }).join('');
    $('#links').innerHTML = '<li><a href="#home" class="on">Home</a></li>' + p.order.map(function (id) { return '<li><a href="#' + id + '">' + esc((SEC[id] || {}).nav || id) + '</a></li>'; }).join('') + '<li><a href="#contact">Contact</a></li>';
    var av = $('#meAv'); av.style.background = p.bg; av.innerHTML = p.usePhoto ? '<div class="ph" data-photo="me"></div>' : esc(p.letter || '?'); fillPhotos(av.parentNode);
    $('#ageProf').textContent = p.name || ME.name;
    $('#cwTitle').textContent = p.id === PROFILES[0].id ? (B.continueTitle || 'Continue Exploring') : 'Picked for you, ' + p.name;
    watch();
  }
  function wireRows(r) {
    $$('.row-wrap', r).forEach(function (w) {
      var row = $('.row', w);
      $$('.arrow', w).forEach(function (a) { a.addEventListener('click', function () { row.scrollBy({ left: (a.classList.contains('l') ? -1 : 1) * row.clientWidth * .8, behavior: 'smooth' }); }); });
    });
  }
  wireRows(document);

  /* ---------- Reveal on approach (elements stay visible without JS) ---------- */
  function watch() {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window) || reduce) return;
    var seen = new WeakSet();
    observer = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !seen.has(e.target)) { seen.add(e.target); var t = e.target; t.classList.remove('go'); void t.offsetWidth; t.classList.add('go'); }
      });
    }, { rootMargin: '0px 0px 20% 0px' });
    $$('#sections .h-sec, #sections .rv').forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight) observer.observe(el); });
  }

  /* ---------- Nav state & parallax ---------- */
  var nav = $('#nav'), lastSec = '';
  window.addEventListener('scroll', function () {
    nav.classList.toggle('solid', window.scrollY > 40);
    var y = window.scrollY + window.innerHeight * .35, act = 'home';
    current.order.concat(['contact']).forEach(function (id) { var el = document.getElementById(id); if (el && el.offsetTop <= y) act = id; });
    if (act !== lastSec) { lastSec = act; $$('#links a').forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + act); }); }
    if (window.scrollY < window.innerHeight && !reduce) $('#art').style.transform = 'translateY(' + (window.scrollY * .18).toFixed(1) + 'px)';
  }, { passive: true });
  if (!reduce) $('#bill').addEventListener('pointermove', function (e) {
    var r = this.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    $('#art').style.transform = 'translate(' + (x * -18).toFixed(1) + 'px,' + (y * -10 + window.scrollY * .18).toFixed(1) + 'px)';
    $('#billCopy').style.transform = 'translate(' + (x * 10).toFixed(1) + 'px,' + (y * 6).toFixed(1) + 'px)';
  });

  /* ---------- Copy email ---------- */
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('on'); }, 1800); }
  $('#copyMail').addEventListener('click', function () {
    function sel() { var r = document.createRange(); r.selectNodeContents($('#mailTxt')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Email selected. Press Ctrl+C to copy'); }
    try { navigator.clipboard.writeText(ME.email).then(function () { toast('Email copied'); }, sel); } catch (e) { sel(); }
  });

  /* ---------- Sound toggle ---------- */
  var sb = $('#soundBtn');
  function paintSound() { var on = Sound.isOn(); sb.innerHTML = on ? ICON.sOn : ICON.sOff; sb.setAttribute('aria-label', on ? 'Sound on' : 'Sound off'); }
  sb.addEventListener('click', function () { Sound.set(!Sound.isOn()); paintSound(); });
  paintSound();

  /* ================= Sequence: intro → profiles → home ================= */
  var intro = $('#intro'), who = $('#who'), skip = $('#skip'), timers = [];
  function at(ms, fn) { timers.push(setTimeout(fn, ms)); }
  function clear() { timers.forEach(clearTimeout); timers = []; }
  document.body.classList.add('lock');

  function runIntro() {
    clear(); window.scrollTo(0, 0); document.body.classList.add('lock');
    intro.className = ''; intro.style.display = ''; who.classList.add('gone'); who.classList.remove('show'); skip.hidden = false;
    void intro.offsetWidth;
    if (Sound.isOn()) at(150, function () { Sound.signature(); });
    at(60, function () { intro.classList.add('s1'); });
    at(reduce ? 0 : 1500, function () { intro.classList.add('s2'); });
    at(reduce ? 0 : 3300, function () { intro.classList.add('s3'); });
  }
  function toProfiles() {
    clear(); skip.hidden = true; Sound.whoosh();
    intro.classList.add('s1', 's2', 's3', 'gone');
    if (PROFILES.length < 2) { choose(PROFILES[0].id); at(1200, function () { intro.style.display = 'none'; }); return; }
    who.classList.remove('gone', 'show'); void who.offsetWidth; who.classList.add('show');
    at(1200, function () { intro.style.display = 'none'; });
  }
  function choose(id, btn, instant) {
    var p = PROFILES.filter(function (x) { return x.id === id; })[0] || PROFILES[0];
    if (btn) btn.classList.add('zoom');
    if (!instant) Sound.boom(0, 80, 1.4, .7);
    var go = function () {
      build(p); window.scrollTo(0, 0);
      who.classList.add('gone'); document.body.classList.remove('lock');
      var h = $('#home'); h.classList.remove('home-in'); void h.offsetWidth; h.classList.add('home-in');
      $$('.prof').forEach(function (b) { b.classList.remove('zoom'); });
    };
    if (instant || reduce) go(); else at(450, go);
  }

  $('#iPlay').addEventListener('click', function () { if (!Sound.isOn()) { Sound.set(true); paintSound(); Sound.boom(0, 70, 1.6, .8); } toProfiles(); });
  skip.addEventListener('click', toProfiles);
  $$('.prof').forEach(function (b) { b.addEventListener('click', function () { choose(b.dataset.id, b); }); b.addEventListener('mouseenter', function () { Sound.tick(); }); });
  $('#meBtn').addEventListener('click', function () { document.body.classList.add('lock'); who.classList.remove('gone', 'show'); void who.offsetWidth; who.classList.add('show'); });
  document.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#replay')) runIntro(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !intro.classList.contains('gone')) toProfiles(); });
  document.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('a.ep, #links a, .pick'); if (a) Sound.whoosh(); });

  build(PROFILES[0]);

  /* Preview / deep-link controls:  ?skip=1  ?profile=rec  ?at=originals  */
  var skipIntro = params.get('skip') === '1';
  if (!skipIntro && (params.get('who') === '1' || I.enabled === false)) {
    intro.style.display = 'none'; skip.hidden = true; toProfiles();
  } else if (skipIntro) {
    intro.style.display = 'none'; intro.classList.add('gone'); skip.hidden = true;
    choose(params.get('profile') || PROFILES[0].id, null, true);
    var target = params.get('at');
    if (target) setTimeout(function () { var el = document.getElementById(target); if (el) { document.documentElement.style.scrollBehavior = 'auto'; el.scrollIntoView(); document.documentElement.style.scrollBehavior = ''; } }, 80);
  } else {
    runIntro();
  }
}
