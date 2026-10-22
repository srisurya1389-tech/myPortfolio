/* =====================================================================
   Cursor symbol trail. Desktop only (fine pointer, no reduced motion).
   Options come from content.json → site.cursor. Call CursorTrail.init(opts).
   Each symbol uses, in order: its image (src), else its built-in line glyph,
   else its text label. Images are recoloured on a canvas (source-in).
   ===================================================================== */
var CursorTrail = (function () {
  var TAU = Math.PI * 2;
  var FLOAT = .006, MAX_STEPS = 40;  // ponytail: caps spawns per mouse event so a big jump can't stall a frame
  var MAX_INHERIT_SPEED = 25;        // px per frame; caps the mouse speed particles inherit, so jerks don't fling them

  // 24×24 line glyphs (SVG path data). Drawn stroked, in the symbol colour.
  var GLYPH_D = {
    camera: 'M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 9.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 1 0 0-7z',
    chat: 'M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-9l-4.5 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM8 11h.01M12 11h.01M16 11h.01',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1V17h5v-1c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
    briefcase: 'M3 7h18v12H3zM9 7V5h6v2M3 12h18',
    code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M14 5l-4 14',
    search: 'M4 10.5a6.5 6.5 0 1 0 13 0 6.5 6.5 0 1 0-13 0zM15.2 15.2L21 21',
    notebook: 'M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3v18M10 8h6M10 12h6M3 7h2M3 12h2M3 17h2',
    sparkles: 'M9.5 6.5Q9.5 13.5 16.5 13.5Q9.5 13.5 9.5 20.5Q9.5 13.5 2.5 13.5Q9.5 13.5 9.5 6.5ZM18 2Q18 5 21 5Q18 5 18 8Q18 5 15 5Q18 5 18 2Z',
    question: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 1 0 0-19zM9.2 9.2a2.8 2.8 0 1 1 3.8 2.6c-.7.3-1 .9-1 1.6V14M12 17.2v.01',
    rocket: 'M12 2.5c3 2.5 4 6 3.5 10L12 15l-3.5-2.5C8 8.5 9 5 12 2.5zM12 8.5a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 1 0 0-2.6zM8.5 12.5L6 15v2.5l2.5-1.5M15.5 12.5L18 15v2.5l-2.5-1.5M10.5 17.5L12 21.5l1.5-4',
    heart: 'M12 20s-7.5-4.6-7.5-10A4.2 4.2 0 0 1 12 7.6 4.2 4.2 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z',
    smile: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 1 0 0-19zM8.5 14a4 4 0 0 0 7 0M9 9.5v.01M15 9.5v.01',
    music: 'M9 18V5l11-2v13M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
    play: 'M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 1 0 0-19zM10 8.5l6 3.5-6 3.5z'
  };
  var DEFAULT_ICONS = Object.keys(GLYPH_D).map(function (g) { return { name: g, glyph: g, label: g, src: '', show: true }; });

  var cfg, canvas, ctx, dpr = 0, W = 0, H = 0;
  var items = [], images = [], sprites = {};   // sprites["index|scheme"] → offscreen canvas
  var seq = 0;                                 // symbol order: cycles through items, flips scheme each full cycle
  var parts = [];
  var running = false, raf = 0, lastT = 0;
  var last = null, carry = 0, pace = 0;        // pace = smoothed mouse speed, px per ms
  var smx = 0, smy = 0;                        // smoothed mouse velocity, px per frame

  function rnd(a, b) { return a + Math.random() * (b - a); }

  function normIcons(v) {
    var list = Array.isArray(v) && v.length ? v : DEFAULT_ICONS;
    return list.map(function (x) {
      if (typeof x === 'string') x = { name: x, glyph: x };
      return { name: String(x.name || x.glyph || ''), glyph: x.glyph || '', label: x.label || '', src: x.src || '', show: x.show !== false };
    }).filter(function (x) { return x.show; });
  }

  /* Load every symbol image once. A missing or broken file just means "use the glyph". */
  function loadImages() {
    return Promise.all(items.map(function (it, i) {
      if (!it.src) return null;
      return new Promise(function (ok) {
        var img = new Image();
        img.onload = function () { images[i] = img; ok(); };
        img.onerror = function () { ok(); };
        img.src = it.src;
      });
    }));
  }

  /* Draw one symbol centred on (0,0), fitting a box × box square, in one colour. */
  function symbol(c, it, img, color, box) {
    if (img) {
      var t = document.createElement('canvas'), tc;
      t.width = t.height = Math.ceil(box); tc = t.getContext('2d');
      tc.drawImage(img, 0, 0, box, box);            // explicit size, so viewBox-only SVGs work
      tc.globalCompositeOperation = 'source-in';    // keep the shape, replace its colour
      tc.fillStyle = color; tc.fillRect(0, 0, box, box);
      c.drawImage(t, -box / 2, -box / 2, box, box);
      return;
    }
    var d = GLYPH_D[it.glyph];
    if (d) {
      c.save(); c.scale(box / 24, box / 24); c.translate(-12, -12);
      c.strokeStyle = color; c.lineWidth = 2; c.lineCap = 'round'; c.lineJoin = 'round';
      c.stroke(new Path2D(d)); c.restore();
      return;
    }
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '700 ' + Math.round(box * .5) + 'px DM Sans, system-ui, sans-serif';
    c.fillText(it.label || it.name.slice(0, 2).toUpperCase(), 0, 1);
  }

  /* Scheme 0: colour A circle + colour B symbol. Scheme 1: colour B circle + colour A symbol with a thin ring. */
  function badge(i, scheme) {
    var it = items[i], S = Math.round(cfg.size * dpr), r = S / 2, inner = r - dpr * 1.5;
    var cv = document.createElement('canvas'), c = cv.getContext('2d');
    var circle = scheme ? cfg.colorB : cfg.colorA, sym = scheme ? cfg.colorA : cfg.colorB;
    cv.width = cv.height = S;
    c.translate(r, r);
    c.beginPath(); c.arc(0, 0, inner, 0, TAU); c.fillStyle = circle; c.fill();
    if (scheme) { c.beginPath(); c.arc(0, 0, inner, 0, TAU); c.lineWidth = dpr; c.strokeStyle = cfg.colorA; c.stroke(); }
    var hl = c.createRadialGradient(-r * .35, -r * .4, 0, -r * .35, -r * .4, r * .9);
    hl.addColorStop(0, 'rgba(255,255,255,.45)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.beginPath(); c.arc(0, 0, inner, 0, TAU); c.fillStyle = hl; c.fill();
    symbol(c, it, images[i], sym, S * .6);        // symbol fills about 60% of the circle
    return cv;
  }
  function preload() {
    sprites = {};
    items.forEach(function (it, i) { sprites[i + '|0'] = badge(i, 0); sprites[i + '|1'] = badge(i, 1); });
  }

  function spawn(x, y, vx, vy, life) {
    var n = seq++, idx = n % items.length, scheme = Math.floor(n / items.length) % 2;
    parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, age: 0, key: idx + '|' + scheme });
    if (parts.length > cfg.maxParticles) parts.splice(0, parts.length - cfg.maxParticles);
    kick();
  }

  /* Interpolate spawn points along each mouse segment, carrying leftover distance between events. */
  function trail(x, y, t) {
    if (!last) { last = { x: x, y: y, t: t }; return; }
    var px = last.x, py = last.y, dt = Math.max(1, t - last.t), dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
    last = { x: x, y: y, t: t };
    if (d === 0) return;
    pace = pace * .7 + (d / dt) * .3;
    // Smooth the mouse velocity (new reading weighs 0.2), then cap its speed for inheritance.
    smx = smx * .8 + dx / dt * (1000 / 60) * .2;
    smy = smy * .8 + dy / dt * (1000 / 60) * .2;
    var sp = Math.hypot(smx, smy);
    if (sp > MAX_INHERIT_SPEED) { smx *= MAX_INHERIT_SPEED / sp; smy *= MAX_INHERIT_SPEED / sp; }
    var pos = 0, steps = 0;
    while (pos < d && steps < MAX_STEPS) {
      var gap = Math.max(16, cfg.spacing / (1 + pace * .5));
      var need = Math.max(0, gap - carry);
      if (pos + need > d) { carry += d - pos; return; }
      pos += need; carry = 0; steps++;
      var f = pos / d, k = rnd(.04, .11) * cfg.inherit;
      spawn(px + dx * f, py + dy * f, smx * k, smy * k, rnd(1200, 1900));   // exactly on the mouse path, no sideways spread
    }
    carry = 0;
  }

  function burst(x, y) {
    var n = 5 + ((Math.random() * 4) | 0);
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU + rnd(-.2, .2), sp = rnd(2.2, 3.4);
      spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(600, 800));
    }
  }

  function draw(p) {
    var t = p.age / p.life, s, a;
    if (t < .15) { var u = t / .15; s = .6 + .4 * (1 - Math.pow(1 - u, 3)); }   // ease-out from 0.6 to 1
    else s = 1 - .45 * (t - .15) / .85;                                          // then a slow shrink
    a = t < .6 ? 1 : 1 - (t - .6) / .4;                                          // fade out at the end
    var sz = cfg.size * Math.max(0, s);                                          // no size jitter: every badge is the same size
    ctx.save();
    ctx.translate(p.x, p.y);                                                     // upright: no rotate, no wobble
    ctx.globalAlpha = Math.max(0, a);
    ctx.drawImage(sprites[p.key], -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }

  function frame(t) {
    var dt = Math.min(.05, (t - lastT) / 1000), f = dt * 60; lastT = t;   // f = frames elapsed, so motion is frame-rate independent
    var decay = Math.pow(cfg.damp, f), alive = [];
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.age += dt * 1000;
      if (p.age >= p.life) continue;
      p.vx *= decay; p.vy = p.vy * decay - FLOAT * f;   // slight upward float
      p.x += p.vx * f; p.y += p.vy * f;
      draw(p); alive.push(p);
    }
    parts = alive;
    if (parts.length) raf = requestAnimationFrame(frame); else stop();
  }
  function kick() { if (!running) { running = true; lastT = performance.now(); raf = requestAnimationFrame(frame); } }
  function stop() { running = false; cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); }

  function resize() {
    var d = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (d !== dpr) { dpr = d; preload(); }
  }

  function num(v, def, min, max) { var n = v == null || v === '' ? def : +v; if (!isFinite(n)) n = def; return Math.min(max, Math.max(min, n)); }

  function init(opts) {
    var o = opts || {};
    if (o.enabled === false || !document.body || !window.matchMedia) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;               // touch / coarse pointers: off
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    var k = (num(o.speed, 1, 1, 10) - 1) / 9;                              // 0 = calm, 1 = lively
    cfg = {
      clickBurst: o.clickBurst !== false,
      size: num(o.size, 42, 24, 72),
      spacing: num(o.spacing, 38, 16, 80),
      maxParticles: num(o.maxParticles, 80, 10, 200),
      inherit: 1 + 1.5 * k,                                                 // how much mouse velocity particles pick up
      damp: .9 + .07 * k,                                                   // per-frame velocity damping
      colorA: o.colorA || '#e8233a', colorB: o.colorB || '#0b0a0e'
    };
    items = normIcons(o.icons);
    if (!items.length) return;

    loadImages().then(function () {
      canvas = document.createElement('canvas');
      canvas.className = 'cursor-trail';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:85';
      document.body.appendChild(canvas);
      ctx = canvas.getContext('2d');
      resize();                                                             // also pre-renders every symbol × scheme
      window.addEventListener('resize', resize);

      document.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse') trail(e.clientX, e.clientY, performance.now());
      }, { passive: true });
      document.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && cfg.clickBurst) burst(e.clientX, e.clientY);
      }, { passive: true });
      document.documentElement.addEventListener('mouseleave', function () { last = null; carry = 0; smx = smy = 0; });
    });
  }

  return { init: init };
})();
