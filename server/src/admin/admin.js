(function () {
  var KEY = 'lumi.admin.token';
  var token = '';
  try { token = sessionStorage.getItem(KEY) || ''; } catch (e) {}
  var tab = 'verifications';
  var $ = function (id) { return document.getElementById(id); };
  var POSES = { peace_sign: 'Peace sign ✌️', thumbs_up: 'Thumbs up 👍', touch_nose: 'Touch your nose 👃', hand_on_cheek: 'Hand on cheek 🤚', wave: 'Wave 👋' };

  function api(path, opts) {
    opts = opts || {};
    return fetch('/admin/api' + path, {
      method: opts.method || 'GET',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      if (r.status === 401) { signOut(); throw new Error('unauthorized'); }
      return r.json();
    });
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function age(d) { var b = new Date(d), n = new Date(), a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; }

  function signOut() {
    token = '';
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    $('dash').hidden = true; $('login').hidden = false; $('logout').hidden = true;
  }

  function show() {
    $('login').hidden = true; $('dash').hidden = false; $('logout').hidden = false;
    loadStats(); load();
  }

  function loadStats() {
    api('/stats').then(function (s) {
      $('stats').innerHTML = [
        [s.members, 'Members'], [s.paying, 'Paying members'], [s.matches_24h, 'Matches · 24 h'],
        [s.pending_verifications, 'Verifications to review'], [s.open_reports, 'Open reports'],
      ].map(function (x) { return '<div><b>' + esc(x[0]) + '</b><span>' + x[1] + '</span></div>'; }).join('');
    });
  }

  function load() {
    var list = $('list');
    list.innerHTML = '';
    if (tab === 'verifications') {
      api('/verifications').then(function (r) {
        if (!r.items.length) { list.innerHTML = '<p class="empty">No selfies waiting for review.</p>'; return; }
        r.items.forEach(function (v) {
          var el = document.createElement('div');
          el.className = 'item';
          el.innerHTML = '<div class="pics"><img class="selfie" alt="Selfie" src="/admin/api/verifications/' + v.id + '/selfie?token=' + encodeURIComponent(token) + '">' +
            (v.photos || []).slice(0, 3).map(function (u) { return '<img alt="" src="' + esc(u) + '">'; }).join('') + '</div>' +
            '<div class="who"><b>' + esc(v.name) + ', ' + age(v.birthdate) + '</b><span>Asked pose: <span class="pose">' + esc(POSES[v.pose] || v.pose) + '</span></span>' +
            '<span>Submitted ' + new Date(v.created_at).toLocaleString() + '</span></div>' +
            '<div class="actions"><button class="primary" data-d="approve">Approve</button><button class="danger" data-d="reject">Reject</button></div>';
          el.querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () {
              var reason = b.dataset.d === 'reject' ? (el.querySelector('.reason') ? el.querySelector('.reason').value : 'Selfie does not match profile photos') : undefined;
              el.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
              api('/verifications/' + v.id, { method: 'POST', body: { decision: b.dataset.d, reason: reason } }).then(function () { el.remove(); loadStats(); });
            });
          });
          list.appendChild(el);
        });
      });
    } else {
      api('/reports').then(function (r) {
        if (!r.items.length) { list.innerHTML = '<p class="empty">No open reports.</p>'; return; }
        r.items.forEach(function (x) {
          var el = document.createElement('div');
          el.className = 'item';
          el.innerHTML = '<div class="pics">' + (x.reported_photos || []).slice(0, 2).map(function (u) { return '<img alt="" src="' + esc(u) + '">'; }).join('') + '</div>' +
            '<div class="who"><b>' + esc(x.reported_name) + '</b><span>Reason: <span class="pose">' + esc(x.reason) + '</span> · reported ' + esc(x.total_reports) + '×</span>' +
            '<span>' + esc(x.details || x.reported_bio || '') + '</span><span>From ' + esc(x.reporter_name) + ' · ' + new Date(x.created_at).toLocaleString() + '</span></div>' +
            '<div class="actions"><button data-a="dismiss">Dismiss</button><button class="danger" data-a="ban">Ban account</button></div>';
          el.querySelectorAll('button').forEach(function (b) {
            b.addEventListener('click', function () {
              el.querySelectorAll('button').forEach(function (y) { y.disabled = true; });
              api('/reports/' + x.id, { method: 'POST', body: { action: b.dataset.a } }).then(function () { el.remove(); loadStats(); });
            });
          });
          list.appendChild(el);
        });
      });
    }
  }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    token = $('token').value.trim();
    api('/stats').then(function () {
      try { sessionStorage.setItem(KEY, token); } catch (err) {}
      $('login-error').hidden = true; show();
    }).catch(function () { $('login-error').hidden = false; });
  });
  $('logout').addEventListener('click', signOut);
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      tab = b.dataset.tab;
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); });
      load();
    });
  });
  if (token) api('/stats').then(show).catch(signOut);
})();
