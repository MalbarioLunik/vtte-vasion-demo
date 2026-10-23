/* Calendrier de réservation côté client */
(function () {
  'use strict';
  var root = document.querySelector('[data-booking]');
  if (!root || !window.VE) return;
  var D = window.VE_DATA, U = window.VE_UI;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var esc = U.esc, svg = U.svg;
  var ACT_IDS = Object.keys(D.activities);
  var MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  var LEVELS = ['Débutant', 'Intermédiaire', 'Confirmé'];
  var euro = function (n) { return n.toLocaleString('fr-FR') + ' €'; };
  var plural = function (n, w) { return n + ' ' + w + (n > 1 ? 's' : ''); };

  var now = VE.parse(VE.today());
  var ui = { mode: 'sortie', activity: 'maido', month: new Date(now.getFullYear(), now.getMonth(), 1), selected: null };
  var minMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  var maxMonth = new Date(now.getFullYear(), now.getMonth() + 6, 1);

  var el = {
    tabs: root.querySelectorAll('[data-mode]'), acts: $('[data-acts]', root), info: $('[data-actinfo]', root),
    groups: $('[data-bk-groups]', root), title: $('[data-cal-title]', root), grid: $('[data-cal-grid]', root),
    prev: $('[data-cal-prev]', root), next: $('[data-cal-next]', root), legend: $('[data-cal-legend]', root),
    day: $('[data-day]', root), sheet: $('[data-sheet]')
  };

  /* ---------- Lecture d'un jour ---------- */
  function slotsFor(a) { return a.slot === 'demi' ? ['matin', 'apres-midi'] : [a.slot]; }
  function freeSlots(date, a) {
    // créneaux où le guide n'est pas déjà pris par une sortie validée
    return slotsFor(a).filter(function (sl) { return !VE.guideBusy(date, sl); });
  }
  function dayInfoSortie(date) {
    var a = VE.act(ui.activity);
    var sessions = VE.sessionsOn(date, a.id);
    var joinable = sessions.filter(VE.joinable);
    var fullConfirmed = sessions.filter(function (s) { return s.status === 'confirmee' && !VE.joinable(s); });
    var free = freeSlots(date, a);
    var taker = free.length ? null : VE.guideBusy(date, slotsFor(a)[0]);
    // guideTaken : plus de créneau libre ; busy : pris par une AUTRE sortie (sinon on propose de rejoindre)
    return {
      a: a, joinable: joinable, fullConfirmed: fullConfirmed, free: free, guideTaken: !free.length,
      busy: taker && taker.activity !== a.id ? taker : null, closed: VE.isClosed(date), past: VE.isPast(date)
    };
  }
  function bikesHalf(date) {
    var fleet = VE.state.config.fleet;
    return { matin: fleet - VE.bikesUsed(date, 'matin'), 'apres-midi': fleet - VE.bikesUsed(date, 'apres-midi'), fleet: fleet };
  }

  /* ---------- Rendu ---------- */
  function renderTabs() {
    Array.prototype.forEach.call(el.tabs, function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-mode') === ui.mode)); });
    el.acts.hidden = ui.mode !== 'sortie';
  }
  function renderActs() {
    el.acts.innerHTML = ACT_IDS.map(function (id) {
      var a = VE.act(id);
      return '<button type="button" class="act-chip" role="radio" aria-checked="' + (id === ui.activity) + '" data-act="' + id + '">' +
        '<img src="assets/img/' + a.img + '-480.webp" alt="" width="38" height="38">' +
        '<span>' + esc(a.short) + '<small>' + euro(a.price) + ' / pers.</small></span></button>';
    }).join('');
  }
  function renderInfo() {
    if (ui.mode === 'location') {
      var L = D.location;
      el.info.innerHTML = '<span>' + svg('sunrise') + ' Demi-journée ' + euro(L.demi) + '</span><span>' + svg('sun') + ' Journée ' + euro(L.journee) + '</span><span>' + svg('users') + ' ' + euro(L.groupeJournee) + '/vélo dès ' + L.groupeMin + ' vélos</span><a href="location-e-vtt.html">Détails ›</a>';
      return;
    }
    var a = VE.act(ui.activity);
    el.info.innerHTML = '<span>' + svg('clock') + ' ' + esc(a.timing) + '</span><span>' + svg('bike') + ' ' + esc(a.level) + '</span>' +
      '<span class="min">' + svg('users') + ' Min ' + a.min + ' · max ' + a.max + ' pers.</span><a href="' + a.page + '">Voir la fiche ›</a>';
  }
  function renderGroups() {
    if (ui.mode !== 'sortie') { el.groups.innerHTML = ''; return; }
    var list = VE.openGroups(ui.activity);
    if (!list.length) { el.groups.innerHTML = ''; return; }
    el.groups.innerHTML = '<h3>' + svg('user-plus') + ' Groupes à compléter (' + list.length + ')</h3><div class="og-list">' + list.map(function (s) {
      var st = VE.stats(s);
      return '<button type="button" class="og' + (st.reached ? ' ok' : '') + '" data-og="' + s.id + '">' +
        '<b>' + esc(VE.dateShort(s.date)) + '</b><span>' + st.count + ' inscrit' + (st.count > 1 ? 's' : '') + ' · ' + (s.status === 'confirmee' ? 'confirmée' : 'en attente') + '</span>' +
        U.meter(st, true) + '<span class="need">' + U.needText(st) + ' · Rejoindre</span></button>';
    }).join('') + '</div>';
  }
  function renderCalendar() {
    var y = ui.month.getFullYear(), m = ui.month.getMonth();
    el.title.textContent = MONTHS[m] + ' ' + y;
    el.prev.disabled = ui.month <= minMonth;
    el.next.disabled = ui.month >= maxMonth;
    var first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    var offset = (first.getDay() + 6) % 7; // lundi en premier
    var start = 1;
    // mois en cours : on masque les semaines déjà passées (calendrier plus court sur téléphone)
    if (y === now.getFullYear() && m === now.getMonth()) {
      var monday = now.getDate() - (now.getDay() + 6) % 7;
      if (monday > 1) { start = monday; offset = 0; }
    }
    var html = '';
    for (var i = 0; i < offset; i++) html += '<span class="day is-empty" aria-hidden="true"></span>';
    var today = VE.today();
    for (var d = start; d <= days; d++) {
      var date = VE.iso(new Date(y, m, d));
      var cls = ['day'], marks = [], label = VE.dateLong(date);
      var past = VE.isPast(date), closed = VE.isClosed(date);
      if (past) cls.push('is-past');
      if (date === today) cls.push('is-today');
      if (closed && !past) { cls.push('is-closed'); label += ', fermé'; }
      if (!past && !closed) {
        if (ui.mode === 'sortie') {
          var info = dayInfoSortie(date);
          info.joinable.slice(0, 2).forEach(function (s) {
            var st = VE.stats(s);
            if (!st.reached) { marks.push('<span class="mk need">−' + st.missing + '</span>'); label += ', groupe ouvert, il manque ' + st.missing + ' personne' + (st.missing > 1 ? 's' : ''); }
            else { marks.push('<span class="mk ' + (s.status === 'confirmee' ? 'open' : 'wait') + '">' + st.left + ' pl.</span>'); label += ', ' + plural(st.left, 'place') + ' dans un groupe'; }
          });
          if (!info.joinable.length && (info.fullConfirmed.length || info.guideTaken)) { marks.push('<span class="mk busy">pris</span>'); label += ', guide déjà pris'; }
        } else {
          var b = bikesHalf(date), best = Math.max(b.matin, b['apres-midi']), worst = Math.min(b.matin, b['apres-midi']);
          var k = best <= 0 ? 'b-none' : worst < 3 ? 'b-low' : 'b-ok';
          marks.push('<span class="mk ' + k + '">' + Math.max(0, best) + '</span>');
          label += ', ' + Math.max(0, best) + ' vélos libres';
        }
      }
      html += '<button type="button" class="' + cls.join(' ') + '" data-date="' + date + '" aria-label="' + esc(label) + '"' +
        (past ? ' disabled' : '') + ' aria-selected="' + (ui.selected === date) + '"><span class="num">' + d + '</span><span class="marks">' + marks.join('') + '</span></button>';
    }
    el.grid.innerHTML = html;
    el.legend.innerHTML = ui.mode === 'sortie'
      ? '<span><i class="mk need">−2</i> Il manque des participants</span><span><i class="mk wait">3 pl.</i> Minimum atteint</span><span><i class="mk open">3 pl.</i> Sortie confirmée</span><span><i class="mk busy">pris</i> Guide indisponible</span>'
      : '<span><i class="mk b-ok">8</i> Vélos libres</span><span><i class="mk b-low">2</i> Peu de vélos</span><span><i class="mk b-none">0</i> Complet</span>';
  }

  function renderDay() {
    var date = ui.selected;
    if (!date) {
      el.day.innerHTML = '<div class="day-empty"><span class="big-ic">' + svg('cal') + '</span><b style="color:var(--text)">Choisissez une date</b><p style="margin:0">' +
        (ui.mode === 'sortie' ? 'Touchez un jour du calendrier pour voir les groupes déjà formés ou proposer votre sortie.' : 'Touchez un jour du calendrier pour voir les vélos disponibles.') + '</p></div>';
      return;
    }
    var h = '<h3 class="day-title">' + esc(VE.dateLong(date)) + '</h3>';
    if (ui.mode === 'location') {
      var b = bikesHalf(date);
      h += '<p class="day-sub">Location E-VTT · ' + b.fleet + ' vélos dans la flotte</p>';
      if (VE.isClosed(date)) h += notice('danger', 'alert', 'Fermé ce jour-là. Choisissez une autre date ou appelez le ' + D.contact.locationTelLabel + '.');
      h += '<div class="slots">' + ['matin', 'apres-midi'].map(function (sl) {
        var free = Math.max(0, b[sl]), pct = free / b.fleet * 100;
        return '<div class="slot-row"><b>' + VE.slotLabel(sl) + '</b><span>' + plural(free, 'vélo') + ' libre' + (free > 1 ? 's' : '') + '</span><div class="meter"><i class="' + (free === 0 ? 'none' : free < 3 ? 'low' : '') + '" style="width:' + pct + '%"></i></div></div>';
      }).join('') + '</div>';
      if (!VE.isClosed(date)) h += '<button type="button" class="btn btn-volt btn-block" data-open-loc>' + svg('bike') + ' Réserver des vélos ce jour</button>';
      el.day.innerHTML = h;
      return;
    }
    var info = dayInfoSortie(date), a = info.a;
    h += '<p class="day-sub">' + esc(a.name) + ' · ' + esc(a.timing) + '</p><div class="day-stack">';
    if (info.closed) {
      h += notice('danger', 'alert', 'Lucas n’est pas disponible ce jour-là. Choisissez une autre date.');
    }
    info.joinable.forEach(function (s) {
      var st = VE.stats(s);
      var cls = s.status === 'confirmee' ? 'confirmed' : st.reached ? 'ready' : 'forming';
      var lbl = s.status === 'confirmee' ? 'Confirmée' : st.reached ? 'Minimum atteint' : 'Il manque ' + st.missing + ' pers.';
      var lvl = VE.sessionRequests(s.id)[0];
      h += '<div class="sess-card"><header><b>Groupe de ' + st.count + ' pers.</b><span class="status ' + cls + '">' + lbl + '</span></header>' +
        U.meter(st, true) +
        '<p>' + (lvl ? 'Niveau ' + esc(lvl.level.toLowerCase()) + ' · ' : '') + (s.status === 'confirmee' ? 'Sortie validée par Lucas' : 'En attente de validation par Lucas') + ' · ' + plural(st.left, 'place') + ' restante' + (st.left > 1 ? 's' : '') + '</p>' +
        '<button type="button" class="btn btn-volt btn-block" data-join="' + s.id + '">' + svg('user-plus') + ' Rejoindre ce groupe</button></div>';
    });
    info.fullConfirmed.forEach(function () {
      h += '<div class="sess-card"><header><b>Sortie ' + esc(a.short) + '</b><span class="status full">Complet</span></header><p>Ce groupe est complet ou privé.</p></div>';
    });
    if (info.busy) {
      h += notice('', 'info', 'Lucas est déjà en sortie ' + esc(VE.act(info.busy.activity).short) + ' ce jour-là. Choisissez une autre date ou une autre sortie.');
    } else if (a.slot === 'demi' && info.free.length === 1) {
      h += notice('info', 'info', 'Seul le créneau ' + VE.slotLabel(info.free[0]).toLowerCase() + ' est encore libre ce jour-là.');
    }
    var canPropose = !info.closed && !info.guideTaken;
    if (canPropose) {
      if (info.joinable.length || info.fullConfirmed.length) h += '<div class="or">ou</div>';
      h += '<button type="button" class="btn ' + (info.joinable.length ? 'btn-line' : 'btn-volt') + ' btn-block" data-propose>' + svg('plus') + ' Proposer ' + (info.joinable.length ? 'un autre groupe' : 'une sortie ' + esc(a.short) + ' ce jour') + '</button>' +
        '<p style="margin:2px 0 0;font-size:.82rem;color:var(--muted)">Minimum ' + a.min + ' participants. Moins nombreux ? Votre groupe restera ouvert pour être complété.</p>';
    }
    h += '</div>';
    el.day.innerHTML = h;
  }
  function notice(kind, icon, text) { return '<div class="notice ' + kind + '">' + svg(icon) + '<span>' + text + '</span></div>'; }

  function renderAll() { renderTabs(); renderActs(); renderInfo(); renderGroups(); renderCalendar(); renderDay(); }

  /* ---------- Interactions ---------- */
  Array.prototype.forEach.call(el.tabs, function (b) {
    b.addEventListener('click', function () { ui.mode = b.getAttribute('data-mode'); renderAll(); });
  });
  el.acts.addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]'); if (!b) return;
    ui.activity = b.getAttribute('data-act'); renderAll();
  });
  el.groups.addEventListener('click', function (e) {
    var b = e.target.closest('[data-og]'); if (!b) return;
    focusSession(b.getAttribute('data-og'), true);
  });
  el.prev.addEventListener('click', function () { ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() - 1, 1); renderCalendar(); });
  el.next.addEventListener('click', function () { ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() + 1, 1); renderCalendar(); });
  el.grid.addEventListener('click', function (e) {
    var b = e.target.closest('[data-date]'); if (!b || b.disabled) return;
    ui.selected = b.getAttribute('data-date');
    renderCalendar(); renderDay();
    if (window.innerWidth < 1024) el.day.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  el.day.addEventListener('click', function (e) {
    var j = e.target.closest('[data-join]'); if (j) return openJoin(j.getAttribute('data-join'));
    if (e.target.closest('[data-propose]')) return openPropose(ui.selected);
    if (e.target.closest('[data-open-loc]')) return openLocation(ui.selected);
  });
  document.addEventListener('ve:change', function () { renderAll(); });

  function focusSession(id, openSheet) {
    var s = VE.session(id); if (!s) return false;
    ui.mode = 'sortie'; ui.activity = s.activity; ui.selected = s.date;
    var d = VE.parse(s.date); ui.month = new Date(d.getFullYear(), d.getMonth(), 1);
    renderAll();
    if (openSheet && VE.joinable(s)) openJoin(id);
    return true;
  }

  /* ---------- Feuille de réservation ---------- */
  function contactFields() {
    return '<div class="field"><span class="label">Votre niveau</span><div class="seg">' + LEVELS.map(function (l, i) {
      return '<label><input type="radio" name="level" value="' + l + '"' + (i === 1 ? ' checked' : '') + '><span>' + l + '</span></label>';
    }).join('') + '</div></div>' +
      '<div class="field"><label for="f-name">Nom et prénom</label><input id="f-name" name="name" autocomplete="name" required></div>' +
      '<div class="two"><div class="field"><label for="f-phone">Téléphone</label><input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="0692 …"></div>' +
      '<div class="field"><label for="f-email">Email <span style="font-weight:600;color:var(--muted)">(facultatif)</span></label><input id="f-email" name="email" type="email" autocomplete="email"></div></div>' +
      '<div class="field"><label for="f-note">Message <span style="font-weight:600;color:var(--muted)">(facultatif)</span></label><textarea id="f-note" name="note" rows="3" placeholder="Âge des enfants, allergies, questions…"></textarea></div>';
  }
  function insurance() {
    return '<label class="check"><input type="checkbox" name="rc" required><span>J’ai une assurance <b>Responsabilité Civile</b> pour les activités de plein air (obligatoire pour participer).</span></label>';
  }
  function stepper(name, value, min, max, label) {
    return '<div class="field"><span class="label">' + label + '</span><div class="row-between"><div class="stepper" data-stepper data-min="' + min + '" data-max="' + max + '">' +
      '<button type="button" data-step="-1" aria-label="Moins">' + svg('minus') + '</button><output name="' + name + '" aria-live="polite">' + value + '</output>' +
      '<button type="button" data-step="1" aria-label="Plus">' + svg('plus') + '</button></div><span class="hint" data-step-hint></span></div></div>';
  }
  function sheetShell(o) {
    return '<form novalidate>' +
      '<div class="sheet-head"><span class="eyebrow">' + o.eyebrow + '</span><h2 id="sheet-title">' + o.title + '</h2><p>' + o.sub + '</p>' +
      '<button type="button" class="sheet-close" data-close aria-label="Fermer">' + svg('x') + '</button></div>' +
      '<div class="sheet-body">' + o.body + '</div>' +
      '<div class="sheet-foot"><div class="total"><span data-total-label></span><b data-total></b></div>' +
      '<button class="btn btn-volt btn-block" type="submit">' + o.submit + '</button></div></form>';
  }
  function openSheet(html, setup) {
    el.sheet.innerHTML = html;
    var form = $('form', el.sheet);
    $('[data-close]', el.sheet).addEventListener('click', closeSheet);
    form.querySelectorAll('[data-stepper]').forEach(function (st) {
      st.addEventListener('click', function (e) {
        var b = e.target.closest('[data-step]'); if (!b) return;
        var out = $('output', st), v = +out.value + +b.getAttribute('data-step');
        v = Math.max(+st.getAttribute('data-min'), Math.min(+st.getAttribute('data-max'), v));
        out.value = v; form.dispatchEvent(new Event('input'));
      });
    });
    if (typeof el.sheet.showModal === 'function') el.sheet.showModal(); else el.sheet.setAttribute('open', '');
    setup(form);
    form.dispatchEvent(new Event('input'));
  }
  function closeSheet() { if (el.sheet.open) { if (el.sheet.close) el.sheet.close(); else el.sheet.removeAttribute('open'); } }
  el.sheet.addEventListener('click', function (e) { if (e.target === el.sheet) closeSheet(); });
  function syncSteppers(form) {
    form.querySelectorAll('[data-stepper]').forEach(function (st) {
      var v = +$('output', st).value, bs = st.querySelectorAll('[data-step]');
      bs[0].disabled = v <= +st.getAttribute('data-min'); bs[1].disabled = v >= +st.getAttribute('data-max');
    });
  }
  function read(form) {
    var fd = new FormData(form), o = {};
    fd.forEach(function (v, k) { o[k] = v; });
    form.querySelectorAll('output[name]').forEach(function (out) { o[out.getAttribute('name')] = +out.value; });
    return o;
  }
  function validate(form) {
    if (form.checkValidity()) return true;
    form.reportValidity();
    return false;
  }

  function openPropose(date) {
    var a = VE.act(ui.activity), free = freeSlots(date, a);
    var slotField = a.slot === 'demi' ? '<div class="field"><span class="label">Créneau</span><div class="seg">' + ['matin', 'apres-midi'].map(function (sl) {
      var ok = free.indexOf(sl) !== -1;
      return '<label><input type="radio" name="slot" value="' + sl + '"' + (ok ? '' : ' disabled') + (ok && sl === free[0] ? ' checked' : '') + '><span>' + VE.slotLabel(sl) + (ok ? '' : ' <small>pris</small>') + '</span></label>';
    }).join('') + '</div></div>' : '';
    openSheet(sheetShell({
      eyebrow: 'Nouvelle sortie', title: esc(a.name), sub: esc(VE.dateLong(date)) + ' · ' + esc(a.timing),
      body: slotField + stepper('people', Math.min(2, a.max), 1, a.max, 'Nombre de participants') +
        '<div data-mininfo></div>' + contactFields() + insurance(),
      submit: svg('check') + ' Envoyer ma demande'
    }), function (form) {
      form.addEventListener('input', function () {
        syncSteppers(form);
        var v = read(form), n = v.people, box = $('[data-mininfo]', form);
        if (n < a.min) {
          var miss = a.min - n;
          box.innerHTML = '<div class="notice">' + svg('users') + '<span><b>Il manquera ' + plural(miss, 'personne') + '</b> pour atteindre le minimum de ' + a.min + '. Votre groupe apparaîtra dans le calendrier pour que d’autres riders le complètent.</span></div>' +
            '<label class="check locked" style="margin-top:10px"><input type="checkbox" name="open" checked disabled><span>Groupe ouvert à d’autres participants</span></label>';
        } else if (n < a.max) {
          var keep = box.querySelector('input[name=open]:not([disabled])');
          var checked = keep ? keep.checked : true;
          box.innerHTML = '<div class="notice info">' + svg('check') + '<span>Minimum atteint ! Lucas pourra confirmer directement votre sortie.</span></div>' +
            '<label class="check" style="margin-top:10px"><input type="checkbox" name="open"' + (checked ? ' checked' : '') + '><span>Ouvrir les ' + plural(a.max - n, 'place') + ' restante' + (a.max - n > 1 ? 's' : '') + ' à d’autres participants</span></label>';
        } else {
          box.innerHTML = '<div class="notice info">' + svg('check') + '<span>Groupe complet (' + a.max + ' pers. max).</span></div>';
        }
        $('[data-step-hint]', form).textContent = 'min ' + a.min + ' · max ' + a.max;
        $('[data-total-label]', form).textContent = 'Total estimé · ' + n + ' × ' + euro(a.price);
        $('[data-total]', form).textContent = euro(n * a.price);
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(form)) return;
        var v = read(form);
        var open = v.people < a.min ? true : !!form.querySelector('input[name=open]:checked');
        var res = VE.proposeSession({ activity: a.id, date: date, slot: v.slot, open: open, people: v.people, level: v.level, name: v.name, phone: v.phone, email: v.email, note: v.note });
        success({ title: a.name, date: date, people: v.people, total: v.people * a.price, session: res.session });
      });
    });
  }

  function openJoin(sessionId) {
    var s = VE.session(sessionId), a = VE.act(s.activity), st = VE.stats(s);
    openSheet(sheetShell({
      eyebrow: 'Rejoindre un groupe', title: esc(a.name), sub: esc(VE.dateLong(s.date)) + ' · ' + esc(VE.slotLabel(s.slot)),
      body: '<div class="sess-card"><header><b>' + plural(st.count, 'inscrit') + ' · min ' + st.min + ' · max ' + st.max + '</b><span class="status ' + (s.status === 'confirmee' ? 'confirmed' : st.reached ? 'ready' : 'forming') + '">' + (s.status === 'confirmee' ? 'Confirmée' : st.reached ? 'Minimum atteint' : 'Il manque ' + st.missing) + '</span></header>' + U.meter(st, true) + '</div>' +
        stepper('people', 1, 1, st.left, 'Combien êtes-vous ?') + '<div data-mininfo></div>' + contactFields() + insurance(),
      submit: svg('user-plus') + ' Rejoindre le groupe'
    }), function (form) {
      form.addEventListener('input', function () {
        syncSteppers(form);
        var n = read(form).people, total = st.count + n, box = $('[data-mininfo]', form);
        box.innerHTML = total >= st.min
          ? '<div class="notice info">' + svg('check') + '<span>Avec vous : <b>' + total + '/' + st.max + '</b>. ' + (st.reached ? 'Le minimum est déjà atteint.' : 'Vous complétez le groupe : le minimum est atteint !') + '</span></div>'
          : '<div class="notice">' + svg('users') + '<span>Avec vous : <b>' + total + '/' + st.min + '</b> minimum. Il manquera encore ' + plural(st.min - total, 'personne') + '.</span></div>';
        $('[data-step-hint]', form).textContent = plural(st.left, 'place') + ' restante' + (st.left > 1 ? 's' : '');
        $('[data-total-label]', form).textContent = 'Total estimé · ' + n + ' × ' + euro(a.price);
        $('[data-total]', form).textContent = euro(n * a.price);
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(form)) return;
        var v = read(form);
        VE.joinSession(s.id, { people: v.people, level: v.level, name: v.name, phone: v.phone, email: v.email, note: v.note });
        success({ title: a.name, date: s.date, people: v.people, total: v.people * a.price, session: s, joined: true });
      });
    });
  }

  function openLocation(date) {
    var b = bikesHalf(date), L = D.location;
    function freeFor(sl) { return Math.max(0, sl === 'journee' ? Math.min(b.matin, b['apres-midi']) : b[sl]); }
    // créneau proposé par défaut : la journée si possible, sinon la demi-journée la plus libre
    var def = ['journee', 'matin', 'apres-midi'].filter(function (sl) { return freeFor(sl) > 0; })[0] || 'journee';
    openSheet(sheetShell({
      eyebrow: 'Location E-VTT', title: 'Réserver des vélos', sub: esc(VE.dateLong(date)) + ' · départ La Saline-les-Bains',
      body: '<div class="field"><span class="label">Durée</span><div class="seg">' + [['matin', 'Matin', L.demi], ['apres-midi', 'Après-midi', L.demi], ['journee', 'Journée', L.journee]].map(function (o) {
        var f = freeFor(o[0]);
        return '<label><input type="radio" name="slot" value="' + o[0] + '"' + (o[0] === def ? ' checked' : '') + '><span>' + o[1] + ' <small>' + (f ? f + ' libre' + (f > 1 ? 's' : '') : 'complet') + '</small></span></label>';
      }).join('') + '</div></div>' +
        stepper('bikes', 2, 1, b.fleet, 'Nombre de vélos') + '<div data-mininfo></div>' + contactFields(),
      submit: svg('check') + ' Envoyer ma demande'
    }), function (form) {
      form.addEventListener('input', function () {
        syncSteppers(form);
        var v = read(form), free = freeFor(v.slot), box = $('[data-mininfo]', form);
        box.innerHTML = v.bikes <= free
          ? '<div class="notice info">' + svg('check') + '<span>' + plural(free, 'vélo') + ' libre' + (free > 1 ? 's' : '') + ' sur ce créneau.</span></div>'
          : '<div class="notice danger">' + svg('alert') + '<span>' + (free ? 'Seulement ' + plural(free, 'vélo') + ' libre' + (free > 1 ? 's' : '') : 'Plus aucun vélo libre') + ' sur ce créneau. Envoyez quand même votre demande : Lucas vous proposera une solution (autre créneau, autre date…).</span></div>';
        var unit = v.slot === 'journee' ? (v.bikes >= L.groupeMin ? L.groupeJournee : L.journee) : L.demi;
        $('[data-step-hint]', form).textContent = v.slot === 'journee' && v.bikes >= L.groupeMin ? 'tarif groupe appliqué' : '';
        $('[data-total-label]', form).textContent = 'Total estimé · ' + v.bikes + ' × ' + euro(unit);
        $('[data-total]', form).textContent = euro(VE.locationPrice(v.slot, v.bikes));
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!validate(form)) return;
        var v = read(form);
        VE.requestLocation({ date: date, slot: v.slot, bikes: v.bikes, level: v.level, name: v.name, phone: v.phone, email: v.email, note: v.note });
        success({ title: 'Location E-VTT · ' + VE.slotLabel(v.slot), date: date, bikes: v.bikes, total: VE.locationPrice(v.slot, v.bikes) });
      });
    });
  }

  function success(o) {
    var share = '';
    if (o.session) {
      var st = VE.stats(VE.session(o.session.id));
      if (o.session.open && !st.reached) {
        share = '<div class="share-box"><span><b>Il manque encore ' + plural(st.missing, 'personne') + '.</b> Partagez le lien de votre groupe à vos amis pour le compléter plus vite.</span>' +
          '<button type="button" class="btn btn-dark btn-block" data-share="' + o.session.id + '">' + svg('share') + ' Partager mon groupe</button></div>';
      }
    }
    el.sheet.innerHTML = '<form method="dialog"><div class="sheet-head"><span class="eyebrow">' + (o.joined ? 'Groupe rejoint' : 'Demande envoyée') + '</span><h2 id="sheet-title">C’est noté&nbsp;!</h2><p>Lucas reçoit votre demande sur son téléphone.</p><button type="button" class="sheet-close" data-close aria-label="Fermer">' + svg('x') + '</button></div>' +
      '<div class="sheet-body"><div class="success"><span class="big-ic">' + svg('check') + '</span>' +
      '<p style="margin:0">Il valide la ' + (o.bikes ? 'location' : 'sortie') + ' et vous recontacte par téléphone ou SMS pour confirmer.</p>' +
      '<div class="recap"><div><span>' + (o.bikes ? 'Location' : 'Sortie') + '</span><b>' + esc(o.title) + '</b></div><div><span>Date</span><b>' + esc(VE.dateLong(o.date)) + '</b></div>' +
      '<div><span>' + (o.bikes ? 'Vélos' : 'Participants') + '</span><b>' + (o.bikes || o.people) + '</b></div><div><span>Total estimé</span><b>' + euro(o.total) + '</b></div></div>' + share +
      '<a class="btn btn-line btn-block" href="gerant.html">' + svg('phonebox') + ' Voir la demande côté gérant (démo)</a></div></div>' +
      '<div class="sheet-foot"><button class="btn btn-volt btn-block" type="submit">Terminer</button></div></form>';
    $('[data-close]', el.sheet).addEventListener('click', closeSheet);
    var sb = $('[data-share]', el.sheet);
    if (sb) sb.addEventListener('click', function () {
      var url = location.origin + location.pathname + '?groupe=' + encodeURIComponent(sb.getAttribute('data-share'));
      var text = 'Rejoins notre sortie ' + o.title + ' le ' + VE.dateLong(o.date) + ' avec VTT É-vasion !';
      if (navigator.share) navigator.share({ title: 'VTT É-vasion', text: text, url: url }).catch(function () { });
      else if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(function () { sb.innerHTML = svg('copy') + ' Lien copié !'; });
    });
    ui.selected = o.date;
    renderAll();
  }

  /* ---------- Démarrage ---------- */
  var q = new URLSearchParams(location.search);
  if (q.get('type') === 'location') ui.mode = 'location';
  if (q.get('sortie') && D.activities[q.get('sortie')]) ui.activity = q.get('sortie');
  if (!(q.get('groupe') && focusSession(q.get('groupe'), true))) renderAll();
})();
