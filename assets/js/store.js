/* Couche de données des réservations.
   Version démo : tout est stocké dans le navigateur (localStorage), ce qui permet
   de tester côté client puis côté gérant sur le même appareil.
   En production, seules les fonctions load/save sont à brancher sur un backend
   (Supabase, Firebase…) : le reste de l'API ne change pas. */
(function () {
  'use strict';
  var KEY = 'vtte-evasion-demo-v1';
  var D = window.VE_DATA;

  /* ---------- Dates (toujours en heure locale, format AAAA-MM-JJ) ---------- */
  function pad(n) { return String(n).padStart(2, '0'); }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function today() { return iso(new Date()); }
  function addDays(s, n) { var d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  var fmtLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  var fmtShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dateLong(s) { return cap(fmtLong.format(parse(s))); }
  function dateShort(s) { return fmtShort.format(parse(s)).replace(/\./g, ''); }
  function uid(p) { return p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4); }

  /* ---------- Etat ---------- */
  function defaultConfig() {
    var acts = {};
    Object.keys(D.activities).forEach(function (k) {
      var a = D.activities[k];
      acts[k] = { min: a.min, max: a.max, price: a.price };
    });
    return { fleet: D.fleet, activities: acts };
  }

  function seed() {
    var t = today();
    function ago(h) { return new Date(Date.now() - h * 3600e3).toISOString(); }
    var st = { version: 1, config: defaultConfig(), closed: [addDays(t, 14)], sessions: [], requests: [] };
    function sess(id, activity, off, slot, open, status, h) {
      st.sessions.push({ id: id, activity: activity, date: addDays(t, off), slot: slot, open: open, status: status, createdAt: ago(h) });
    }
    function req(o) {
      var s = o.sessionId && st.sessions.filter(function (x) { return x.id === o.sessionId; })[0];
      st.requests.push(Object.assign({
        id: uid('r'), kind: 'sortie', email: '', note: '', level: 'Intermédiaire', role: 'createur',
        date: s ? s.date : null, slot: s ? s.slot : null, bikes: o.people
      }, o));
    }
    sess('s-volcan1', 'volcan', 5, 'journee', true, 'ouverte', 3);
    req({ sessionId: 's-volcan1', people: 2, name: 'Julie M.', phone: '0692 11 22 33', note: 'Première fois au volcan, on est motivés !', status: 'en_attente', createdAt: ago(3) });

    sess('s-maido1', 'maido', 7, 'matin', true, 'confirmee', 70);
    req({ sessionId: 's-maido1', people: 3, name: 'Thomas R.', phone: '0692 44 55 66', status: 'acceptee', createdAt: ago(70) });
    req({ sessionId: 's-maido1', people: 2, name: 'Anaïs & Paul', phone: '0693 10 20 30', role: 'rejoint', level: 'Confirmé', status: 'acceptee', createdAt: ago(40) });
    req({ sessionId: 's-maido1', people: 1, name: 'Kévin L.', phone: '0692 98 76 54', role: 'rejoint', status: 'en_attente', createdAt: ago(1) });

    sess('s-repas1', 'repas', 10, 'journee', true, 'ouverte', 26);
    req({ sessionId: 's-repas1', people: 3, name: 'Famille Hoarau', phone: '0692 33 44 55', level: 'Débutant', note: 'Un végétarien dans le groupe.', status: 'en_attente', createdAt: ago(26) });
    req({ sessionId: 's-repas1', people: 2, name: 'Sophie L.', phone: '0693 55 66 77', role: 'rejoint', status: 'en_attente', createdAt: ago(5) });

    sess('s-plages1', 'plages', 3, 'apres-midi', false, 'ouverte', 8);
    req({ sessionId: 's-plages1', people: 4, name: 'Marc D.', phone: '0692 66 77 88', level: 'Débutant', note: 'Avec 2 ados de 14 et 16 ans.', status: 'en_attente', createdAt: ago(8) });

    sess('s-volcan2', 'volcan', 16, 'journee', true, 'ouverte', 12);
    req({ sessionId: 's-volcan2', people: 1, name: 'Mathieu G.', phone: '0693 12 21 12', level: 'Confirmé', status: 'en_attente', createdAt: ago(12) });

    req({ kind: 'location', sessionId: null, date: addDays(t, 7), slot: 'matin', bikes: 3, people: 3, name: 'Nicolas B.', phone: '0692 70 80 90', status: 'acceptee', createdAt: ago(50) });
    req({ kind: 'location', sessionId: null, date: addDays(t, 7), slot: 'journee', bikes: 2, people: 2, name: 'Claire V.', phone: '0693 40 50 60', note: 'On aimerait faire les Hauts de Saint-Paul.', status: 'en_attente', createdAt: ago(2) });
    req({ kind: 'location', sessionId: null, date: addDays(t, 2), slot: 'journee', bikes: 2, people: 2, name: 'Laura P.', phone: '0692 13 14 15', status: 'acceptee', createdAt: ago(90) });
    req({ kind: 'location', sessionId: null, date: addDays(t, 12), slot: 'apres-midi', bikes: 4, people: 4, name: 'Yann T.', phone: '0693 90 91 92', status: 'en_attente', createdAt: ago(20) });
    return st;
  }

  var state;
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { state = JSON.parse(raw); if (state && state.version === 1) return; }
    } catch (e) { /* stockage indisponible : on garde la démo en mémoire */ }
    state = seed();
    persist();
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } }
  function save() {
    persist();
    document.dispatchEvent(new CustomEvent('ve:change'));
  }
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    var before = state;
    load();
    document.dispatchEvent(new CustomEvent('ve:change', { detail: { external: true, before: before } }));
  });

  /* ---------- Lecture ---------- */
  function act(id) {
    var base = D.activities[id], cfg = state.config.activities[id];
    return Object.assign({ id: id }, base, cfg);
  }
  function session(id) { return state.sessions.filter(function (s) { return s.id === id; })[0]; }
  function request(id) { return state.requests.filter(function (r) { return r.id === id; })[0]; }
  function sessionRequests(id) { return state.requests.filter(function (r) { return r.sessionId === id; }); }
  function isLive(s) { return s && s.status !== 'refusee' && s.status !== 'annulee'; }

  function stats(s) {
    var a = act(s.activity);
    var reqs = sessionRequests(s.id).filter(function (r) { return r.status !== 'refusee'; });
    var count = reqs.reduce(function (n, r) { return n + r.people; }, 0);
    var accepted = reqs.filter(function (r) { return r.status === 'acceptee'; }).reduce(function (n, r) { return n + r.people; }, 0);
    var pending = reqs.filter(function (r) { return r.status === 'en_attente'; });
    return {
      count: count, accepted: accepted, pending: pending,
      pendingPeople: pending.reduce(function (n, r) { return n + r.people; }, 0),
      min: a.min, max: a.max,
      missing: Math.max(0, a.min - count), left: Math.max(0, a.max - count), reached: count >= a.min
    };
  }
  function isPast(date) { return date < today(); }
  function joinable(s) {
    if (!isLive(s) || !s.open || isPast(s.date) || isClosed(s.date)) return false;
    return stats(s).left > 0;
  }
  function isClosed(date) { return state.closed.indexOf(date) !== -1; }
  function overlaps(a, b) { return a === 'journee' || b === 'journee' || a === b; }
  function halves(slot) { return slot === 'journee' ? ['matin', 'apres-midi'] : [slot]; }

  /* Vélos occupés sur une demi-journée. Par défaut : uniquement ce qui est validé.
     opts.pending = true ajoute les demandes en attente ; opts.exclude ignore des demandes. */
  function bikesUsed(date, half, opts) {
    opts = opts || {};
    var exclude = opts.exclude || [];
    return state.requests.reduce(function (n, r) {
      if (r.date !== date || r.status === 'refusee' || exclude.indexOf(r.id) !== -1) return n;
      if (r.status === 'en_attente' && !opts.pending) return n;
      if (r.kind === 'sortie' && !isLive(session(r.sessionId))) return n;
      if (!overlaps(r.slot, half)) return n;
      return n + r.bikes;
    }, 0);
  }
  function bikesFree(date, slot) {
    var fleet = state.config.fleet;
    return Math.min.apply(null, halves(slot).map(function (h) { return fleet - bikesUsed(date, h); }));
  }
  /* Sortie validée qui occupe déjà le guide sur ce créneau */
  function guideBusy(date, slot, exceptSession) {
    return state.sessions.filter(function (s) {
      return s.date === date && s.status === 'confirmee' && s.id !== exceptSession && overlaps(s.slot, slot);
    })[0] || null;
  }
  function sessionsOn(date, activity) {
    return state.sessions.filter(function (s) {
      return s.date === date && isLive(s) && (!activity || s.activity === activity);
    });
  }
  function openGroups(activity) {
    return state.sessions.filter(function (s) {
      return joinable(s) && (!activity || s.activity === activity);
    }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  }
  function locationPrice(slot, bikes) {
    var L = D.location;
    if (slot === 'journee') return bikes * (bikes >= L.groupeMin ? L.groupeJournee : L.journee);
    return bikes * L.demi;
  }

  /* Ce que le gérant doit savoir avant de valider un élément en attente :
     dépassement de vélos, autres demandes sur le même créneau, guide déjà pris, jour fermé. */
  function conflicts(item) {
    var out = [];
    var fleet = state.config.fleet;
    var date, slot, need, ids, selfSession = null;
    if (item.type === 'session') {
      selfSession = item.session;
      date = selfSession.date; slot = selfSession.slot;
      var pend = stats(selfSession).pending;
      need = pend.reduce(function (n, r) { return n + r.bikes; }, 0);
      ids = pend.map(function (r) { return r.id; });
    } else {
      date = item.request.date; slot = item.request.slot; need = item.request.bikes; ids = [item.request.id];
    }
    if (isClosed(date)) out.push({ level: 'warn', text: 'Jour marqué comme fermé dans vos réglages.' });

    halves(slot).forEach(function (h) {
      var used = bikesUsed(date, h);
      var detail = describeUsage(date, h, ids);
      if (used + need > fleet) {
        out.push({ level: 'danger', text: label(h) + ' : ' + (used + need) + ' vélos pour ' + fleet + ' disponibles si vous acceptez.', detail: detail });
      } else {
        var pendingOthers = bikesUsed(date, h, { pending: true, exclude: ids }) - used;
        if (pendingOthers > 0 && used + need + pendingOthers > fleet) {
          out.push({ level: 'warn', text: label(h) + ' : d\'autres demandes en attente demandent ' + pendingOthers + ' vélo(s). Impossible de tout accepter (' + (used + need + pendingOthers) + ' / ' + fleet + ').', detail: describeUsage(date, h, ids, true) });
        }
      }
    });

    if (selfSession) {
      var busy = guideBusy(date, slot, selfSession.id);
      if (busy) out.push({ level: 'danger', text: 'Vous êtes déjà en sortie ' + act(busy.activity).short + ' sur ce créneau.' });
      sessionsOn(date).forEach(function (s) {
        if (s.id === selfSession.id || s.status === 'confirmee' || !overlaps(s.slot, slot)) return;
        out.push({ level: 'warn', text: 'Autre demande de sortie ' + act(s.activity).short + ' le même jour : vous devrez choisir.' });
      });
    }
    return out;
  }
  function label(h) { return h === 'matin' ? 'Matin' : 'Après-midi'; }
  function describeUsage(date, h, excludeIds, withPending) {
    var parts = [];
    state.requests.forEach(function (r) {
      if (r.date !== date || r.status === 'refusee' || excludeIds.indexOf(r.id) !== -1) return;
      if (r.status === 'en_attente' && !withPending) return;
      if (r.kind === 'sortie' && !isLive(session(r.sessionId))) return;
      if (!overlaps(r.slot, h)) return;
      var who = r.kind === 'location' ? 'Location ' + r.name : act(session(r.sessionId).activity).short + ' (' + r.name + ')';
      parts.push(who + ' : ' + r.bikes + (r.status === 'en_attente' ? ' en attente' : ''));
    });
    return parts.join(', ');
  }

  /* ---------- Ecriture : côté client ---------- */
  function contactFields(f) {
    return {
      name: String(f.name || '').trim(), phone: String(f.phone || '').trim(),
      email: String(f.email || '').trim(), note: String(f.note || '').trim(), level: f.level || 'Intermédiaire'
    };
  }
  function proposeSession(f) {
    var a = act(f.activity);
    var slot = a.slot === 'demi' ? f.slot : a.slot;
    var s = { id: uid('s'), activity: f.activity, date: f.date, slot: slot, open: !!f.open, status: 'ouverte', createdAt: new Date().toISOString() };
    state.sessions.push(s);
    var r = Object.assign({ id: uid('r'), kind: 'sortie', sessionId: s.id, date: s.date, slot: slot, people: f.people, bikes: f.people, role: 'createur', status: 'en_attente', createdAt: s.createdAt }, contactFields(f));
    state.requests.push(r);
    save();
    return { session: s, request: r };
  }
  function joinSession(sessionId, f) {
    var s = session(sessionId);
    var r = Object.assign({ id: uid('r'), kind: 'sortie', sessionId: s.id, date: s.date, slot: s.slot, people: f.people, bikes: f.people, role: 'rejoint', status: 'en_attente', createdAt: new Date().toISOString() }, contactFields(f));
    state.requests.push(r);
    save();
    return { session: s, request: r };
  }
  function requestLocation(f) {
    var r = Object.assign({ id: uid('r'), kind: 'location', sessionId: null, date: f.date, slot: f.slot, people: f.bikes, bikes: f.bikes, role: 'createur', status: 'en_attente', createdAt: new Date().toISOString() }, contactFields(f));
    state.requests.push(r);
    save();
    return { request: r };
  }

  /* ---------- Ecriture : côté gérant ---------- */
  function snapshot() { return JSON.stringify(state); }
  function restore(snap) { state = JSON.parse(snap); save(); }
  function confirmSession(id) {
    var s = session(id); s.status = 'confirmee';
    sessionRequests(id).forEach(function (r) { if (r.status === 'en_attente') r.status = 'acceptee'; });
    save();
  }
  function refuseSession(id) {
    var s = session(id); s.status = 'refusee';
    sessionRequests(id).forEach(function (r) { if (r.status === 'en_attente') r.status = 'refusee'; });
    save();
  }
  function cancelSession(id) { session(id).status = 'annulee'; save(); }
  function setRequestStatus(id, status) { request(id).status = status; save(); }
  function toggleClosed(date) {
    var i = state.closed.indexOf(date);
    if (i === -1) state.closed.push(date); else state.closed.splice(i, 1);
    state.closed.sort();
    save();
  }
  function setFleet(n) { state.config.fleet = Math.max(1, Math.min(60, n | 0)); save(); }
  function setActivityConfig(id, key, value) {
    var c = state.config.activities[id];
    c[key] = Math.max(key === 'price' ? 0 : 1, value | 0);
    if (key === 'min' && c.min > c.max) c.max = c.min;
    if (key === 'max' && c.max < c.min) c.min = c.max;
    save();
  }
  function reset() { try { localStorage.removeItem(KEY); } catch (e) { } load(); save(); }

  /* Elément en attente = une sortie avec au moins une demande en attente, ou une location en attente */
  function pendingItems() {
    var items = [];
    state.sessions.forEach(function (s) {
      if (!isLive(s) || isPast(s.date)) return;
      var st = stats(s);
      if (st.pending.length) items.push({ type: 'session', session: s, date: s.date, createdAt: st.pending[st.pending.length - 1].createdAt });
    });
    state.requests.forEach(function (r) {
      if (r.kind === 'location' && r.status === 'en_attente' && !isPast(r.date)) items.push({ type: 'location', request: r, date: r.date, createdAt: r.createdAt });
    });
    return items.sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  load();

  window.VE = {
    get state() { return state; },
    today: today, addDays: addDays, parse: parse, iso: iso, dateLong: dateLong, dateShort: dateShort,
    act: act, session: session, request: request, sessionRequests: sessionRequests, stats: stats,
    joinable: joinable, isClosed: isClosed, isPast: isPast, overlaps: overlaps, halves: halves,
    bikesUsed: bikesUsed, bikesFree: bikesFree, guideBusy: guideBusy, sessionsOn: sessionsOn,
    openGroups: openGroups, locationPrice: locationPrice, conflicts: conflicts, pendingItems: pendingItems,
    proposeSession: proposeSession, joinSession: joinSession, requestLocation: requestLocation,
    confirmSession: confirmSession, refuseSession: refuseSession, cancelSession: cancelSession,
    setRequestStatus: setRequestStatus, toggleClosed: toggleClosed, setFleet: setFleet,
    setActivityConfig: setActivityConfig, reset: reset, snapshot: snapshot, restore: restore,
    slotLabel: function (s) { return D.slots[s] || s; }
  };
})();
