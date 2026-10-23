/* Comportements communs : en-tête, menu mobile, apparitions, galerie, groupes ouverts. */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* En-tête : opaque après le haut de page */
  var header = $('[data-header]');
  function onScroll() { if (header) header.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Menu mobile */
  var menu = $('[data-menu]');
  var opener = $('[data-menu-open]');
  function setMenu(open) {
    if (!menu) return;
    menu.classList.toggle('open', open);
    document.documentElement.style.overflow = open ? 'hidden' : '';
    if (opener) opener.setAttribute('aria-expanded', String(open));
    if (open) { var c = $('[data-menu-close]', menu); if (c) c.focus(); } else if (opener) opener.focus();
  }
  if (opener) opener.addEventListener('click', function () { setMenu(true); });
  $$('[data-menu-close]').forEach(function (b) { b.addEventListener('click', function () { setMenu(false); }); });
  if (menu) $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu && menu.classList.contains('open')) setMenu(false); });

  /* (les apparitions au défilement sont gérées par motion.js) */

  /* Visionneuse photo */
  var lb = $('[data-lightbox]');
  var items = [], index = 0, lastFocus = null;
  function show(i) {
    index = (i + items.length) % items.length;
    var it = items[index];
    var im = $('img', lb);
    im.src = it.src; im.alt = it.cap;
    $('figcaption', lb).textContent = it.cap;
  }
  function openLb(list, i) {
    items = list; lastFocus = document.activeElement;
    lb.hidden = false; lb.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    show(i); $('[data-lb-close]', lb).focus();
  }
  function closeLb() {
    lb.classList.remove('open'); lb.hidden = true; document.documentElement.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }
  if (lb) {
    $$('[data-gallery]').forEach(function (g) {
      var btns = $$('[data-lb]', g);
      var list = btns.map(function (b) { return { src: b.getAttribute('data-lb'), cap: b.getAttribute('data-cap') }; });
      btns.forEach(function (b, i) { b.addEventListener('click', function () { openLb(list, i); }); });
    });
    $('[data-lb-close]', lb).addEventListener('click', closeLb);
    $('[data-lb-prev]', lb).addEventListener('click', function () { show(index - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { show(index + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* Groupes ouverts (accueil + pages sorties) */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function svg(n) { return '<svg class="i" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function meter(st, onLight) {
    var pct = Math.min(100, st.count / st.max * 100), minPct = st.min / st.max * 100;
    return '<div class="meter' + (onLight ? ' on-light' : '') + '" role="img" aria-label="' + st.count + ' inscrits sur ' + st.max + ' places, minimum ' + st.min + '"><i class="' + (st.reached ? 'ok' : '') + '" style="width:' + pct + '%"></i><em style="left:calc(' + minPct + '% - 1px)"></em></div>';
  }
  function needText(st) {
    if (!st.reached) return 'Il manque ' + st.missing + ' pers.';
    return st.left + ' place' + (st.left > 1 ? 's' : '') + ' dispo';
  }
  function renderGroups() {
    if (!window.VE) return;
    $$('[data-open-groups]').forEach(function (box) {
      var activity = box.getAttribute('data-activity') || null;
      var limit = +box.getAttribute('data-limit') || 4;
      var mini = box.getAttribute('data-variant') === 'mini';
      var groups = VE.openGroups(activity).slice(0, limit);
      if (!groups.length) {
        box.innerHTML = mini
          ? '<p class="lead" style="margin:0">Aucun groupe ouvert pour le moment : <a class="link-arrow" href="reserver.html' + (activity ? '?sortie=' + activity : '') + '">proposez la première date ' + svg('arrow') + '</a></p>'
          : '<div class="groups-empty">Aucun groupe ouvert pour le moment. Proposez la première date !</div>';
        return;
      }
      box.innerHTML = groups.map(function (s) {
        var a = VE.act(s.activity), st = VE.stats(s);
        var href = 'reserver.html?groupe=' + encodeURIComponent(s.id);
        var status = s.status === 'confirmee' ? 'Sortie confirmée' : 'En attente de validation';
        if (mini) {
          return '<a class="mini-group" href="' + href + '"><div><b>' + esc(VE.dateLong(s.date)) + '</b><br><small>' + st.count + ' inscrit' + (st.count > 1 ? 's' : '') + ' · min ' + st.min + ' · ' + status + '</small>' + meter(st, true) + '</div><span class="badge-need' + (st.reached ? ' ok' : '') + '">' + needText(st) + '</span></a>';
        }
        return '<a class="group-card" href="' + href + '"><img src="assets/img/' + a.img + '-480.webp" alt="" width="64" height="64" loading="lazy">' +
          '<div><div class="gc-top"><b>' + esc(a.short) + '</b><span class="gc-date">' + esc(VE.dateShort(s.date)) + '</span></div>' +
          meter(st) +
          '<div class="gc-foot"><span class="need' + (st.reached ? ' ok' : '') + '">' + svg(st.reached ? 'check' : 'user-plus') + needText(st) + '</span><span>' + st.count + '/' + st.max + ' · Rejoindre</span></div></div></a>';
      }).join('');
    });
    $$('[data-act-min]').forEach(function (el) { el.textContent = VE.act(el.getAttribute('data-act-min')).min; });
  }
  renderGroups();
  document.addEventListener('ve:change', renderGroups);
  window.VE_UI = { esc: esc, svg: svg, meter: meter, needText: needText };

  /* Formulaire de contact : ouvre la messagerie avec le message pré-rempli */
  $$('form[data-mailto]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(f);
      var body = [d.get('message'), '', '—', d.get('name'), d.get('phone'), d.get('email')].filter(function (x) { return x !== null; }).join('\n');
      window.location.href = 'mailto:' + f.getAttribute('data-mailto') + '?subject=' + encodeURIComponent('[Site] ' + d.get('subject') + ' – ' + d.get('name')) + '&body=' + encodeURIComponent(body);
    });
  });
})();
