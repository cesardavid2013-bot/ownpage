(function () {
  document.documentElement.classList.add('js');
  // Failsafe: never leave content half-revealed (fast anchor jumps, crawlers, screenshots).
  setTimeout(function () { document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); }); }, 2000);
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
  }

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
    renderPeriod(lang);
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

  // ---- Membership billing period (yearly is the default, like most premium brands) ----
  // Monthly first: the headline price is what a member is actually charged each period.
  var period = 'monthly';
  function renderPeriod(lang) {
    lang = lang || document.documentElement.lang;
    document.querySelectorAll('.period button').forEach(function (b) { b.classList.toggle('on', b.dataset.period === period); b.setAttribute('aria-pressed', b.dataset.period === period); });
    var save = document.querySelector('.period .save');
    if (save) save.textContent = t(lang, 'plan.save').replace('{{percent}}', '50');
    document.querySelectorAll('.tier .price strong').forEach(function (el) { el.textContent = el.dataset[period]; });
    document.querySelectorAll('.tier .billed').forEach(function (el) {
      el.textContent = period === 'yearly' ? t(lang, 'plan.billed').replace('{{price}}', el.dataset.billed) : '\u00a0';
    });
  }
  document.querySelectorAll('.period button').forEach(function (b) {
    b.addEventListener('click', function () { period = b.dataset.period; renderPeriod(); });
  });

  function renderStores(lang) {
    var soon = t(lang, 'store.soon');
    var html =
      store(cfg.appStoreUrl, APPLE, cfg.appStoreUrl ? t(lang, 'store.apple') : soon, 'App Store') +
      store(cfg.playStoreUrl, PLAY, cfg.playStoreUrl ? t(lang, 'store.google') : soon, 'Google Play') +
      store(cfg.appUrl, WEB, cfg.appUrl ? t(lang, 'store.web') : soon, t(lang, 'store.webBig'));
    document.querySelectorAll('[data-stores]').forEach(function (el) { el.innerHTML = html; });
  }

  document.querySelectorAll('[data-app-link]').forEach(function (a) {
    a.href = cfg.appUrl ? cfg.appUrl + (a.getAttribute('data-app-path') || '') : '#get';
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

  // ---- The light: darkness over the portraits, cleared where the visitor's light falls ----
  (function light() {
    var hero = document.querySelector('.lumen');
    if (!hero) return;
    var cv = hero.querySelector('canvas.dark');
    var ctx = cv.getContext('2d');
    var pos = { x: 0.7, y: 0.4 }, target = { x: 0.7, y: 0.4 }, lastMove = 0, visible = true;
    function size() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(hero.clientWidth * dpr); cv.height = Math.round(hero.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function frame(t) {
      var w = hero.clientWidth, h = hero.clientHeight;
      if (performance.now() - lastMove > 2500) {
        // Idle: the light wanders slowly between faces.
        target.x = 0.5 + 0.36 * Math.sin(t / 3100); target.y = 0.42 + 0.22 * Math.sin(t / 2300 + 1);
      }
      pos.x += (target.x - pos.x) * 0.08; pos.y += (target.y - pos.y) * 0.08;
      var x = pos.x * w, y = pos.y * h, r = Math.max(220, Math.min(w, h) * 0.34);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(10,10,12,0.955)';
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'destination-out';
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      // warm tint of candlelight
      ctx.globalCompositeOperation = 'source-over';
      var warm = ctx.createRadialGradient(x, y, 0, x, y, r * 0.9);
      warm.addColorStop(0, 'rgba(233,190,130,0.16)'); warm.addColorStop(1, 'rgba(233,190,130,0)');
      ctx.fillStyle = warm; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      if (visible && !reduceMotion()) requestAnimationFrame(frame);
    }
    hero.addEventListener('pointermove', function (e) {
      var b = hero.getBoundingClientRect();
      target.x = (e.clientX - b.left) / b.width; target.y = (e.clientY - b.top) / b.height; lastMove = performance.now();
    });
    window.addEventListener('resize', function () { size(); if (reduceMotion()) frame(0); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        var was = visible; visible = es[0].isIntersecting;
        if (visible && !was && !reduceMotion()) requestAnimationFrame(frame);
      }).observe(hero);
    }
    size();
    if (reduceMotion()) frame(0); else requestAnimationFrame(frame);
  })();

  // ---- Polyglot vignette: the same message in another language every few seconds ----
  document.querySelectorAll('[data-rotate]').forEach(function (el) {
    var lines = JSON.parse(el.getAttribute('data-rotate')), i = 0;
    if (reduceMotion()) return;
    setInterval(function () {
      el.classList.add('swap');
      setTimeout(function () { i = (i + 1) % lines.length; el.textContent = lines[i]; el.classList.remove('swap'); }, 280);
    }, 2600);
  });

  // ---- Interactive demo: swipe real-looking profiles right on the page ----
  (function demo() {
    var root = document.getElementById('demo');
    if (!root) return;
    var cards = Array.prototype.slice.call(root.querySelectorAll('.dcard'));
    var match = root.querySelector('.dmatch');
    var empty = root.querySelector('.dempty');
    var current = function () { return cards.find(function (c) { return !c.classList.contains('gone'); }); };

    function stamps(card, dx) {
      card.querySelector('.dstamp.like').style.opacity = Math.max(0, Math.min(1, dx / 90));
      card.querySelector('.dstamp.nope').style.opacity = Math.max(0, Math.min(1, -dx / 90));
    }

    function fly(card, dir) {
      if (!card) return;
      var x = dir === 'nope' ? -520 : dir === 'like' ? 520 : 0;
      var y = dir === 'super' ? -760 : 40;
      stamps(card, dir === 'like' ? 120 : dir === 'nope' ? -120 : 0);
      card.classList.remove('back');
      card.classList.add('gone');
      card.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + (x / 22) + 'deg)';
      if (dir !== 'nope') {
        setTimeout(function () {
          var sub = t(document.documentElement.lang, 'demo.matchSub').replace('{name}', card.dataset.name);
          match.querySelector('.dmatch-sub').textContent = sub;
          match.hidden = false;
        }, 380);
      } else if (!current()) {
        setTimeout(function () { empty.hidden = false; }, 380);
      }
    }

    root.querySelectorAll('.dbtn').forEach(function (b) {
      b.addEventListener('click', function () { if (match.hidden) fly(current(), b.dataset.act); });
    });
    root.querySelector('.dkeep').addEventListener('click', function () {
      match.hidden = true;
      if (!current()) empty.hidden = false;
    });
    root.querySelector('.dreset').addEventListener('click', function () {
      empty.hidden = true;
      cards.forEach(function (c) { c.classList.remove('gone'); c.style.transform = ''; stamps(c, 0); });
    });

    var drag = null;
    cards.forEach(function (card) {
      card.addEventListener('pointerdown', function (e) {
        if (card !== current() || !match.hidden) return;
        drag = { card: card, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
        card.classList.remove('back');
        card.setPointerCapture(e.pointerId);
      });
      card.addEventListener('pointermove', function (e) {
        if (!drag || drag.card !== card) return;
        drag.dx = e.clientX - drag.x; drag.dy = e.clientY - drag.y;
        card.style.transform = 'translate(' + drag.dx + 'px,' + drag.dy + 'px) rotate(' + (drag.dx / 18) + 'deg)';
        stamps(card, drag.dx);
      });
      function end() {
        if (!drag || drag.card !== card) return;
        var d = drag; drag = null;
        if (d.dx > 90) fly(card, 'like');
        else if (d.dx < -90) fly(card, 'nope');
        else if (d.dy < -110) fly(card, 'super');
        else { card.classList.add('back'); card.style.transform = ''; stamps(card, 0); }
      }
      card.addEventListener('pointerup', end);
      card.addEventListener('pointercancel', end);
    });
  })();

  // ---- Metal membership cards follow the pointer ----
  if (!reduceMotion()) {
    document.querySelectorAll('.card[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', (px * 14).toFixed(2) + 'deg');
        card.style.setProperty('--rx', (-py * 12).toFixed(2) + 'deg');
        card.style.setProperty('--sx', (px * 60 - 20).toFixed(1) + '%');
        card.style.setProperty('--sy', (py * 60 - 30).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        ['--rx', '--ry', '--sx', '--sy'].forEach(function (v) { card.style.removeProperty(v); });
      });
    });
  }
  function reduceMotion() { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }

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
      var sc = { cv: cv, lights: makeLights(22, seeded(97 + i * 13)), base: ['#2a1c17', '#0d0a0a'] };
      scenes.push(sc); if (seen) track(sc);
      paint(cv, sc.lights, performance.now(), sc.base);
    }
    if (img.complete && img.naturalWidth === 0) swap(); else img.addEventListener('error', swap);
  });

  var seen = new WeakSet();
  var watch = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) seen.add(e.target); else seen.delete(e.target); });
  }) : null;
  function track(sc) { if (watch) watch.observe(sc.cv); else seen.add(sc.cv); }
  scenes.forEach(track);
  function draw(t, all) { scenes.forEach(function (s) { if (all || seen.has(s.cv)) paint(s.cv, s.lights, t, s.base); }); }
  draw(0, true);
  window.addEventListener('resize', function () { draw(performance.now(), true); });
  if (!reduce) {
    var last = 0;
    (function loop(t) { if (t - last > 33) { last = t; draw(t); } requestAnimationFrame(loop); })(0);
  }

})();
