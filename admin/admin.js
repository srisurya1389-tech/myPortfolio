/* =====================================================================
   Portfolio Admin
   - Edits a draft copy of /content.json (kept in this browser's localStorage)
   - Shows a live preview of the draft
   - "Publish" commits content.json (and any new images) to your GitHub repo
     using the GitHub API. Vercel / Netlify / GitHub Pages then redeploys.
   ===================================================================== */
(function () {
  'use strict';
  var DRAFT_KEY = 'portfolio_draft', PUB_KEY = 'portfolio_published', GH_KEY = 'portfolio_github';
  var SECTION_IDS = ['story', 'moments', 'skills', 'originals', 'about', 'journey', 'picks'];
  var SECTION_NAMES = { story: 'Résumé (The Full Story)', moments: 'Achievements', skills: 'Skills', originals: 'Projects (Originals)', about: 'About me', journey: 'Journey', picks: 'Top picks' };
  var ICONS = ['orbit', 'people', 'leaf', 'code', 'shield', 'chart', 'cart', 'phone', 'brain', 'cube', 'game', 'heart'];
  var GLYPH_NAMES = ['camera', 'chat', 'bulb', 'bolt', 'briefcase', 'code', 'search', 'notebook', 'sparkles', 'question', 'rocket', 'heart', 'star', 'smile', 'music', 'play'];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    for (var k in (attrs || {})) {
      var v = attrs[k]; if (v == null || v === false) continue;
      if (k === 'class') el.className = v; else if (k === 'html') el.innerHTML = v; else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function get(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
  function set(o, path, val) {
    var ks = path.split('.'), last = ks.pop(), cur = o;
    ks.forEach(function (k, i) { if (cur[k] == null || typeof cur[k] !== 'object') cur[k] = /^\d+$/.test(ks[i + 1] || last) ? [] : {}; cur = cur[k]; });
    cur[last] = val;
  }
  function store(k, v) { try { if (v === undefined) localStorage.removeItem(k); else localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } }
  function load(k) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }

  /* ------------------------------------------------------------------
     SCHEMA: every editable point on the site.
     Field: { p: path, l: label, t: type, h: help, ... }
     Types: text, textarea, url, color, image, toggle, range, select, tags, order, list, group
     ------------------------------------------------------------------ */
  var itemTWYD = [
    { p: 't', l: 'Title', t: 'text' }, { p: 'w', l: 'Where / subtitle', t: 'text' },
    { p: 'y', l: 'Dates', t: 'text', h: 'e.g. 2023 – 2027' }, { p: 'd', l: 'Description', t: 'textarea', wide: true }
  ];
  var colorPair = [{ p: 'c1', l: 'Colour 1 (dark)', t: 'color' }, { p: 'c2', l: 'Colour 2 (bright)', t: 'color' }];

  var PAGES = [
    { grp: 'Start' },
    { id: 'basics', icon: '👤', label: 'Profile & contact', at: '', lead: 'Your name, photo, role and links. These appear across the whole site.', fields: [
      { t: 'group', l: 'Who you are', fields: [
        { p: 'me.name', l: 'Display name', t: 'text', h: 'The big name in the intro and billboard. Short works best.' },
        { p: 'me.fullName', l: 'Full name', t: 'text', h: 'Used on the résumé, About and footer.' },
        { p: 'me.initials', l: 'Initials / logo', t: 'text', h: 'Top-left logo, e.g. YN' },
        { p: 'me.role', l: 'Role line', t: 'text' },
        { p: 'me.bio', l: 'Short bio', t: 'textarea', wide: true, h: 'Shown under your name on the billboard. 1–3 sentences.' },
        { p: 'me.photo', l: 'Your photo', t: 'image', wide: true, max: 1400, h: 'Used in the intro, billboard and your profile. A photo with a plain or transparent background (PNG) looks best.' }
      ]},
      { t: 'group', l: 'Contact & links', fields: [
        { p: 'me.email', l: 'Email', t: 'text' },
        { p: 'me.links.resume', l: 'Résumé link', t: 'url', h: 'Google Drive/PDF link, or #story to jump to the résumé section.' },
        { p: 'me.links.github', l: 'GitHub URL', t: 'url' },
        { p: 'me.links.linkedin', l: 'LinkedIn URL', t: 'url' },
        { p: 'me.links.instagram', l: 'Instagram URL', t: 'url', h: 'Leave empty to hide.' }
      ]}
    ]},
    { id: 'billboard', icon: '🎬', label: 'Billboard (home top)', at: '', lead: 'The big hero area after someone picks a profile.', fields: [
      { t: 'group', l: 'Info line', fields: [
        { p: 'me.meta.match', l: 'Match text (green)', t: 'text' }, { p: 'me.meta.badge', l: 'Badge', t: 'text' },
        { p: 'me.meta.years', l: 'Years', t: 'text' }, { p: 'me.meta.degree', l: 'Degree', t: 'text' },
        { p: 'me.meta.originals', l: 'Projects count text', t: 'text' }, { p: 'me.meta.certs', l: 'Certificates count text', t: 'text' }
      ]},
      { t: 'group', l: 'Buttons & row', fields: [
        { p: 'billboard.playIntroLabel', l: 'Play intro button', t: 'text' }, { p: 'billboard.resumeLabel', l: 'Résumé button', t: 'text' },
        { p: 'billboard.continueTitle', l: 'Row title under billboard', t: 'text' }
      ]}
    ]},
    { id: 'intro', icon: '✨', label: 'Intro', preview: '?preview=1', lead: 'The cinematic opening: your name glows in, then the photo rises with a Play button.', fields: [
      { t: 'group', l: 'Intro', fields: [
        { p: 'intro.enabled', l: 'Play the intro when someone visits', t: 'toggle', wide: true },
        { p: 'intro.seriesText', l: 'Text under the name', t: 'text', h: 'e.g. THE SERIES' },
        { p: 'intro.playLabel', l: 'Play button', t: 'text' },
        { p: 'intro.skipLabel', l: 'Skip button', t: 'text' }
      ]}
    ]},
    { id: 'profiles', icon: '🧑‍🤝‍🧑', label: "Who's watching", preview: '?preview=1&who=1', lead: 'Each profile shows the same sections in a different order.', fields: [
      { t: 'group', l: 'Screen text', fields: [
        { p: 'who.title', l: 'Title', t: 'text' },
        { p: 'who.note', l: 'Note under the profiles', t: 'textarea', h: 'Use {name} to insert your display name.' }
      ]},
      { p: 'profiles', l: 'Profiles', t: 'list', title: function (x) { return x.name || 'You (uses your name)'; }, swatch: 'c2',
        add: { id: '', name: 'New profile', letter: 'N', tag: '', desc: '', c1: '#333333', c2: '#777777', usePhoto: false, order: SECTION_IDS.slice() },
        fields: [
          { p: 'name', l: 'Name', t: 'text', h: 'Leave empty to use your display name.' },
          { p: 'id', l: 'ID', t: 'text', h: 'Short unique code, e.g. rec. Used in links: ?profile=rec' },
          { p: 'letter', l: 'Avatar letter / symbol', t: 'text' },
          { p: 'tag', l: 'Badge', t: 'text', h: 'Small red label, e.g. MAIN' },
          { p: 'desc', l: 'Description', t: 'text', wide: true },
          { p: 'usePhoto', l: 'Use my photo as the avatar', t: 'toggle', wide: true },
          { p: 'c1', l: 'Colour 1', t: 'color' }, { p: 'c2', l: 'Colour 2', t: 'color' },
          { p: 'order', l: 'Section order for this profile', t: 'order', wide: true }
        ] }
    ]},
    { grp: 'Sections' },
    { id: 'story', icon: '📄', label: 'Résumé', at: 'story', sec: 'story', lead: 'The Full Story: your résumé on one page.', fields: [
      { p: 'story.education', l: 'Education', t: 'list', title: 't', add: { t: 'New entry', w: '', y: '', d: '' }, fields: itemTWYD },
      { p: 'story.experience', l: 'Experience', t: 'list', title: 't', add: { t: 'New role', w: '', y: '', d: '' }, fields: itemTWYD },
      { p: 'story.highlights', l: 'Highlights', t: 'list', title: 't', add: { t: 'New highlight', w: '', y: '', d: '' }, fields: itemTWYD },
      { p: 'story.skills', l: 'Skills summary', t: 'list', title: 't', add: { t: 'Category', w: '', y: '', d: '' }, fields: itemTWYD },
      { t: 'group', l: 'Side card', fields: [
        { p: 'story.sideTitle', l: 'Title', t: 'text' }, { p: 'story.buttonLabel', l: 'Button', t: 'text' },
        { p: 'story.sideText', l: 'Text', t: 'textarea', wide: true }
      ]},
      { p: 'story.kpis', l: 'Big numbers', t: 'list', title: function (x) { return (x.value || '') + ' ' + (x.label || ''); }, add: { value: '0', label: 'Label' },
        fields: [{ p: 'value', l: 'Number', t: 'text' }, { p: 'label', l: 'Label', t: 'text' }] }
    ]},
    { id: 'moments', icon: '🏆', label: 'Achievements', at: 'moments', sec: 'moments', lead: 'Gold award cards and your certificates.', fields: [
      { p: 'moments', l: 'Awards', t: 'list', title: 't', add: { t: 'New award', by: '', y: '', d: '' }, fields: [
        { p: 't', l: 'Award', t: 'text' }, { p: 'by', l: 'Given by', t: 'text' }, { p: 'y', l: 'Year', t: 'text' }, { p: 'd', l: 'One line', t: 'text' }
      ]},
      { p: 'certs', l: 'Certificates', t: 'list', title: 't', add: { org: '', t: 'New certificate', y: '', url: '' }, fields: [
        { p: 't', l: 'Certificate', t: 'text' }, { p: 'org', l: 'Issuer', t: 'text' }, { p: 'y', l: 'Year', t: 'text' }, { p: 'url', l: 'Verify link', t: 'url' }
      ]}
    ]},
    { id: 'skills', icon: '🧠', label: 'Skills', at: 'skills', sec: 'skills', lead: 'Each category becomes a tab. Level 1–5 fills the bars.', fields: [
      { p: 'skills', l: 'Categories', t: 'list', title: 'name', add: { name: 'New category', sub: '', items: [] }, fields: [
        { p: 'name', l: 'Category', t: 'text' }, { p: 'sub', l: 'Subtitle', t: 'text' },
        { p: 'items', l: 'Skills', t: 'list', wide: true, title: function (x) { return (x.name || '') + '  ·  ' + (x.level || 0) + '/5'; }, add: { name: 'New skill', level: 3 }, fields: [
          { p: 'name', l: 'Skill', t: 'text' }, { p: 'level', l: 'Level', t: 'range', min: 1, max: 5 }
        ]}
      ]}
    ]},
    { id: 'originals', icon: '🎞️', label: 'Projects', at: 'originals', sec: 'originals', lead: 'Your projects, shown as big movie-style posters.', fields: [
      { p: 'originals', l: 'Projects', t: 'list', title: 't', swatch: 'c2', add: { t: 'New project', g: '', d: '', stack: [], c1: '#1a1a2e', c2: '#e8233a', icon: 'code', image: '', demo: '', code: '', demoLabel: 'Watch demo', codeLabel: 'Source code' }, fields: [
        { p: 't', l: 'Project name', t: 'text' }, { p: 'g', l: 'Genre line', t: 'text', h: 'e.g. React · Hackathon build' },
        { p: 'd', l: 'Description', t: 'textarea', wide: true },
        { p: 'stack', l: 'Tech stack', t: 'tags', wide: true },
        { p: 'image', l: 'Screenshot (optional)', t: 'image', wide: true, max: 1600, shape: 'wide', h: 'Replaces the icon art with your screenshot.' },
        { p: 'icon', l: 'Icon (when no screenshot)', t: 'select', options: ICONS },
        { p: 'c1', l: 'Colour 1', t: 'color' }, { p: 'c2', l: 'Colour 2', t: 'color' },
        { p: 'demo', l: 'Demo link', t: 'url', h: 'Leave empty to hide the button.' }, { p: 'demoLabel', l: 'Demo button text', t: 'text' },
        { p: 'code', l: 'Source code link', t: 'url' }, { p: 'codeLabel', l: 'Code button text', t: 'text' }
      ]}
    ]},
    { id: 'about', icon: '💬', label: 'About me', at: 'about', sec: 'about', lead: 'A quote and a few quick facts.', fields: [
      { t: 'group', l: 'About', fields: [
        { p: 'about.quote', l: 'Quote', t: 'textarea', wide: true, h: 'Wrap a word in *stars* to make it red.' },
        { p: 'about.photo', l: 'Different photo for this section (optional)', t: 'image', wide: true, max: 1200 }
      ]},
      { p: 'about.facts', l: 'Quick facts', t: 'list', title: function (x) { return (x.label || '') + ': ' + (x.value || ''); }, add: { label: 'Label', value: '' }, fields: [
        { p: 'label', l: 'Label', t: 'text' }, { p: 'value', l: 'Value', t: 'text' }
      ]}
    ]},
    { id: 'journey', icon: '🛤️', label: 'Journey', at: 'journey', sec: 'journey', lead: 'Your story as episodes.', fields: [
      { p: 'journey', l: 'Episodes', t: 'list', title: function (x) { return (x.ep || '') + ' · ' + (x.t || ''); }, swatch: 'c2', add: { ep: 'E0', y: '', t: 'New episode', d: '', c1: '#222222', c2: '#555555', p: 100 }, fields: [
        { p: 'ep', l: 'Episode code', t: 'text', h: 'e.g. E01' }, { p: 'y', l: 'Year', t: 'text' },
        { p: 't', l: 'Title', t: 'text' }, { p: 'p', l: 'Progress bar %', t: 'range', min: 0, max: 100 },
        { p: 'd', l: 'Description', t: 'textarea', wide: true }
      ].concat(colorPair) }
    ]},
    { id: 'picks', icon: '🔟', label: 'Top picks', at: 'picks', sec: 'picks', lead: 'Ranked cards with big numbers.', fields: [
      { p: 'picks', l: 'Picks (in rank order)', t: 'list', title: 't', swatch: 'c2', add: { t: 'New pick', s: 'Original', link: 'originals', c1: '#222222', c2: '#e8233a', badge: false }, fields: [
        { p: 't', l: 'Title', t: 'text' }, { p: 's', l: 'Type label', t: 'text', h: 'e.g. Original, Achievement' },
        { p: 'link', l: 'Opens section', t: 'select', options: SECTION_IDS.concat(['contact']) },
        { p: 'badge', l: 'Show TOP badge', t: 'toggle' }
      ].concat(colorPair) }
    ]},
    { id: 'contact', icon: '✉️', label: 'Contact & footer', at: 'contact', lead: 'The “To be continued…” ending.', fields: [
      { t: 'group', l: 'Ending', fields: [
        { p: 'contact.eyebrow', l: 'Small label', t: 'text' }, { p: 'contact.title', l: 'Big title', t: 'text' },
        { p: 'contact.ctaLabel', l: 'Email button', t: 'text' }, { p: 'contact.nextLine', l: 'Last line', t: 'text' }
      ]},
      { t: 'group', l: 'Footer', fields: [
        { p: 'footer.left', l: 'Left', t: 'text', h: '{fullName} and {name} are replaced.' }, { p: 'footer.right', l: 'Right', t: 'text' }
      ]}
    ]},
    { grp: 'Design' },
    { id: 'sections', icon: '🗂️', label: 'Section titles & cards', at: '', lead: 'Headings, menu names and the episode cards for every section. You can also hide a section.', fields: SECTION_IDS.map(function (id) {
      return { t: 'group', l: SECTION_NAMES[id], fields: [
        { p: 'sections.' + id + '.hidden', l: 'Hide this section', t: 'toggle', wide: true },
        { p: 'sections.' + id + '.title', l: 'Heading', t: 'text', h: '{name} is replaced' }, { p: 'sections.' + id + '.eyebrow', l: 'Small label above', t: 'text' },
        { p: 'sections.' + id + '.note', l: 'Note (right side)', t: 'text', wide: true },
        { p: 'sections.' + id + '.nav', l: 'Menu name', t: 'text' }, { p: 'sections.' + id + '.ep', l: 'Card label', t: 'text' },
        { p: 'sections.' + id + '.card', l: 'Card title', t: 'text' }, { p: 'sections.' + id + '.cardSub', l: 'Card subtitle', t: 'text' },
        { p: 'sections.' + id + '.w', l: 'Card watermark', t: 'text' }, { p: 'sections.' + id + '.progress', l: 'Card progress %', t: 'range', min: 0, max: 100 },
        { p: 'sections.' + id + '.c1', l: 'Card colour 1', t: 'color' }, { p: 'sections.' + id + '.c2', l: 'Card colour 2', t: 'color' }
      ] };
    }) },
    { id: 'theme', icon: '🎨', label: 'Theme & SEO', at: '', lead: 'Brand colours, film grain, the cursor trail, and how the site shows up in Google and link previews.', fields: [
      { t: 'group', l: 'Colours', fields: [
        { p: 'site.accent', l: 'Accent (red)', t: 'color' }, { p: 'site.gold', l: 'Awards (gold)', t: 'color' },
        { p: 'site.brandSuffix', l: 'Text after logo', t: 'text', h: 'e.g. SERIES' },
        { p: 'site.grain', l: 'Film grain overlay', t: 'toggle' }
      ]},
      { t: 'group', l: 'Cursor trail (desktop only)', fields: [
        { p: 'site.cursor.enabled', l: 'Show the symbol trail behind the mouse', t: 'toggle', wide: true },
        { p: 'site.cursor.clickBurst', l: 'Burst of symbols on click', t: 'toggle', wide: true },
        { p: 'site.cursor.speed', l: 'Speed', t: 'range', min: 1, max: 10, h: '1 = calm, 10 = lively. Changes how far symbols drift and how long they keep moving.' },
        { p: 'site.cursor.size', l: 'Circle size (px)', t: 'range', min: 24, max: 72 },
        { p: 'site.cursor.spacing', l: 'Spacing (px)', t: 'range', min: 16, max: 80, h: 'Gap between symbols when moving slowly. Fast movement packs them tighter.' },
        { p: 'site.cursor.maxParticles', l: 'Max badges on screen', t: 'range', min: 10, max: 200 },
        { p: 'site.cursor.colorA', l: 'Colour A (red)', t: 'color', h: 'Circle colour on every other symbol.' },
        { p: 'site.cursor.colorB', l: 'Colour B (black)', t: 'color', h: 'Circle colour on the others. Symbols alternate between the two.' },
        { p: 'site.cursor.icons', l: 'Cursor symbols', t: 'list', wide: true,
          title: function (x) { return (x.label || x.name || 'Symbol') + (x.show === false ? '  (hidden)' : ''); },
          add: { name: 'new-symbol', glyph: 'star', label: 'NEW', src: '', show: true },
          fields: [
            { p: 'name', l: 'Name', t: 'text', h: 'Short ID, e.g. instagram' },
            { p: 'label', l: 'Text fallback', t: 'text', h: 'Shown only when there is no image and no symbol.' },
            { p: 'glyph', l: 'Symbol', t: 'select', options: GLYPH_NAMES, h: 'Built-in line icon, used when there is no image.' },
            { p: 'src', l: 'Image (optional)', t: 'image', wide: true, max: 512, h: 'SVG or PNG. Overrides the symbol. Logo files can also go in assets/cursor-icons/.' },
            { p: 'show', l: 'Show in the trail', t: 'toggle', wide: true }
          ] }
      ]},
      { t: 'group', l: 'Search & sharing', fields: [
        { p: 'site.title', l: 'Browser tab title', t: 'text', wide: true, h: '{name} is replaced' },
        { p: 'site.description', l: 'Description', t: 'textarea', wide: true }
      ]}
    ]},
    { grp: 'Site' },
    { id: 'publish', icon: '🚀', label: 'Publish & backup', special: 'publish', at: '' }
  ];

  /* ------------------------------------------------------------------ STATE */
  var draft = null, published = null, page = null, openItems = {}, gh = load(GH_KEY) || { owner: '', repo: '', branch: 'main', token: '', base: '' };

  function boot() {
    renderNav();
    var d = load(DRAFT_KEY);
    fetchLive().then(function (live) {
      published = live || load(PUB_KEY);
      if (live) store(PUB_KEY, live);
      draft = d || clone(published || {});
      if (d && published && JSON.stringify(d) !== JSON.stringify(published)) toast('Restored your unsaved changes');
      afterLoad();
    }, function () {
      published = load(PUB_KEY); draft = d || clone(published || {});
      if (!published && !d) { draft = {}; modal('Could not load content.json', '<p>Open the admin from your running site (e.g. <span class="kbd">yoursite.com/admin</span> or a local server). You can also import a content.json file from the <b>Publish & backup</b> page.</p>', [{ l: 'OK', primary: true }]); }
      afterLoad();
    });
  }
  function fetchLive() { return fetch('../content.json', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }); }
  function afterLoad() {
    var start = (location.hash || '').slice(1);
    show(PAGES.filter(function (p) { return p.id === start; })[0] || PAGES[1]);
    updateStatus();
  }

  /* ------------------------------------------------------------------ NAV */
  function renderNav() {
    var nav = $('#pages'); nav.innerHTML = '';
    PAGES.forEach(function (p) {
      if (p.grp) { nav.appendChild(h('div', { class: 'grp', text: p.grp })); return; }
      nav.appendChild(h('button', { type: 'button', 'data-id': p.id, onclick: function () { show(p); $('#side').classList.remove('open'); } }, [h('i', { text: p.icon }), p.label]));
    });
  }
  function show(p) {
    page = p;
    [].forEach.call(document.querySelectorAll('#pages button'), function (b) { b.classList.toggle('on', b.dataset.id === p.id); });
    try { history.replaceState(null, '', '#' + p.id); } catch (e) {}
    renderPage(); $('#scroll').scrollTop = 0; refreshPreview(true);
  }

  /* ------------------------------------------------------------------ FORM */
  function renderPage(keepScroll) {
    var sc = $('#scroll').scrollTop, form = $('#form');
    form.innerHTML = '';
    if (page.special === 'publish') { renderPublish(form); return; }
    form.appendChild(h('h1', { text: page.label }));
    form.appendChild(h('p', { class: 'lead', text: page.lead || '' }));
    var fs = h('div', { class: 'fs' });
    if (page.sec) fs.appendChild(renderField({ t: 'group', l: 'Section heading', fields: [
      { p: 'sections.' + page.sec + '.title', l: 'Heading', t: 'text', h: '{name} is replaced' },
      { p: 'sections.' + page.sec + '.eyebrow', l: 'Small label above', t: 'text' },
      { p: 'sections.' + page.sec + '.note', l: 'Note', t: 'text', wide: true },
      { p: 'sections.' + page.sec + '.hidden', l: 'Hide this section', t: 'toggle', wide: true }
    ] }, ''));
    page.fields.forEach(function (f) { fs.appendChild(renderField(f, '')); });
    form.appendChild(fs);
    if (keepScroll) $('#scroll').scrollTop = sc;
  }
  function full(base, p) { return base ? base + '.' + p : p; }
  var uid = 0;

  function renderField(f, base) {
    if (f.t === 'group') {
      var g = h('div', { class: 'group' }, [h('h3', { text: f.l })]);
      var grid = h('div', { class: 'grid2' }); f.fields.forEach(function (x) { grid.appendChild(renderField(x, base)); }); g.appendChild(grid);
      return g;
    }
    if (f.t === 'list') return renderList(f, base);
    var path = full(base, f.p), val = get(draft, path), id = 'f' + (uid++);
    var wrap = h('div', { class: 'field' + (f.wide || f.t === 'textarea' || f.t === 'image' || f.t === 'tags' || f.t === 'order' ? ' wide' : '') });
    var label = f.t === 'toggle' ? null : h('label', { for: id, text: f.l });
    if (label) wrap.appendChild(label);
    var input;
    switch (f.t) {
      case 'textarea':
        input = h('textarea', { id: id, class: 'inp', oninput: function () { change(path, this.value); } }); input.value = val || ''; break;
      case 'color':
        var txt = h('input', { id: id, class: 'inp', value: val || '', placeholder: '#000000', oninput: function () { if (/^#[0-9a-f]{6}$/i.test(this.value)) { pick.value = this.value; change(path, this.value); } } });
        var pick = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(val || '') ? val : '#000000', 'aria-label': f.l, oninput: function () { txt.value = this.value; change(path, this.value); } });
        input = h('div', { class: 'color' }, [pick, txt]); break;
      case 'toggle':
        var cb = h('input', { type: 'checkbox', id: id, onchange: function () { change(path, this.checked); } }); cb.checked = !!val;
        input = h('label', { class: 'toggle', for: id }, [cb, f.l]); break;
      case 'range':
        var out = h('output', { text: val == null ? '' : val });
        var rg = h('input', { type: 'range', id: id, min: f.min, max: f.max, value: val == null ? f.min : val, oninput: function () { out.textContent = this.value; change(path, +this.value, true); } });
        input = h('div', { class: 'range' }, [rg, out]); break;
      case 'select':
        input = h('select', { id: id, class: 'inp', onchange: function () { change(path, this.value); } }, f.options.map(function (o) { return h('option', { value: o, text: o }); }));
        input.value = val || f.options[0]; break;
      case 'tags': input = tagsInput(path, val, id); break;
      case 'order': input = orderInput(path, val); break;
      case 'image': input = imageInput(path, val, f, id); break;
      default:
        input = h('input', { id: id, class: 'inp', type: f.t === 'url' ? 'url' : 'text', value: val == null ? '' : val, oninput: function () { change(path, this.value, f.p === 'name' || f.p === 't'); } });
    }
    wrap.appendChild(input);
    if (f.h) wrap.appendChild(h('div', { class: 'help', text: f.h }));
    return wrap;
  }

  function renderList(f, base) {
    var path = full(base, f.p), arr = get(draft, path);
    if (!Array.isArray(arr)) { arr = []; set(draft, path, arr); }
    var box = h('div', { class: 'group' + (base ? ' nested' : ''), style: base ? 'padding:12px;background:var(--bg);grid-column:1/-1' : null });
    box.appendChild(h('h3', {}, [f.l, h('small', { text: arr.length + ' item' + (arr.length === 1 ? '' : 's') })]));
    var list = h('div', { class: 'list' });
    if (!arr.length) list.appendChild(h('div', { class: 'empty', text: 'Nothing here yet.' }));
    arr.forEach(function (item, i) {
      var key = path + '.' + i, open = !!openItems[key];
      var title = typeof f.title === 'function' ? f.title(item) : (item && item[f.title]) || 'Item ' + (i + 1);
      var el = h('div', { class: 'item' + (open ? ' open' : '') });
      var titleSpan = h('span', { text: title });
      el._title = function () { titleSpan.textContent = typeof f.title === 'function' ? f.title(item) : (item[f.title] || 'Item ' + (i + 1)); };
      var head = h('div', { class: 'ihead' }, [
        h('button', { type: 'button', class: 'tt', 'aria-expanded': String(open), onclick: function () { openItems[key] = !openItems[key]; el.classList.toggle('open'); this.setAttribute('aria-expanded', String(!!openItems[key])); } },
          [h('span', { class: 'chev', text: '›' }), f.swatch ? h('i', { class: 'sw', style: 'background:linear-gradient(135deg,' + (item.c1 || '#333') + ',' + (item[f.swatch] || '#777') + ')' }) : null, titleSpan, h('em', { text: '#' + (i + 1) })]),
        h('button', { type: 'button', class: 'btn icon', title: 'Move up', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { move(arr, i, -1, path); } }, ['↑']),
        h('button', { type: 'button', class: 'btn icon', title: 'Move down', 'aria-label': 'Move down', disabled: i === arr.length - 1, onclick: function () { move(arr, i, 1, path); } }, ['↓']),
        h('button', { type: 'button', class: 'btn icon', title: 'Duplicate', 'aria-label': 'Duplicate', onclick: function () { arr.splice(i + 1, 0, clone(item)); shiftOpen(path, i + 1, 1); openItems[path + '.' + (i + 1)] = true; structural(); } }, ['⧉']),
        h('button', { type: 'button', class: 'btn icon danger', title: 'Delete', 'aria-label': 'Delete', onclick: function () { confirmBox('Delete “' + title + '”?', function () { arr.splice(i, 1); shiftOpen(path, i, -1); structural(); }); } }, ['✕'])
      ]);
      var body = h('div', { class: 'ibody' }), grid = h('div', { class: 'grid2' });
      f.fields.forEach(function (x) { var fe = renderField(x, key); grid.appendChild(fe); });
      body.appendChild(grid); el.appendChild(head); el.appendChild(body);
      el.addEventListener('input', function () { el._title(); });
      list.appendChild(el);
    });
    box.appendChild(list);
    box.appendChild(h('button', { type: 'button', class: 'btn add', onclick: function () { arr.push(clone(f.add || {})); openItems[path + '.' + (arr.length - 1)] = true; structural(); } }, ['+ Add ' + (f.l.replace(/s$/, '').toLowerCase())]));
    return box;
  }
  function move(arr, i, d, path) {
    var j = i + d; if (j < 0 || j >= arr.length) return;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    var a = openItems[path + '.' + i], b = openItems[path + '.' + j]; openItems[path + '.' + i] = b; openItems[path + '.' + j] = a;
    structural();
  }
  function shiftOpen(path, from, d) {
    var keys = Object.keys(openItems).filter(function (k) { return k.indexOf(path + '.') === 0 && /^\d+/.test(k.slice(path.length + 1)); });
    var next = {}; keys.forEach(function (k) { var rest = k.slice(path.length + 1), n = parseInt(rest, 10), tail = rest.slice(String(n).length); if (n >= from) { if (!(d < 0 && n === from)) next[path + '.' + (n + d) + tail] = openItems[k]; } else next[k] = openItems[k]; delete openItems[k]; });
    for (var k in next) openItems[k] = next[k];
  }
  function structural() { saveDraft(); renderPage(true); refreshPreview(); }

  function tagsInput(path, val, id) {
    var arr = Array.isArray(val) ? val : [];
    var box = h('div', { class: 'tags' });
    function draw() {
      box.innerHTML = '';
      arr.forEach(function (t, i) { box.appendChild(h('span', {}, [t, h('button', { type: 'button', 'aria-label': 'Remove ' + t, onclick: function () { arr.splice(i, 1); change(path, arr); draw(); } }, ['×'])])); });
      var inp = h('input', { id: id, placeholder: 'Type and press Enter', onkeydown: function (e) {
        if ((e.key === 'Enter' || e.key === ',') && this.value.trim()) { e.preventDefault(); arr.push(this.value.trim()); change(path, arr); draw(); $('#' + id).focus(); }
        else if (e.key === 'Backspace' && !this.value && arr.length) { arr.pop(); change(path, arr); draw(); $('#' + id).focus(); }
      } });
      box.appendChild(inp);
    }
    draw(); return box;
  }
  function orderInput(path, val) {
    var arr = (Array.isArray(val) ? val : []).filter(function (x) { return SECTION_IDS.indexOf(x) > -1; });
    SECTION_IDS.forEach(function (s) { if (arr.indexOf(s) < 0) arr.push(s); });
    set(draft, path, arr);
    var ul = h('ul', { class: 'order' });
    function draw() {
      ul.innerHTML = '';
      arr.forEach(function (s, i) {
        ul.appendChild(h('li', {}, [h('small', { text: String(i + 1) }), h('b', { text: SECTION_NAMES[s] }),
          h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); change(path, arr); draw(); } }, ['↑']),
          h('button', { type: 'button', class: 'btn icon', 'aria-label': 'Move down', disabled: i === arr.length - 1, onclick: function () { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); change(path, arr); draw(); } }, ['↓'])]));
      });
    }
    draw(); return ul;
  }
  function imgSrc(v) { return !v ? '' : (/^(data:|https?:|\/)/.test(v) ? v : '../' + v); }
  function imageInput(path, val, f, id) {
    var thumb = h('div', { class: 'thumb' + (f.shape === 'wide' ? ' wide' : '') });
    var url = h('input', { class: 'inp', placeholder: 'Image link or images/file.jpg', value: val && val.indexOf('data:') !== 0 ? val : '', oninput: function () { change(path, this.value); paint(this.value); } });
    function paint(v) { thumb.style.backgroundImage = v ? 'url("' + imgSrc(v) + '")' : ''; thumb.textContent = v ? '' : 'No image'; }
    var file = h('input', { type: 'file', id: id, accept: 'image/*', hidden: true, onchange: function () { if (this.files[0]) take(this.files[0]); this.value = ''; } });
    function take(fl) {
      if (!/^image\//.test(fl.type)) return toast('Please choose an image file');
      resize(fl, f.max || 1400).then(function (data) { change(path, data); paint(data); url.value = ''; toast('Image added. It uploads when you publish.'); }, function () { toast('Could not read that image'); });
    }
    var ctl = h('div', { class: 'ctl' }, [
      h('div', { class: 'row' }, [
        h('button', { type: 'button', class: 'btn', onclick: function () { file.click(); } }, ['Upload image']),
        h('button', { type: 'button', class: 'btn ghost danger', onclick: function () { change(path, ''); paint(''); url.value = ''; } }, ['Remove'])
      ]), url, file]);
    var box = h('div', { class: 'img' }, [thumb, ctl]);
    ['dragover', 'dragenter'].forEach(function (ev) { box.addEventListener(ev, function (e) { e.preventDefault(); box.classList.add('drop'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { box.addEventListener(ev, function () { box.classList.remove('drop'); }); });
    box.addEventListener('drop', function (e) { e.preventDefault(); if (e.dataTransfer.files[0]) take(e.dataTransfer.files[0]); });
    paint(val); return box;
  }
  function resize(fl, max) {
    return new Promise(function (ok, bad) {
      var r = new FileReader();
      r.onerror = bad;
      r.onload = function () {
        if (fl.type === 'image/svg+xml' || fl.type === 'image/gif') return ok(r.result);
        var im = new Image(); im.onerror = bad;
        im.onload = function () {
          var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
          c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          var png = fl.type === 'image/png' || fl.type === 'image/webp';
          var out = png ? c.toDataURL('image/webp', .9) : c.toDataURL('image/jpeg', .86);
          if (png && out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
          ok(out);
        };
        im.src = r.result;
      };
      r.readAsDataURL(fl);
    });
  }

  /* ------------------------------------------------------------------ CHANGE / SAVE */
  var saveT = null;
  function change(path, val, light) {
    set(draft, path, val);
    clearTimeout(saveT); saveT = setTimeout(function () { saveDraft(); refreshPreview(); }, light ? 500 : 350);
    updateStatus(true);
  }
  function saveDraft() {
    if (!store(DRAFT_KEY, draft)) toast('Browser storage is full. Use smaller images or publish now.');
    updateStatus();
  }
  function isDirty() { return JSON.stringify(draft) !== JSON.stringify(published); }
  function updateStatus(typing) {
    var st = $('#status'), dirty = draft && published ? isDirty() : !!draft;
    st.className = 'status ' + (dirty ? 'dirty' : 'ok');
    st.querySelector('span').textContent = typing ? 'Saving draft…' : dirty ? 'Unpublished changes (saved in this browser)' : 'Everything is published';
  }

  /* ------------------------------------------------------------------ PREVIEW */
  var frame = $('#frame'), pvT = null;
  function previewUrl() {
    var q = page && page.preview ? page.preview : '?preview=1&skip=1' + (page && page.at ? '&at=' + page.at : '');
    return '../index.html' + q + '&t=' + Date.now();
  }
  function refreshPreview(now) {
    if ($('#app').classList.contains('no-pv')) return;
    clearTimeout(pvT); pvT = setTimeout(function () { frame.src = previewUrl(); }, now ? 0 : 450);
  }
  $('#previewBtn').addEventListener('click', function () { var a = $('#app'); a.classList.toggle('no-pv'); if (!a.classList.contains('no-pv')) refreshPreview(true); });
  $('#pvClose').addEventListener('click', function () { $('#app').classList.add('no-pv'); });
  $('#pvReload').addEventListener('click', function () { saveDraft(); refreshPreview(true); });
  $('#pvOpen').addEventListener('click', function () { saveDraft(); window.open(previewUrl().replace(/&t=\d+/, ''), '_blank'); });
  [].forEach.call(document.querySelectorAll('.seg button'), function (b) {
    b.addEventListener('click', function () { [].forEach.call(document.querySelectorAll('.seg button'), function (x) { x.classList.toggle('on', x === b); }); $('#pvStage').classList.toggle('phone', b.dataset.w === 'phone'); });
  });
  if (window.innerWidth < 1180) $('#app').classList.add('no-pv');
  $('#menuBtn').addEventListener('click', function () { $('#side').classList.toggle('open'); });

  /* ------------------------------------------------------------------ PUBLISH PAGE */
  function renderPublish(form) {
    form.appendChild(h('h1', { text: 'Publish & backup' }));
    form.appendChild(h('p', { class: 'lead', text: 'Connect your GitHub repository once. After that, the Publish button saves your changes to GitHub, and your host (Vercel, Netlify or GitHub Pages) updates the live site in about a minute.' }));
    var fs = h('div', { class: 'fs' });
    fs.appendChild(h('div', { class: 'note', html: '<b>One-time setup</b><ol><li>On GitHub, open <b>Settings → Developer settings → Personal access tokens → Fine-grained tokens</b> and click <b>Generate new token</b>.</li><li>Under <b>Repository access</b>, choose <b>Only select repositories</b> and pick your portfolio repo.</li><li>Under <b>Permissions → Repository permissions</b>, set <b>Contents</b> to <b>Read and write</b>.</li><li>Generate the token, copy it, and paste it below.</li></ol>' }));
    var g = h('div', { class: 'group' }, [h('h3', { text: 'GitHub connection' })]);
    var grid = h('div', { class: 'grid2' });
    function inp(k, label, help, type) {
      var id = 'gh_' + k, el = h('input', { id: id, class: 'inp', type: type || 'text', value: gh[k] || '', autocomplete: 'off', oninput: function () { gh[k] = this.value.trim(); store(GH_KEY, gh); } });
      return h('div', { class: 'field' + (k === 'token' ? ' wide' : '') }, [h('label', { for: id, text: label }), el, help ? h('div', { class: 'help', text: help }) : null]);
    }
    grid.appendChild(inp('owner', 'GitHub username', 'e.g. srisurya'));
    grid.appendChild(inp('repo', 'Repository name', 'e.g. portfolio'));
    grid.appendChild(inp('branch', 'Branch', 'Usually main'));
    grid.appendChild(inp('base', 'Folder inside the repo', 'Leave empty if index.html is at the top of the repo'));
    grid.appendChild(inp('token', 'Access token', 'Stored only in this browser. Never share it.', 'password'));
    g.appendChild(grid);
    g.appendChild(h('div', { class: 'row', style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
      h('button', { type: 'button', class: 'btn', onclick: testConn }, ['Test connection']),
      h('button', { type: 'button', class: 'btn', onclick: pullFromGitHub }, ['Load latest from GitHub']),
      h('button', { type: 'button', class: 'btn ghost danger', onclick: function () { gh.token = ''; store(GH_KEY, gh); renderPage(); toast('Token removed from this browser'); } }, ['Forget token'])
    ]));
    fs.appendChild(g);

    var b = h('div', { class: 'group' }, [h('h3', { text: 'Backup & restore' }),
      h('p', { style: 'margin:0;color:var(--muted)', text: 'Download your content as a file, or load one. Useful for backups, or to publish by hand: replace content.json in your repo with the downloaded file.' }),
      h('div', { style: 'display:flex;gap:8px;flex-wrap:wrap' }, [
        h('button', { type: 'button', class: 'btn', onclick: exportJson }, ['Download content.json']),
        h('button', { type: 'button', class: 'btn', onclick: function () { $('#importFile').click(); } }, ['Import content.json']),
        h('input', { type: 'file', id: 'importFile', accept: 'application/json,.json', hidden: true, onchange: importJson }),
        h('button', { type: 'button', class: 'btn ghost danger', onclick: function () { confirmBox('Discard all unpublished changes?', function () { draft = clone(published || {}); store(DRAFT_KEY, draft); updateStatus(); renderPage(true); refreshPreview(true); toast('Draft discarded'); }); } }, ['Discard unpublished changes'])
      ])]);
    fs.appendChild(b);
    fs.appendChild(h('div', { class: 'note warn', html: '<b>Images:</b> new uploads are kept in this browser until you publish, then saved into the <span class="kbd">images/</span> folder of your repo. If you download content.json before publishing, the images are inside the file.' }));
    form.appendChild(fs);
  }

  /* ------------------------------------------------------------------ GITHUB */
  function api(path, opts) {
    opts = opts || {};
    return fetch('https://api.github.com' + path, {
      method: opts.method || 'GET',
      headers: { 'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + gh.token, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined
    }).then(function (r) {
      return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) { var e2 = new Error((j && j.message) || ('HTTP ' + r.status)); e2.status = r.status; throw e2; } return j; });
    });
  }
  function repoPath(p) { var b = (gh.base || '').replace(/^\/+|\/+$/g, ''); return (b ? b + '/' : '') + p; }
  function contentsUrl(p) { return '/repos/' + encodeURIComponent(gh.owner) + '/' + encodeURIComponent(gh.repo) + '/contents/' + repoPath(p).split('/').map(encodeURIComponent).join('/'); }
  function ready() { if (!gh.owner || !gh.repo || !gh.token) { show(PAGES.filter(function (p) { return p.id === 'publish'; })[0]); toast('Connect GitHub first'); return false; } return true; }
  function testConn() {
    if (!ready()) return;
    api(contentsUrl('content.json') + '?ref=' + encodeURIComponent(gh.branch || 'main'))
      .then(function () { toast('Connected. content.json found ✓'); })
      .catch(function (e) { modal('Connection failed', '<p>' + esc(hint(e)) + '</p>', [{ l: 'OK', primary: true }]); });
  }
  function hint(e) {
    if (e.status === 401) return 'The token is wrong or expired. Create a new one and paste it again.';
    if (e.status === 403) return 'The token does not have permission. Give it "Contents: Read and write" on this repository.';
    if (e.status === 404) return 'Not found. Check the username, repository name, branch and folder. If the repo is private, make sure the token has access to it.';
    return e.message;
  }
  function b64(str) { var bytes = new TextEncoder().encode(str), bin = ''; for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
  function unb64(s) { var bin = atob(s.replace(/\n/g, '')), bytes = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return new TextDecoder().decode(bytes); }
  function pullFromGitHub() {
    if (!ready()) return;
    api(contentsUrl('content.json') + '?ref=' + encodeURIComponent(gh.branch || 'main')).then(function (j) {
      var data = JSON.parse(unb64(j.content));
      var go = function () { published = data; store(PUB_KEY, data); draft = clone(data); store(DRAFT_KEY, draft); updateStatus(); refreshPreview(true); toast('Loaded the latest content from GitHub'); };
      if (isDirty()) confirmBox('Replace your unpublished changes with the version on GitHub?', go); else go();
    }).catch(function (e) { modal('Could not load', '<p>' + esc(hint(e)) + '</p>', [{ l: 'OK', primary: true }]); });
  }

  function collectImages(obj, path, out) {
    if (typeof obj === 'string') { if (obj.indexOf('data:image/') === 0) out.push({ path: path, data: obj }); return; }
    if (obj && typeof obj === 'object') for (var k in obj) collectImages(obj[k], path ? path + '.' + k : k, out);
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'image'; }

  function publish() {
    if (!ready()) return;
    if (!isDirty()) { toast('Nothing new to publish'); return; }
    var copy = clone(draft), imgs = []; collectImages(copy, '', imgs);
    var log = h('div', { class: 'log', text: '' });
    var add = function (t) { log.textContent += t + '\n'; log.scrollTop = 1e9; };
    modal('Publishing…', log, []);
    var stamp = Date.now(), chain = Promise.resolve();
    imgs.forEach(function (im, n) {
      chain = chain.then(function () {
        var m = /^data:image\/([a-z+]+);base64,(.*)$/i.exec(im.data); if (!m) return;
        var ext = m[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
        var name = 'images/' + slug(im.path) + '-' + stamp + '-' + n + '.' + ext;
        add('Uploading image ' + (n + 1) + ' of ' + imgs.length + '…');
        return api(contentsUrl(name), { method: 'PUT', body: { message: 'Add image ' + name + ' (admin)', content: m[2], branch: gh.branch || 'main' } })
          .then(function () { set(copy, im.path, name); });
      });
    });
    chain.then(function () {
      add('Saving content.json…');
      return api(contentsUrl('content.json') + '?ref=' + encodeURIComponent(gh.branch || 'main')).then(function (j) { return j.sha; }, function (e) { if (e.status === 404) return null; throw e; });
    }).then(function (sha) {
      var body = { message: 'Update portfolio content (admin)', content: b64(JSON.stringify(copy, null, 2) + '\n'), branch: gh.branch || 'main' };
      if (sha) body.sha = sha;
      return api(contentsUrl('content.json'), { method: 'PUT', body: body });
    }).then(function () {
      draft = copy; published = clone(copy); store(PUB_KEY, published); store(DRAFT_KEY, draft); updateStatus();
      add('Done ✓');
      modal('Published', '<p>Your changes are saved to GitHub. The live site updates in about a minute once your host finishes deploying.</p>', [{ l: 'Open live site', fn: function () { window.open('../', '_blank'); } }, { l: 'OK', primary: true }]);
      renderPage(true);
    }).catch(function (e) {
      add('Error: ' + e.message);
      modal('Publish failed', '<p>' + esc(hint(e)) + '</p><p>Your draft is still saved in this browser, so nothing is lost.</p>', [{ l: 'OK', primary: true }]);
    });
  }
  $('#publishBtn').addEventListener('click', publish);

  /* ------------------------------------------------------------------ BACKUP */
  function exportJson() {
    var blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: 'content.json' }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }
  function importJson() {
    var fl = this.files[0]; this.value = ''; if (!fl) return;
    fl.text().then(function (t) {
      var data = JSON.parse(t); if (!data || typeof data !== 'object' || !data.me) throw new Error('This does not look like a portfolio content.json');
      draft = data; saveDraft(); refreshPreview(true); toast('Imported. Review it, then publish.');
    }).catch(function (e) { modal('Import failed', '<p>' + esc(e.message) + '</p>', [{ l: 'OK', primary: true }]); });
  }

  /* ------------------------------------------------------------------ UI BITS */
  function modal(title, body, actions) {
    $('#mTitle').textContent = title;
    var mb = $('#mBody'); mb.innerHTML = ''; if (typeof body === 'string') mb.innerHTML = body; else mb.appendChild(body);
    var ma = $('#mActions'); ma.innerHTML = '';
    actions.forEach(function (a) { ma.appendChild(h('button', { type: 'button', class: 'btn' + (a.primary ? ' primary' : '') + (a.danger ? ' danger' : ''), onclick: function () { $('#modal').hidden = true; if (a.fn) a.fn(); } }, [a.l])); });
    $('#modal').hidden = false;
    var first = ma.querySelector('.primary') || ma.querySelector('button'); if (first) first.focus();
  }
  function confirmBox(text, yes) { modal(text, '<p>This cannot be undone after you publish.</p>', [{ l: 'Cancel' }, { l: 'Yes, continue', primary: true, fn: yes }]); }
  function toast(t) { var el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(function () { el.classList.remove('on'); }, 2400); }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#modal').hidden && $('#mActions').children.length) $('#modal').hidden = true;
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); saveDraft(); refreshPreview(true); toast('Draft saved'); }
  });
  window.addEventListener('beforeunload', function () { if (draft) store(DRAFT_KEY, draft); });

  boot();
})();
