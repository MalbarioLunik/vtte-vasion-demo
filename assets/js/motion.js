/* Animations : entrées des héros, apparitions au défilement, compteurs, parallaxe,
   tracé du parcours, inclinaison des cartes, barre de progression, en-tête rétractable.
   Tout passe par transform/opacity ; rien ne tourne si l'utilisateur a demandé moins d'animations. */
(function () {
  'use strict';
  var root = document.documentElement;
  window.__motion = true;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) {
    root.classList.remove('js-motion');
    $$('.reveal').forEach(function (el) { el.classList.add('in'); });
    return;
  }

  function whenIntro(fn) {
    if (window.__introDone || !root.classList.contains('has-loader')) fn();
    else document.addEventListener('ve:intro', fn, { once: true });
  }

  /* ---------- Diaporama du héros : on ne passe à une photo que si elle est chargée ---------- */
  var slides = $$('.hero-media > picture, .hero-media > img');
  if (slides.length > 1) {
    var cur = Math.max(0, slides.findIndex(function (s) { return s.classList.contains('is-active'); }));
    var imgOf = function (s) { return s.tagName === 'IMG' ? s : $('img', s); };
    var loaded = function (s) { var i = imgOf(s); return i.complete && i.naturalWidth > 0; };
    // les photos suivantes se chargent en arrière-plan une fois la première affichée
    var warm = function () { slides.forEach(function (s, k) { if (k !== cur) { var i = imgOf(s); i.loading = 'eager'; i.fetchPriority = 'low'; } }); };
    var first = imgOf(slides[cur]);
    if (loaded(slides[cur])) setTimeout(warm, 800); else first.addEventListener('load', function () { setTimeout(warm, 500); }, { once: true });
    setInterval(function () {
      if (document.hidden) return;
      for (var k = 1; k < slides.length; k++) {
        var n = (cur + k) % slides.length;
        if (loaded(slides[n])) { slides[cur].classList.remove('is-active'); slides[n].classList.add('is-active'); cur = n; return; }
      }
    }, 6000);
  }

  /* ---------- Héros : titre mot à mot puis le reste en cascade ---------- */
  function splitWords(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement('span');
            w.className = 'w'; w.textContent = part; w.style.setProperty('--w', n++);
            frag.appendChild(w);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
    return n;
  }
  $$('.hero, .page-hero').forEach(function (hero) {
    var h1 = $('h1', hero);
    var words = h1 ? splitWords(h1) : 0;
    var t = 0.25 + words * 0.07;
    $$('.crumbs, .eyebrow', hero).forEach(function (el) { el.style.setProperty('--d', '0s'); });
    $$('.lead, .post-meta, .btn-row, .chips, .steps > li, .hero-stats > div', hero).forEach(function (el, i) {
      el.style.setProperty('--d', (t + i * 0.1).toFixed(2) + 's');
    });
    // après l'écran de chargement s'il est affiché
    whenIntro(function () { requestAnimationFrame(function () { hero.classList.add('ready'); }); });
  });

  /* ---------- Apparitions au défilement (cascade par lot visible) ---------- */
  var GROUPS = '.section-head, .rail, .posts, .highlights, .infos, .prices, .photo-grid, .masonry, .checks, .groups-list, .mini-groups, .faq, .contact-cards, .cta-phones, .fc-text, .foot-grid, .facts, .og-list, .day-stack';
  var SINGLES = '.reveal, .media-frame, .stack-img, .sheet-card, .min-note, .post-cta, .prose > *, .split > div > h2, .bk-main, .bk-day, .demo-note, .trail';
  var io = new IntersectionObserver(function (entries) {
    var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
    batch.sort(function (a, b) { return a.compareDocumentPosition(b) & 4 ? -1 : 1; });
    batch.forEach(function (el, k) {
      io.unobserve(el);
      el.style.transitionDelay = (Math.min(k, 7) * 0.09) + 's';
      el.classList.add('in');
      setTimeout(function () { el.style.transitionDelay = ''; }, 1400 + k * 90);
      count(el);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.12 });
  function scan() {
    $$(GROUPS).forEach(function (g) { Array.prototype.forEach.call(g.children, watch); });
    $$(SINGLES).forEach(watch);
  }
  function watch(el) {
    if (el.__seen || el.closest('.hero, .page-hero')) return;
    el.__seen = true;
    io.observe(el);
  }
  scan();
  // contenus rendus après coup (groupes ouverts, calendrier…)
  var pending = false;
  new MutationObserver(function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; scan(); });
  }).observe(document.body, { childList: true, subtree: true });

  /* ---------- Compteurs ---------- */
  var COUNT = '.hero-stats b, .fact b, .price-card .amount, .media-badge b';
  function prepare(el) {
    if (el.__count) return;
    var node = null;
    (function find(n) {
      for (var i = 0; i < n.childNodes.length && !node; i++) {
        var c = n.childNodes[i];
        if (c.nodeType === 3 && /\d/.test(c.textContent)) node = c; else if (c.nodeType === 1) find(c);
      }
    })(el);
    if (!node) return;
    var m = node.textContent.match(/^(\D*)(\d+)(.*)$/);
    if (!m) return;
    el.__count = { node: node, pre: m[1], to: +m[2], post: m[3], done: false };
    node.textContent = m[1] + '0' + m[3];
  }
  function run(el, delay) {
    var c = el.__count; if (!c || c.done) return;
    c.done = true;
    setTimeout(function () {
      var t0 = performance.now(), dur = 1100 + Math.min(c.to, 120) * 4;
      (function step(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        c.node.textContent = c.pre + Math.round(c.to * e) + c.post;
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }, delay || 0);
  }
  function count(el) {
    if (el.matches && el.matches(COUNT)) run(el);
    $$(COUNT, el).forEach(function (c) { run(c); });
  }
  $$(COUNT).forEach(prepare);
  whenIntro(function () { $$('.hero .hero-stats b').forEach(function (el, i) { run(el, 900 + i * 120); }); });

  /* ---------- Scroll : progression, en-tête, parallaxe, parcours ---------- */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress'; bar.setAttribute('aria-hidden', 'true');
  bar.innerHTML = '<i></i>';
  document.body.appendChild(bar);
  var barFill = bar.firstChild;
  var header = $('[data-header]'), menu = $('[data-menu]');
  var lastY = window.scrollY;
  var parallax = $$('.hero-media, .page-hero .ph-img').map(function (el) { return { el: el, top: true }; })
    .concat($$('.fc-media img').map(function (el) { return { el: el, top: false }; }));
  var SVGNS = 'http://www.w3.org/2000/svg';
  var trails = $$('[data-trail]').map(function (svg) {
    return { svg: svg, path: $('.trail-line', svg), rider: $('.trail-rider', svg), len: 0, stops: [] };
  });
  function setupTrail(t) {
    // mesuré seulement une fois visible (une des deux versions est masquée selon l'écran)
    t.len = t.path.getTotalLength();
    t.path.style.strokeDasharray = t.len; t.path.style.strokeDashoffset = t.len;
    var names = (t.svg.getAttribute('data-stops') || '').split('|').filter(Boolean);
    var box = $('.trail-stops', t.svg);
    names.forEach(function (name, i) {
      var f = (i + 1) / (names.length + 1), pt = t.path.getPointAtLength(t.len * f);
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'trail-stop');
      g.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      g.innerHTML = '<circle r="7"/><text y="-16" text-anchor="middle">' + name + '</text>';
      box.appendChild(g);
      t.stops.push({ el: g, f: f });
    });
  }
  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight, doc = root.scrollHeight - vh;
    barFill.style.transform = 'scaleX(' + (doc > 0 ? y / doc : 0) + ')';
    if (header && !(menu && menu.classList.contains('open'))) {
      if (y > 220 && y > lastY + 6) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 220) header.classList.remove('is-hidden');
    }
    lastY = y;
    parallax.forEach(function (p) {
      if (p.top) { if (y < vh * 1.3) p.el.style.transform = 'translate3d(0,' + (y * 0.25).toFixed(1) + 'px,0)'; return; }
      var r = p.el.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var prog = (r.top + r.height / 2 - vh / 2) / vh;
      // léger : la photo reste nette (agrandissement limité à 6 %)
      p.el.style.transform = 'translate3d(0,' + (prog * -22).toFixed(1) + 'px,0) scale(1.06)';
    });
    trails.forEach(function (t) {
      var r = t.svg.getBoundingClientRect();
      if (!r.width || r.bottom < -50 || r.top > vh + 50) return;
      if (!t.len) setupTrail(t);
      var p = Math.max(0, Math.min(1, (vh * 0.92 - r.top) / (vh * 0.6)));
      t.path.style.strokeDashoffset = (t.len * (1 - p)).toFixed(1);
      var pt = t.path.getPointAtLength(t.len * p);
      t.rider.setAttribute('transform', 'translate(' + pt.x.toFixed(1) + ' ' + pt.y.toFixed(1) + ')');
      t.stops.forEach(function (s) { s.el.classList.toggle('on', p >= s.f - 0.01); });
      t.svg.classList.toggle('done', p >= 0.99);
    });
  }
  var ticking = false;
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();

  /* ---------- Cartes inclinables (souris uniquement) ---------- */
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.trip, .price-card, .post-card, .group-card').forEach(function (card) {
      var max = card.classList.contains('trip') ? 7 : 4;
      card.addEventListener('pointerenter', function () { card.classList.add('is-tilt'); });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, yy = (e.clientY - r.top) / r.height;
        card.style.transform = 'perspective(900px) rotateX(' + ((0.5 - yy) * max).toFixed(2) + 'deg) rotateY(' + ((x - 0.5) * max).toFixed(2) + 'deg) translateY(-6px)';
        card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (yy * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () { card.classList.remove('is-tilt'); card.style.transform = ''; });
    });
  }

  /* ---------- Menu mobile : liens en cascade ---------- */
  $$('[data-menu] nav a, [data-menu] .menu-foot .btn').forEach(function (a, i) { a.style.setProperty('--i', i); });
})();
