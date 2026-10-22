/* =====================================================================
   Cursor particle trail. Desktop only (fine pointer, no reduced motion).
   Options come from content.json → site.cursor. Call CursorTrail.init(opts).
   Icons are pre-rendered once (preload) and drawn with drawImage each frame.
   ===================================================================== */
var CursorTrail = (function () {
  var TAU = Math.PI * 2;
  var ICON_NAMES = ['code', 'star', 'heart', 'bolt', 'sparkle', 'play', 'music', 'smile', 'cube', 'rocket', 'terminal', 'chat'];
  var DEFAULT_COLORS = ['#e8233a', '#d9ad55', '#7b3fe4', '#2c94c9', '#22a565', '#ff5468'];
  var MAX_STEPS = 40; // ponytail: caps spawns per mouse event so a big jump can't stall a frame

  var cfg, canvas, ctx, dpr = 0, W = 0, H = 0;
  var sprites = {};          // "icon|colorIndex" → offscreen canvas
  var parts = [];
  var running = false, raf = 0, lastT = 0;
  var last = null, carry = 0, speed = 0; // speed in px per ms, smoothed

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function easeOutBack(t) { var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  /* Glyphs: drawn centred on (0,0) with glyph radius g. Caller sets white fill/stroke. */
  var GLYPHS = {
    code: function (c, g) {
      c.beginPath(); c.moveTo(-g * .35, -g * .5); c.lineTo(-g * .8, 0); c.lineTo(-g * .35, g * .5);
      c.moveTo(g * .35, -g * .5); c.lineTo(g * .8, 0); c.lineTo(g * .35, g * .5);
      c.moveTo(g * .12, -g * .6); c.lineTo(-g * .12, g * .6); c.stroke();
    },
    star: function (c, g) {
      c.beginPath();
      for (var i = 0; i < 10; i++) {
        var r = i % 2 ? g * .42 : g * .9, a = -Math.PI / 2 + i * Math.PI / 5;
        c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
    },
    heart: function (c, g) {
      c.beginPath(); c.moveTo(0, g * .75);
      c.bezierCurveTo(-g * 1.05, g * .1, -g * .6, -g * .85, 0, -g * .3);
      c.bezierCurveTo(g * .6, -g * .85, g * 1.05, g * .1, 0, g * .75); c.fill();
    },
    bolt: function (c, g) {
      c.beginPath(); c.moveTo(g * .25, -g * .9); c.lineTo(-g * .55, g * .1); c.lineTo(-g * .05, g * .1);
      c.lineTo(-g * .25, g * .9); c.lineTo(g * .55, -g * .1); c.lineTo(g * .05, -g * .1); c.closePath(); c.fill();
    },
    sparkle: function (c, g) {
      c.beginPath(); c.moveTo(0, -g);
      c.quadraticCurveTo(g * .15, -g * .15, g, 0); c.quadraticCurveTo(g * .15, g * .15, 0, g);
      c.quadraticCurveTo(-g * .15, g * .15, -g, 0); c.quadraticCurveTo(-g * .15, -g * .15, 0, -g); c.fill();
    },
    play: function (c, g) {
      c.beginPath(); c.moveTo(-g * .5, -g * .7); c.lineTo(g * .7, 0); c.lineTo(-g * .5, g * .7); c.closePath(); c.fill();
    },
    music: function (c, g) {
      c.beginPath(); c.arc(-g * .3, g * .45, g * .28, 0, TAU); c.fill();
      c.beginPath(); c.moveTo(-g * .02, g * .45); c.lineTo(-g * .02, -g * .6); c.lineTo(g * .5, -g * .4); c.stroke();
    },
    smile: function (c, g) {
      c.beginPath(); c.arc(0, 0, g * .75, 0, TAU); c.stroke();
      c.beginPath(); c.arc(-g * .28, -g * .22, g * .08, 0, TAU); c.arc(g * .28, -g * .22, g * .08, 0, TAU); c.fill();
      c.beginPath(); c.arc(0, g * .05, g * .4, .2, Math.PI - .2); c.stroke();
    },
    cube: function (c, g) {
      c.beginPath();
      for (var i = 0; i < 6; i++) { var a = -Math.PI / 2 + i * Math.PI / 3; c[i ? 'lineTo' : 'moveTo'](Math.cos(a) * g * .8, Math.sin(a) * g * .8); }
      c.closePath();
      c.moveTo(0, 0); c.lineTo(0, -g * .8); c.moveTo(0, 0); c.lineTo(-g * .69, g * .4); c.moveTo(0, 0); c.lineTo(g * .69, g * .4);
      c.stroke();
    },
    rocket: function (c, g) {
      c.beginPath(); c.moveTo(0, -g * .9); c.quadraticCurveTo(g * .45, -g * .4, g * .35, g * .45);
      c.lineTo(-g * .35, g * .45); c.quadraticCurveTo(-g * .45, -g * .4, 0, -g * .9); c.fill();
      c.beginPath(); c.moveTo(-g * .35, g * .1); c.lineTo(-g * .65, g * .55); c.lineTo(-g * .3, g * .5);
      c.moveTo(g * .35, g * .1); c.lineTo(g * .65, g * .55); c.lineTo(g * .3, g * .5); c.fill();
      c.beginPath(); c.moveTo(-g * .2, g * .6); c.lineTo(0, g * .95); c.lineTo(g * .2, g * .6); c.stroke();
    },
    terminal: function (c, g) {
      c.strokeRect(-g * .75, -g * .6, g * 1.5, g * 1.2);
      c.beginPath(); c.moveTo(-g * .4, -g * .2); c.lineTo(-g * .15, 0); c.lineTo(-g * .4, g * .2);
      c.moveTo(0, g * .25); c.lineTo(g * .35, g * .25); c.stroke();
    },
    chat: function (c, g) {
      c.beginPath(); c.moveTo(-g * .75, -g * .5); c.lineTo(g * .75, -g * .5); c.lineTo(g * .75, g * .35);
      c.lineTo(-g * .1, g * .35); c.lineTo(-g * .45, g * .7); c.lineTo(-g * .4, g * .35); c.lineTo(-g * .75, g * .35);
      c.closePath(); c.fill();
    }
  };

  function makeSprite(icon, color) {
    var S = Math.round(cfg.size * dpr), r = S / 2, cv = document.createElement('canvas'), c = cv.getContext('2d');
    cv.width = cv.height = S;
    c.translate(r, r);
    c.beginPath(); c.arc(0, 0, r - dpr, 0, TAU); c.fillStyle = color; c.fill();
    var hl = c.createRadialGradient(-r * .35, -r * .4, 0, -r * .35, -r * .4, r * .9);
    hl.addColorStop(0, 'rgba(255,255,255,.45)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    c.beginPath(); c.arc(0, 0, r - dpr, 0, TAU); c.fillStyle = hl; c.fill();
    var g = r * .5;
    c.fillStyle = '#fff'; c.strokeStyle = '#fff'; c.lineWidth = g * .2; c.lineCap = 'round'; c.lineJoin = 'round';
    GLYPHS[icon](c, g);
    return cv;
  }
  function preload() {
    sprites = {};
    cfg.icons.forEach(function (ic) {
      cfg.colors.forEach(function (col, ci) { sprites[ic + '|' + ci] = makeSprite(ic, col); });
    });
  }

  function spawn(x, y, vx, vy, life) {
    var ic = pick(cfg.icons), ci = (Math.random() * cfg.colors.length) | 0;
    parts.push({
      x: x, y: y, vx: vx, vy: vy, life: life, age: 0,
      rot: rnd(0, TAU), spin: rnd(-3, 3), size: rnd(.85, 1.2),
      ph: rnd(0, TAU), wob: rnd(3, 7), amp: rnd(4, 10), key: ic + '|' + ci
    });
    if (parts.length > cfg.maxParticles) parts.splice(0, parts.length - cfg.maxParticles);
    kick();
  }

  /* Interpolate spawn points along each mouse segment, carrying leftover distance between events. */
  function trail(x, y, t) {
    if (!last) { last = { x: x, y: y, t: t }; return; }
    var px = last.x, py = last.y, dt = Math.max(1, t - last.t), dx = x - px, dy = y - py, d = Math.hypot(dx, dy);
    last = { x: x, y: y, t: t };
    if (d === 0) return;
    speed = speed * .7 + (d / dt) * .3;
    var mvx = dx / dt * 1000, mvy = dy / dt * 1000;   // mouse velocity, px/s
    var nx = -dy / d, ny = dx / d;                    // unit perpendicular, for the sideways push
    var pos = 0, steps = 0;
    while (pos < d && steps < MAX_STEPS) {
      var gap = Math.max(cfg.spacing * .22, cfg.spacing / (1 + speed * .9));
      var need = Math.max(0, gap - carry);
      if (pos + need > d) { carry += d - pos; return; }
      pos += need; carry = 0; steps++;
      var f = pos / d, side = rnd(-60, 60), k = rnd(.12, .32);
      spawn(px + dx * f, py + dy * f, mvx * k + nx * side, mvy * k + ny * side, rnd(750, 1350));
    }
    carry = 0;
  }

  function burst(x, y) {
    var n = 5 + ((Math.random() * 4) | 0);
    for (var i = 0; i < n; i++) {
      var a = i / n * TAU + rnd(-.2, .2), sp = rnd(180, 320);
      spawn(x, y, Math.cos(a) * sp, Math.sin(a) * sp, rnd(500, 800));
    }
  }

  function draw(p) {
    var t = p.age / p.life, s, a;
    s = t < .18 ? easeOutBack(t / .18) : 1 - .45 * (t - .18) / .82;   // pop with overshoot, then shrink
    a = t < .6 ? 1 : 1 - (t - .6) / .4;                                  // fade out at the end
    var sz = cfg.size * p.size * Math.max(0, s), wx = Math.sin(p.age * .0075 * p.wob + p.ph) * p.amp;
    ctx.save();
    ctx.translate(p.x + wx, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = Math.max(0, a);
    ctx.drawImage(sprites[p.key], -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
  }

  function frame(t) {
    var dt = Math.min(.05, (t - lastT) / 1000); lastT = t;
    var damp = Math.exp(-3.2 * dt), alive = [];
    ctx.clearRect(0, 0, W, H);
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.age += dt * 1000;
      if (p.age >= p.life) continue;
      p.vx *= damp; p.vy = p.vy * damp - 40 * dt;   // slight upward float
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.spin * dt;
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
  function list(v, def, ok) { var a = (Array.isArray(v) ? v : []).filter(ok); return a.length ? a : def; }

  function init(opts) {
    var o = opts || {};
    if (o.enabled === false || !document.body || !window.matchMedia) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;               // touch / coarse pointers: off
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    cfg = {
      clickBurst: o.clickBurst !== false,
      spacing: num(o.spacing, 26, 6, 80),
      size: num(o.size, 34, 16, 80),
      maxParticles: num(o.maxParticles, 140, 10, 400),
      colors: list(o.colors, DEFAULT_COLORS, function (c) { return typeof c === 'string' && c.trim() !== ''; }),
      icons: list(o.icons, ICON_NAMES, function (n) { return GLYPHS.hasOwnProperty(n); })
    };

    canvas = document.createElement('canvas');
    canvas.className = 'cursor-trail';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:85';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') trail(e.clientX, e.clientY, performance.now());
    }, { passive: true });
    document.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && cfg.clickBurst) burst(e.clientX, e.clientY);
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { last = null; carry = 0; });
  }

  return { init: init };
})();
