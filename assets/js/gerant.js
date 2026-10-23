/* Espace gérant : valider les demandes depuis le téléphone */
(function () {
  'use strict';
  if (!window.VE) return;
  var D = window.VE_DATA;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function svg(n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  var euro = function (n) { return n.toLocaleString('fr-FR') + ' €'; };
  var plural = function (n, w) { return n + ' ' + w + (n > 1 ? 's' : ''); };
  function ago(isoDate) {
    var m = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000);
    if (m < 1) return 'à l’instant';
    if (m < 60) return 'il y a ' + m + ' min';
    var h = Math.round(m / 60);
    if (h < 24) return 'il y a ' + h + ' h';
    return 'il y a ' + plural(Math.round(h / 24), 'jour');
  }
  function telHref(p) { return String(p).replace(/[^\d+]/g, ''); }
  function smsHref(p, text) { return 'sms:' + telHref(p) + '?&body=' + encodeURIComponent(text); }
  function firstName(n) { return String(n).split(/[\s&]/)[0]; }

  var ui = { view: 'demandes', filter: 'all' };
  var known = {}; VE.state.requests.forEach(function (r) { known[r.id] = true; });
  var fresh = {};
  var recent = []; // éléments validés/refusés pendant cette visite, pour prévenir les clients

  var views = {}; $$('[data-view]').forEach(function (v) { views[v.getAttribute('data-view')] = v; });

  /* ---------- Toasts ---------- */
  function toast(text, opts) {
    opts = opts || {};
    var box = $('[data-toasts]');
    var t = document.createElement('div');
    t.className = 'toast' + (opts.cls ? ' ' + opts.cls : '');
    t.innerHTML = '<span>' + text + '</span>' + (opts.action ? '<button type="button">' + opts.action + '</button>' : '');
    if (opts.action) t.querySelector('button').addEventListener('click', function () { opts.onAction(); t.remove(); });
    box.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.duration || 5000);
  }
  function act(fn, message, item) {
    var snap = VE.snapshot();
    // ajouté avant fn() : la sauvegarde relance le rendu, qui doit déjà voir l'élément
    if (item) recent = [item].concat(recent).slice(0, 6);
    fn();
    toast(message, { action: 'Annuler', onAction: function () { if (item) recent.shift(); VE.restore(snap); toast('Action annulée'); } });
  }

  /* ---------- Cartes ---------- */
  function person(r, opts) {
    opts = opts || {};
    var who = r.role === 'createur' ? 'a proposé' : 'a rejoint';
    var tag = r.status === 'en_attente' ? '<span class="tagline wait">en attente</span>' : r.status === 'acceptee' ? '<span class="tagline ok">validé</span>' : '<span class="tagline">refusé</span>';
    var actions = '<a class="icon-btn" href="tel:' + telHref(r.phone) + '" aria-label="Appeler ' + esc(r.name) + '">' + svg('phone') + '</a>' +
      '<a class="icon-btn" href="' + smsHref(r.phone, 'Bonjour ' + firstName(r.name) + ', c’est Lucas de VTT É-vasion. ') + '" aria-label="SMS à ' + esc(r.name) + '">' + svg('msg') + '</a>';
    if (opts.decide && r.status === 'en_attente') {
      actions += '<button type="button" class="icon-btn ok" data-req-ok="' + r.id + '" aria-label="Accepter ' + esc(r.name) + '">' + svg('check') + '</button>';
    }
    if (opts.remove && r.status === 'en_attente') {
      actions += '<button type="button" class="icon-btn no" data-req-no="' + r.id + '" aria-label="Refuser ' + esc(r.name) + '">' + svg('x') + '</button>';
    }
    var meta = r.kind === 'location'
      ? plural(r.bikes, 'vélo') + ' · ' + VE.slotLabel(r.slot) + ' · ' + euro(VE.locationPrice(r.slot, r.bikes))
      : plural(r.people, 'pers.').replace('pers.s', 'pers.') + ' · ' + esc(r.level) + ' · ' + who;
    return '<div class="person' + (r.status === 'refusee' ? ' is-refused' : '') + '"><div><b>' + esc(r.name) + '</b>' + tag +
      '<small>' + meta + ' · ' + ago(r.createdAt) + '</small><small>' + esc(r.phone) + (r.email ? ' · ' + esc(r.email) : '') + '</small></div>' +
      '<div class="acts">' + actions + '</div>' + (r.note ? '<p class="note">“' + esc(r.note) + '”</p>' : '') + '</div>';
  }
  function alerts(list) {
    if (!list.length) return '<div class="alerts"><div class="alert ok">' + svg('check') + '<span>Aucun conflit : vélos et guide disponibles.</span></div></div>';
    return '<div class="alerts">' + list.map(function (c) {
      return '<div class="alert ' + c.level + '">' + svg('alert') + '<span>' + esc(c.text) + (c.detail ? '<small>Déjà prévu : ' + esc(c.detail) + '</small>' : '') + '</span></div>';
    }).join('') + '</div>';
  }
  function meter(st) {
    var pct = Math.min(100, st.count / st.max * 100), minPct = st.min / st.max * 100;
    return '<div class="meter"><i class="' + (st.reached ? 'ok' : '') + '" style="width:' + pct + '%"></i><em style="left:calc(' + minPct + '% - 1px)"></em></div>';
  }
  function sessionCard(s) {
    var a = VE.act(s.activity), st = VE.stats(s), conf = VE.conflicts({ type: 'session', session: s });
    var danger = conf.some(function (c) { return c.level === 'danger'; });
    var reqs = VE.sessionRequests(s.id);
    var isNew = reqs.some(function (r) { return fresh[r.id]; });
    var confirmed = s.status === 'confirmee';
    var cls = confirmed ? 'confirmed' : st.reached ? 'ready' : 'forming';
    var lbl = confirmed ? 'Confirmée · ' + plural(st.pending.length, 'nouvelle') : st.reached ? 'Prête à confirmer' : 'Groupe en formation';
    var actions;
    if (confirmed) {
      actions = '<button type="button" class="btn ' + (danger ? 'btn-warn' : 'btn-green') + ' full" data-accept-all="' + s.id + '">' + svg('check') + ' Accepter ' + (st.pending.length > 1 ? 'les ' + st.pending.length + ' demandes' : 'la demande') + (danger ? ' quand même' : '') + '</button>';
    } else {
      actions = '<button type="button" class="btn ' + (danger || !st.reached ? 'btn-warn' : 'btn-green') + '" data-confirm="' + s.id + '">' + svg('check') + (st.reached && !danger ? ' Confirmer la sortie' : ' Confirmer quand même') + '</button>' +
        '<button type="button" class="btn btn-no" data-refuse="' + s.id + '">' + svg('x') + ' Refuser</button>';
    }
    var hint = !confirmed && !st.reached
      ? '<div class="alert warn">' + svg('users') + '<span>Minimum non atteint (' + st.count + '/' + st.min + '). ' + (s.open ? 'Le groupe reste visible dans le calendrier pour être complété : vous pouvez aussi attendre.' : 'Groupe privé : appelez le client pour en parler.') + '</span></div>' : '';
    return '<article class="card' + (isNew ? ' is-new' : '') + '">' +
      '<div class="card-head"><img src="assets/img/' + a.img + '-480.webp" alt=""><div class="t"><span class="st ' + cls + '">' + lbl + '</span><b>' + esc(a.name) + '</b><span>' + esc(VE.dateLong(s.date)) + ' · ' + esc(VE.slotLabel(s.slot)) + '</span></div></div>' +
      '<div class="card-body"><div class="progress-line"><span><b>' + st.count + '</b> inscrits · min ' + st.min + ' · max ' + st.max + '</span><span>' + (st.reached ? plural(st.left, 'place') + ' libre' + (st.left > 1 ? 's' : '') : 'il manque ' + st.missing) + '</span></div>' + meter(st) +
      '<div class="people">' + reqs.filter(function (r) { return r.status !== 'refusee'; }).map(function (r) { return person(r, { decide: confirmed, remove: true }); }).join('') + '</div>' +
      hint + alerts(conf) + '</div>' +
      '<div class="card-actions">' + actions + '</div></article>';
  }
  function locationCard(r) {
    var conf = VE.conflicts({ type: 'location', request: r });
    var danger = conf.some(function (c) { return c.level === 'danger'; });
    return '<article class="card' + (fresh[r.id] ? ' is-new' : '') + '">' +
      '<div class="card-head"><span class="loc-ic">' + svg('bike') + '</span><div class="t"><span class="st pending">Location en attente</span><b>' + plural(r.bikes, 'vélo') + ' · ' + euro(VE.locationPrice(r.slot, r.bikes)) + '</b><span>' + esc(VE.dateLong(r.date)) + ' · ' + esc(VE.slotLabel(r.slot)) + '</span></div></div>' +
      '<div class="card-body"><div class="people">' + person(r) + '</div>' + alerts(conf) + '</div>' +
      '<div class="card-actions"><button type="button" class="btn ' + (danger ? 'btn-warn' : 'btn-green') + '" data-loc-ok="' + r.id + '">' + svg('check') + (danger ? ' Accepter quand même' : ' Accepter') + '</button>' +
      '<button type="button" class="btn btn-no" data-loc-no="' + r.id + '">' + svg('x') + ' Refuser</button></div></article>';
  }
  function notifyCard(item) {
    var lines;
    if (item.type === 'session') {
      var s = VE.session(item.id); if (!s) return '';
      var a = VE.act(s.activity);
      var ok = item.ok;
      lines = VE.sessionRequests(s.id).filter(function (r) { return ok ? r.status === 'acceptee' : r.status === 'refusee'; }).map(function (r) {
        var txt = ok
          ? 'Bonjour ' + firstName(r.name) + ', c’est Lucas de VTT É-vasion : votre ' + a.name + ' du ' + VE.dateLong(s.date) + ' est confirmée ! Je vous envoie le lieu et l’heure du rendez-vous. À bientôt !'
          : 'Bonjour ' + firstName(r.name) + ', c’est Lucas de VTT É-vasion : je ne peux malheureusement pas assurer la ' + a.name + ' du ' + VE.dateLong(s.date) + '. Une autre date vous irait ?';
        return '<a class="btn btn-soft btn-sm" href="' + smsHref(r.phone, txt) + '">' + svg('msg') + ' ' + esc(firstName(r.name)) + '</a>';
      });
      return '<div class="notify"><p>' + (ok ? 'Confirmée : ' : 'Refusée : ') + esc(a.short) + ' · ' + esc(VE.dateShort(s.date)) + ' — prévenir par SMS</p><div class="row">' + lines.join('') + '</div></div>';
    }
    var r = VE.request(item.id); if (!r) return '';
    var t = item.ok
      ? 'Bonjour ' + firstName(r.name) + ', c’est Lucas de VTT É-vasion : votre location de ' + plural(r.bikes, 'E-VTT') + ' le ' + VE.dateLong(r.date) + ' (' + VE.slotLabel(r.slot).toLowerCase() + ') est confirmée ! Rendez-vous à La Saline-les-Bains.'
      : 'Bonjour ' + firstName(r.name) + ', c’est Lucas de VTT É-vasion : je n’ai plus assez de vélos le ' + VE.dateLong(r.date) + '. Une autre date ou un autre créneau vous irait ?';
    return '<div class="notify"><p>' + (item.ok ? 'Location acceptée' : 'Location refusée') + ' · ' + esc(VE.dateShort(r.date)) + ' — prévenir par SMS</p><div class="row"><a class="btn btn-soft btn-sm" href="' + smsHref(r.phone, t) + '">' + svg('msg') + ' ' + esc(firstName(r.name)) + '</a></div></div>';
  }

  /* ---------- Vues ---------- */
  function counts() {
    var items = VE.pendingItems();
    var ready = items.filter(function (i) { return i.type === 'session' && i.session.status === 'ouverte' && VE.stats(i.session).reached; }).length;
    var conflictsN = items.filter(function (i) {
      return VE.conflicts(i.type === 'session' ? { type: 'session', session: i.session } : { type: 'location', request: i.request }).some(function (c) { return c.level !== 'ok'; });
    }).length;
    return { items: items, ready: ready, conflicts: conflictsN };
  }
  function renderDemandes() {
    var c = counts(), items = c.items;
    var shown = items.filter(function (i) {
      if (ui.filter === 'sorties') return i.type === 'session';
      if (ui.filter === 'locations') return i.type === 'location';
      if (ui.filter === 'conflits') return VE.conflicts(i.type === 'session' ? { type: 'session', session: i.session } : { type: 'location', request: i.request }).length > 0;
      return true;
    });
    var h = '<div class="hello"><h1>Bonjour Lucas</h1><p>' + esc(VE.dateLong(VE.today())) + ' · ' + (items.length ? plural(items.length, 'demande') + ' à traiter' : 'tout est à jour') + '</p></div>' +
      '<div class="kpis"><button type="button" class="kpi hot" data-filter="all"><b>' + items.length + '</b><span>à traiter</span></button>' +
      '<button type="button" class="kpi ok" data-filter="sorties"><b>' + c.ready + '</b><span>groupes prêts à confirmer</span></button>' +
      '<button type="button" class="kpi danger" data-filter="conflits"><b>' + c.conflicts + '</b><span>conflits à arbitrer</span></button>' +
      '<button type="button" class="kpi" data-go="reglages"><b>' + VE.state.config.fleet + '</b><span>vélos dans la flotte</span></button></div>';
    if (recent.length) h += '<div style="display:grid;gap:8px;margin-bottom:16px">' + recent.map(notifyCard).join('') + '</div>';
    h += '<div class="filters" role="toolbar" aria-label="Filtrer">' + [['all', 'Tout'], ['sorties', 'Sorties'], ['locations', 'Locations'], ['conflits', 'Conflits']].map(function (f) {
      return '<button type="button" data-filter="' + f[0] + '" aria-pressed="' + (ui.filter === f[0]) + '">' + f[1] + '</button>';
    }).join('') + '</div>';
    if (!shown.length) {
      h += '<div class="adm-empty"><span class="big-ic">' + svg('check') + '</span><b style="color:#fff">Rien à traiter ici</b><p style="margin:0">Les nouvelles demandes apparaîtront ici, avec une notification.</p></div>';
    } else {
      h += shown.map(function (i) { return i.type === 'session' ? sessionCard(i.session) : locationCard(i.request); }).join('');
    }
    views.demandes.innerHTML = h;
  }

  function renderPlanning() {
    var fleet = VE.state.config.fleet, t = VE.today(), h = '<div class="hello"><h1>Planning</h1><p>Les 30 prochains jours · ' + fleet + ' vélos</p></div><div style="margin-top:16px">';
    var any = false;
    for (var i = 0; i < 30; i++) {
      var date = VE.addDays(t, i);
      var sessions = VE.sessionsOn(date);
      var locs = VE.state.requests.filter(function (r) { return r.kind === 'location' && r.date === date && r.status !== 'refusee'; });
      var closed = VE.isClosed(date);
      if (!sessions.length && !locs.length && !closed) continue;
      any = true;
      var gauges = ['matin', 'apres-midi'].map(function (half) {
        var used = VE.bikesUsed(date, half), withP = VE.bikesUsed(date, half, { pending: true });
        var pct = Math.min(100, used / fleet * 100);
        return '<div class="gauge"><small><span>' + VE.slotLabel(half) + '</span><span>' + used + '/' + fleet + (withP > used ? ' · +' + (withP - used) + ' att.' : '') + '</span></small><div class="bar"><i class="' + (withP > fleet ? 'over' : used >= fleet ? 'full' : '') + '" style="width:' + pct + '%"></i></div></div>';
      }).join('');
      var items = sessions.map(function (s) {
        var a = VE.act(s.activity), st = VE.stats(s);
        return '<div class="p-item"><span class="dot" style="background:' + a.color + '"></span><span><b>' + esc(a.short) + '</b> · ' + st.count + ' pers. · ' + VE.slotLabel(s.slot) + '<br><small>' + (s.status === 'confirmee' ? 'Confirmée' : st.reached ? 'Prête à confirmer' : 'En formation, il manque ' + st.missing) + (st.pending.length ? ' · ' + plural(st.pending.length, 'demande') + ' en attente' : '') + '</small></span></div>';
      }).concat(locs.map(function (r) {
        return '<div class="p-item"><span class="dot" style="background:var(--volt)"></span><span><b>Location</b> · ' + esc(r.name) + ' · ' + plural(r.bikes, 'vélo') + '<br><small>' + VE.slotLabel(r.slot) + ' · ' + (r.status === 'acceptee' ? 'Acceptée' : 'En attente') + '</small></span></div>';
      })).join('');
      h += '<div class="day-block' + (closed ? ' closed' : '') + '"><header><h3>' + esc(VE.dateLong(date)) + '<small>' + (closed ? 'Fermé' : i === 0 ? 'Aujourd’hui' : i === 1 ? 'Demain' : 'Dans ' + i + ' jours') + '</small></h3>' +
        '<label class="switch">Fermé <input type="checkbox" data-close-day="' + date + '"' + (closed ? ' checked' : '') + '></label></header>' +
        (closed && !items ? '' : '<div class="gauges">' + gauges + '</div>' + items) + '</div>';
    }
    if (!any) h += '<div class="adm-empty"><span class="big-ic">' + svg('cal') + '</span><b style="color:#fff">Aucune sortie prévue</b></div>';
    views.planning.innerHTML = h + '</div>';
  }

  function renderReglages() {
    var cfg = VE.state.config;
    var notifState = !('Notification' in window) ? 'non disponibles sur cet appareil' : Notification.permission === 'granted' ? 'activées' : Notification.permission === 'denied' ? 'bloquées dans le navigateur' : 'désactivées';
    views.reglages.innerHTML = '<div class="hello"><h1>Réglages</h1><p>Flotte, minimums de participants et jours fermés</p></div><div style="margin-top:18px">' +
      '<div class="set-group"><h3>Flotte</h3><div class="set-row"><span>Vélos électriques<small>Utilisés pour les sorties et la location</small></span>' +
      '<div class="mini-stepper"><button type="button" data-fleet="-1" aria-label="Moins">' + svg('minus') + '</button><output>' + cfg.fleet + '</output><button type="button" data-fleet="1" aria-label="Plus">' + svg('plus') + '</button></div></div></div>' +
      '<div class="set-group"><h3>Sorties</h3>' + Object.keys(D.activities).map(function (id) {
        var a = VE.act(id);
        return '<div class="set-row" style="border-top:1px solid var(--ink-line)"><span>' + esc(a.name) + '<small>' + esc(a.timing) + '</small></span></div><div class="act-set">' +
          ['min', 'max', 'price'].map(function (k) { return '<label>' + (k === 'price' ? 'Prix €' : k === 'min' ? 'Minimum' : 'Maximum') + '<input type="number" inputmode="numeric" min="' + (k === 'price' ? 0 : 1) + '" value="' + a[k] + '" data-act-set="' + id + '" data-key="' + k + '"></label>'; }).join('') + '</div>';
      }).join('') + '</div>' +
      '<div class="set-group"><h3>Jours fermés</h3><p class="help">Ces jours-là, le calendrier n’accepte plus de nouvelles demandes.</p><div class="date-add"><input type="date" data-close-input min="' + VE.today() + '" aria-label="Date à fermer"><button type="button" class="btn btn-soft btn-sm" data-close-add>' + svg('plus') + ' Fermer</button></div>' +
      '<div class="closed-list">' + (VE.state.closed.filter(function (d) { return !VE.isPast(d); }).map(function (d) { return '<button type="button" data-close-day-rm="' + d + '" aria-label="Rouvrir le ' + esc(VE.dateLong(d)) + '">' + esc(VE.dateShort(d)) + ' ' + svg('x') + '</button>'; }).join('') || '<span class="help" style="padding:0">Aucun jour fermé.</span>') + '</div></div>' +
      '<div class="set-group"><h3>Téléphone</h3><div class="set-row"><span>Notifications<small>Actuellement ' + notifState + '</small></span><button type="button" class="btn btn-soft btn-sm" data-notif>' + svg('bell') + ' Activer</button></div>' +
      '<p class="help">Installez cette page comme une appli : sur iPhone, Partager › « Sur l’écran d’accueil » ; sur Android, menu ⋮ › « Installer l’application ». En production, chaque nouvelle demande déclenche une notification sur le téléphone, même appli fermée.</p></div>' +
      '<div class="set-group"><h3>Démo</h3><div class="set-row"><span>Simuler une demande client<small>Pour voir l’alerte arriver</small></span><button type="button" class="btn btn-soft btn-sm" data-simulate>' + svg('bolt') + ' Simuler</button></div>' +
      '<div class="set-row"><span>Réinitialiser la démo<small>Remet les demandes d’exemple</small></span><button type="button" class="btn btn-no btn-sm" data-reset>' + svg('refresh') + ' Réinitialiser</button></div></div></div>';
  }

  function renderBadges() {
    var n = VE.pendingItems().length;
    $$('[data-bell-count], [data-tab-count]').forEach(function (b) { b.hidden = !n; b.textContent = n; });
    document.title = (n ? '(' + n + ') ' : '') + 'Espace gérant – VTT É-vasion';
  }
  function render() {
    renderBadges();
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== ui.view; });
    $$('[data-tab]').forEach(function (b) { if (b.getAttribute('data-tab') === ui.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    if (ui.view === 'demandes') renderDemandes();
    if (ui.view === 'planning') renderPlanning();
    if (ui.view === 'reglages') renderReglages();
  }
  function go(view) { ui.view = view; render(); window.scrollTo(0, 0); }

  /* ---------- Nouvelles demandes ---------- */
  function checkNew() {
    var news = VE.state.requests.filter(function (r) { return !known[r.id]; });
    VE.state.requests.forEach(function (r) { known[r.id] = true; });
    news.filter(function (r) { return r.status === 'en_attente'; }).forEach(function (r) {
      fresh[r.id] = true;
      var what = r.kind === 'location' ? 'Location ' + plural(r.bikes, 'vélo') : VE.act(VE.session(r.sessionId).activity).short + ' · ' + plural(r.people, 'pers.').replace('pers.s', 'pers.');
      var text = 'Nouvelle demande : ' + r.name + ' · ' + what + ' · ' + VE.dateShort(r.date);
      toast(svg('bell') + ' ' + esc(text), { cls: 'new', action: 'Voir', onAction: function () { ui.filter = 'all'; go('demandes'); }, duration: 8000 });
      var bell = $('[data-bell]'); bell.classList.remove('ring'); void bell.offsetWidth; bell.classList.add('ring');
      if (navigator.vibrate) navigator.vibrate([90, 50, 90]);
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        try { new Notification('VTT É-vasion', { body: text, icon: 'assets/img/icon-192.png' }); } catch (e) { }
      }
    });
  }
  document.addEventListener('ve:change', function () { checkNew(); render(); });

  /* ---------- Actions ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, [data-tab]'); if (!t) return;
    var d = t.dataset;
    if (d.tab) return go(d.tab);
    if (d.go) return go(d.go);
    if (t.matches('[data-bell]')) { ui.filter = 'all'; return go('demandes'); }
    if (d.filter) { ui.filter = d.filter; if (ui.view !== 'demandes') go('demandes'); else render(); return; }
    if (d.confirm) { var s1 = VE.session(d.confirm); return act(function () { VE.confirmSession(s1.id); }, 'Sortie ' + VE.act(s1.activity).short + ' confirmée', { type: 'session', id: s1.id, ok: true }); }
    if (d.refuse) { var s2 = VE.session(d.refuse); return act(function () { VE.refuseSession(s2.id); }, 'Sortie ' + VE.act(s2.activity).short + ' refusée', { type: 'session', id: s2.id, ok: false }); }
    if (d.acceptAll) {
      var s3 = VE.session(d.acceptAll);
      return act(function () { VE.stats(s3).pending.forEach(function (r) { VE.setRequestStatus(r.id, 'acceptee'); }); }, 'Participants acceptés', { type: 'session', id: s3.id, ok: true });
    }
    if (d.reqOk) return act(function () { VE.setRequestStatus(d.reqOk, 'acceptee'); }, VE.request(d.reqOk).name + ' accepté(e)');
    if (d.reqNo) return act(function () { VE.setRequestStatus(d.reqNo, 'refusee'); }, VE.request(d.reqNo).name + ' retiré(e) du groupe');
    if (d.locOk) return act(function () { VE.setRequestStatus(d.locOk, 'acceptee'); }, 'Location acceptée', { type: 'location', id: d.locOk, ok: true });
    if (d.locNo) return act(function () { VE.setRequestStatus(d.locNo, 'refusee'); }, 'Location refusée', { type: 'location', id: d.locNo, ok: false });
    if (d.fleet) return VE.setFleet(VE.state.config.fleet + +d.fleet);
    if (d.closeDayRm) return VE.toggleClosed(d.closeDayRm);
    if (t.matches('[data-close-add]')) {
      var v = $('[data-close-input]').value;
      if (v && !VE.isClosed(v)) { VE.toggleClosed(v); toast('Jour fermé : ' + VE.dateLong(v)); }
      return;
    }
    if (t.matches('[data-notif]')) {
      if (!('Notification' in window)) return toast('Notifications non disponibles ici');
      Notification.requestPermission().then(function () { render(); });
      return;
    }
    if (t.matches('[data-simulate]')) return simulate();
    if (t.matches('[data-reset]')) { if (confirm('Remettre les données de démonstration ?')) { VE.reset(); known = {}; VE.state.requests.forEach(function (r) { known[r.id] = true; }); recent = []; fresh = {}; render(); toast('Démo réinitialisée'); } }
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('[data-close-day]')) VE.toggleClosed(t.getAttribute('data-close-day'));
    if (t.matches('[data-act-set]')) VE.setActivityConfig(t.getAttribute('data-act-set'), t.getAttribute('data-key'), +t.value);
  });

  function simulate() {
    var names = ['Emma R.', 'Lucas T.', 'Chloé B.', 'Hugo P.', 'Léa M.', 'Nathan F.'];
    var name = names[Math.floor(Math.random() * names.length)];
    var groups = VE.openGroups().filter(function (s) { return s.status !== 'confirmee'; });
    if (groups.length && Math.random() < .6) {
      var s = groups[Math.floor(Math.random() * groups.length)];
      VE.joinSession(s.id, { people: Math.min(2, VE.stats(s).left), level: 'Intermédiaire', name: name, phone: '0692 00 11 22' });
    } else {
      VE.requestLocation({ date: VE.addDays(VE.today(), 4 + Math.floor(Math.random() * 6)), slot: 'journee', bikes: 2 + Math.floor(Math.random() * 3), name: name, phone: '0693 00 11 22' });
    }
  }

  render();
})();
