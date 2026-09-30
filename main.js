(function () {
  document.documentElement.classList.add('js');
  var cfg = window.LUMI_CONFIG || {};
  var dict = window.LUMI_I18N;
  var LANGS = window.LUMI_LANGS;
  var RTL = { ar: true };
  var KEY = 'lumi.site.lang';

  function detect() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}
    if (saved && dict[saved]) return saved;
    var nav = (navigator.languages || [navigator.language || 'en']);
    for (var i = 0; i < nav.length; i++) {
      var code = String(nav[i]).slice(0, 2).toLowerCase();
      if (dict[code]) return code;
    }
    return 'en';
  }

  function t(lang, key) {
    return (dict[lang] && dict[lang][key]) || dict.en[key] || '';
  }

  function apply(lang) {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL[lang] ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(lang, el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    // Only our own dictionary strings reach innerHTML; they may contain <em> for emphasis.
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = t(lang, el.getAttribute('data-i18n-html'));
      if (v) el.innerHTML = v;
    });
    document.title = 'Lumi — ' + t(lang, 'hero.eyebrow');
    renderStores(lang);
    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  var APPLE = '<svg viewBox="0 0 24 24"><path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.72-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.05 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.29-3.53zM14.2 6.13c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.3-.56.64-1.05 1.67-.92 2.66.97.08 1.96-.49 2.56-1.2z"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24"><path d="M3.6 2.3c-.3.3-.4.7-.4 1.2v17c0 .5.1.9.4 1.2l9.6-9.7L3.6 2.3zm10.7 10.8 2.9 2.9-11.3 6.5c-.3.2-.7.2-1 .1l9.4-9.5zm4.2-4.1 3 1.7c.8.5.8 1.8 0 2.3l-3 1.7-3.2-3.2 3.2-2.5zM5.3.4 16.6 6.9l-2.3 2.3L4.9.4c.1 0 .3 0 .4 0z"/></svg>';
  var WEB = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zM16.3 14a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4h-3.4z"/></svg>';

  function store(href, icon, small, big) {
    var soon = !href;
    return '<a class="store' + (soon ? ' soon' : '') + '" ' + (soon ? 'aria-disabled="true"' : 'href="' + href + '" target="_blank" rel="noopener"') + '>' +
      icon + '<span><small>' + small + '</small><strong>' + big + '</strong></span></a>';
  }

  function renderStores(lang) {
    var soon = t(lang, 'store.soon');
    var html =
      store(cfg.appStoreUrl, APPLE, cfg.appStoreUrl ? t(lang, 'store.apple') : soon, 'App Store') +
      store(cfg.playStoreUrl, PLAY, cfg.playStoreUrl ? t(lang, 'store.google') : soon, 'Google Play') +
      store(cfg.appUrl, WEB, t(lang, 'store.web'), t(lang, 'store.webBig'));
    document.querySelectorAll('[data-stores]').forEach(function (el) { el.innerHTML = html; });
  }

  document.querySelectorAll('[data-app-link]').forEach(function (a) {
    a.href = (cfg.appUrl || '#') + (a.getAttribute('data-app-path') || '');
  });

  var select = document.getElementById('lang');
  LANGS.forEach(function (l) {
    var o = document.createElement('option');
    o.value = l[0];
    o.textContent = l[1];
    select.appendChild(o);
  });
  var lang = detect();
  select.value = lang;
  select.addEventListener('change', function () { apply(select.value); });
  apply(lang);

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---- City-lights bokeh (the brand's signature texture) ----
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PALETTE = [[233, 190, 130], [227, 139, 106], [245, 214, 160], [200, 150, 110], [255, 236, 200], [170, 120, 150]];
  function seeded(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function makeLights(n, rnd) {
    var list = [];
    for (var i = 0; i < n; i++) {
      var c = PALETTE[Math.floor(rnd() * PALETTE.length)];
      list.push({ x: rnd(), y: 0.15 + rnd() * 0.85, r: 0.02 + Math.pow(rnd(), 2.2) * 0.11, a: 0.12 + rnd() * 0.4, c: c, dx: (rnd() - 0.5) * 0.00012, ph: rnd() * 6.28 });
    }
    return list;
  }

  function paint(canvas, lights, time, base) {
    var w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!w || !h) return;
    if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, base[0]); bg.addColorStop(1, base[1]);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    var m = Math.max(w, h);
    lights.forEach(function (l) {
      var x = ((l.x + l.dx * time) % 1 + 1) % 1 * w;
      var y = l.y * h;
      var r = l.r * m;
      var a = l.a * (0.75 + 0.25 * Math.sin(time / 900 + l.ph));
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(' + l.c + ',' + a + ')');
      g.addColorStop(0.55, 'rgba(' + l.c + ',' + a * 0.55 + ')');
      g.addColorStop(0.85, 'rgba(' + l.c + ',' + a * 0.9 + ')');
      g.addColorStop(1, 'rgba(' + l.c + ',0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
    });
  }

  var scenes = [];
  document.querySelectorAll('canvas[data-bokeh]').forEach(function (cv, i) {
    scenes.push({ cv: cv, lights: makeLights(cv.dataset.bokeh === 'hero' ? 46 : 34, seeded(11 + i * 7)), base: ['#0b0a0d', '#15110f'] });
  });

  // Photos that can't load (offline previews, blocked hosts) become a warm, portrait-toned light study instead of a broken image.
  document.querySelectorAll('img[data-fallback]').forEach(function (img, i) {
    function swap() {
      var cv = document.createElement('canvas');
      img.replaceWith(cv);
      scenes.push({ cv: cv, lights: makeLights(22, seeded(97 + i * 13)), base: ['#2a1c17', '#0d0a0a'] });
      draw(performance.now());
    }
    if (img.complete && img.naturalWidth === 0) swap(); else img.addEventListener('error', swap);
  });

  function draw(t) { scenes.forEach(function (s) { paint(s.cv, s.lights, t, s.base); }); }
  draw(0);
  window.addEventListener('resize', function () { draw(performance.now()); });
  if (!reduce) {
    (function loop(t) { draw(t); requestAnimationFrame(loop); })(0);
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }
})();
