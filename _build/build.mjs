// Génère les pages HTML du site à partir de gabarits communs.
// Usage : node _build/build.mjs   (depuis la racine du projet)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { SORTIES, POSTS, FAQ } from './content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = {
  tel: '+262693620014', telLabel: '06 93 62 00 14',
  locTel: '+262693498337', locTelLabel: '06 93 49 83 37',
  email: 'lucashussonpirnay@gmail.com', insta: 'https://www.instagram.com/vtte_vasion/'
};

/* ---------- Helpers ---------- */
// ?v=empreinte du fichier : force le rechargement des CSS/JS après chaque modification
const asset = (p) => `${p}?v=${crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, p))).digest('hex').slice(0, 8)}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ic = (n, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${n}"/></svg>`;

const IMG = {
  'groupe-route-foret': [1600, 1200], 'maido-mafate': [1600, 2133], 'maido-foret': [1600, 2133],
  'maido-champs': [1600, 2133], 'maido-sentier': [1600, 2133], 'volcan-guidon': [1600, 1200],
  'volcan-groupe-piste': [1600, 1200], 'volcan-parking': [1600, 1200], 'volcan-groupe': [1600, 2133],
  'volcan-coulees': [1600, 2133], 'volcan-velos-focus': [1600, 2133], 'location-velos': [1600, 2400],
  'location-velos-2': [1600, 1067], 'repas-pei-assiette': [1600, 1200], 'repas-pei-feuille': [480, 539],
  'ferme-saint-leu-vue': [1600, 899], 'route-des-plages': [1280, 680]
};
const widths = (n) => [480, 960, 1600].filter((w) => fs.existsSync(path.join(ROOT, 'assets/img', `${n}-${w}.webp`)));
const src = (n, w) => `assets/img/${n}-${w}.webp`;
const big = (n) => { const ws = widths(n); return src(n, ws[ws.length - 1]); };
function img(n, alt, { sizes = '100vw', cls = '', eager = false } = {}) {
  if (!IMG[n]) throw new Error('Image inconnue : ' + n);
  const ws = widths(n); const [W, H] = IMG[n];
  const def = src(n, ws.includes(960) ? 960 : ws[ws.length - 1]);
  return `<img src="${def}" srcset="${ws.map((w) => `${src(n, w)} ${w}w`).join(', ')}" sizes="${sizes}" width="${W}" height="${H}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}${cls ? ` class="${cls}"` : ''}>`;
}

/* ---------- Icônes (traits 24px) ---------- */
const ICONS = {
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  cal: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  'user-plus': '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6M23 11h-6"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  euro: '<path d="M18.5 7.5A7 7 0 1 0 18.5 16.5M4 10.5h10M4 13.5h10"/>',
  mountain: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  bike: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  menu: '<path d="M3 7h18M3 12h18M3 17h12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  insta: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  bag: '<path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 10h8M8 15h8M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  'chev-down': '<path d="m6 9 6 6 6-6"/>',
  'chev-left': '<path d="m15 18-6-6 6-6"/>',
  'chev-right': '<path d="m9 18 6-6-6-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  sunrise: '<path d="M17 18a5 5 0 0 0-10 0M12 2v7M4.22 10.22l1.42 1.42M1 18h2M21 18h2M18.36 11.64l1.42-1.42M23 22H1M8 6l4-4 4 4"/>',
  flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  map: '<path d="m1 6 7-4 8 4 7-4v16l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/>',
  wave: '<path d="M2 7c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 13c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 19c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  award: '<circle cx="12" cy="8" r="7"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>',
  cross: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2M7 2v20M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>',
  camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  van: '<path d="M1 4h14v12H1zM15 8h4l4 4v4h-8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  phonebox: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'ext': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>'
};
const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(ICONS)
  .map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</defs></svg>`;

/* ---------- Gabarit commun ---------- */
const NAV_SORTIES = SORTIES.map((s) => ({ href: s.slug + '.html', label: s.menu, price: s.price }));

function header(active) {
  const cur = (k) => (k === active ? ' aria-current="page"' : '');
  return `<header class="site-header" data-header>
  <div class="container bar">
    <a class="brand" href="index.html" aria-label="VTT É-vasion, accueil"><img src="assets/img/logo.webp" width="483" height="127" alt="VTT É-vasion"></a>
    <nav class="nav-desktop" aria-label="Navigation principale">
      <a href="index.html"${cur('home')}>Accueil</a>
      <div class="has-sub">
        <button type="button" aria-haspopup="true"${active === 'sorties' ? ' aria-current="page"' : ''}>Nos sorties ${ic('chev-down')}</button>
        <div class="sub">${NAV_SORTIES.map((n) => `<a href="${n.href}">${n.label} <small>${n.price} €</small></a>`).join('')}</div>
      </div>
      <a href="location-e-vtt.html"${cur('location')}>Location E-VTT</a>
      <a href="reserver.html"${cur('reserver')}>Calendrier</a>
      <a href="blog.html"${cur('blog')}>Blog</a>
      <a href="contact.html"${cur('contact')}>Contact</a>
    </nav>
    <div class="header-cta">
      <a class="btn btn-ghost btn-sm" href="tel:${C.tel}">${ic('phone')} ${C.telLabel}</a>
      <a class="btn btn-volt btn-sm" href="reserver.html">${ic('cal')} Réserver</a>
    </div>
    <button class="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu" data-menu-open>${ic('menu')}</button>
  </div>
</header>
<div class="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" data-menu>
  <div class="bar">
    <a class="brand" href="index.html"><img src="assets/img/logo.webp" width="483" height="127" alt="VTT É-vasion"></a>
    <button class="burger" type="button" aria-label="Fermer le menu" data-menu-close>${ic('x')}</button>
  </div>
  <nav aria-label="Menu mobile">
    <a href="index.html">Accueil</a>
    ${NAV_SORTIES.map((n) => `<a class="sub-link" href="${n.href}">${n.label} <small>${n.price} €</small></a>`).join('\n    ')}
    <a href="location-e-vtt.html">Location E-VTT <small>dès 59 €</small></a>
    <a href="reserver.html">Calendrier <small>réserver</small></a>
    <a href="blog.html">Blog</a>
    <a href="contact.html">Contact</a>
  </nav>
  <div class="menu-foot">
    <a class="btn btn-volt" href="reserver.html">${ic('cal')} Réserver une sortie</a>
    <a class="btn btn-ghost" href="tel:${C.tel}">${ic('phone')} Sorties · ${C.telLabel}</a>
    <a class="btn btn-ghost" href="tel:${C.locTel}">${ic('bike')} Location · ${C.locTelLabel}</a>
  </div>
</div>`;
}

const footer = () => `<footer class="site-footer">
  <div class="container">
    <div class="foot-grid">
      <div>
        <a class="brand" href="index.html"><img src="assets/img/logo.webp" width="483" height="127" alt="VTT É-vasion" loading="lazy"></a>
        <p style="margin-top:16px">Sorties E-VTT guidées pour découvrir l’Ouest de La Réunion : Maïdo, Piton de la Fournaise, Route des plages et repas Peï à la ferme.</p>
        <div class="chips"><span class="chip">${ic('award')} BPJEPS VTT</span><span class="chip">${ic('cross')} Formé SST</span><span class="chip">${ic('bolt')} E-VTT Focus</span></div>
        <a class="social" href="${C.insta}" target="_blank" rel="noopener">${ic('insta')} @vtte_vasion</a>
      </div>
      <div>
        <h4>Menu</h4>
        <ul class="foot-list">
          <li><a href="index.html">Accueil</a></li>
          ${NAV_SORTIES.map((n) => `<li><a href="${n.href}">${n.label}</a></li>`).join('')}
          <li><a href="location-e-vtt.html">Location E-VTT</a></li>
          <li><a href="reserver.html">Calendrier & réservation</a></li>
          <li><a href="blog.html">Blog</a></li>
          <li><a href="contact.html">Contact & FAQ</a></li>
        </ul>
      </div>
      <div>
        <h4>Coordonnées</h4>
        <ul class="foot-list">
          <li>${ic('pin')}<span>Zone Ouest de La Réunion<br>La Saline-les-Bains</span></li>
          <li>${ic('phone')}<span>Sorties E-VTT<br><a href="tel:${C.tel}">${C.telLabel}</a></span></li>
          <li>${ic('bike')}<span>Location E-VTT<br><a href="tel:${C.locTel}">${C.locTelLabel}</a></span></li>
          <li>${ic('mail')}<a href="mailto:${C.email}" style="word-break:break-all">${C.email}</a></li>
        </ul>
      </div>
      <div>
        <h4>Horaires & infos</h4>
        <ul class="foot-list">
          <li>${ic('check')}Ouvert 7 jours sur 7</li>
          <li>${ic('check')}Appels : 8h – 20h</li>
          <li>${ic('check')}Sorties matin & journée</li>
          <li>${ic('check')}E-VTT récents et révisés</li>
          <li>${ic('check')}Assurance RC obligatoire</li>
          <li>${ic('check')}Groupes max 7 personnes</li>
        </ul>
      </div>
    </div>
    <div class="foot-bottom">
      <span>© ${new Date().getFullYear()} VTT É-vasion – Sorties E-VTT à La Réunion</span>
      <a href="gerant.html">${ic('lock')} Espace gérant (démo)</a>
    </div>
  </div>
</footer>`;

const mobileBar = () => `<div class="mobile-bar">
  <a class="btn btn-ghost" href="tel:${C.tel}">${ic('phone')} Appeler</a>
  <a class="btn btn-volt" href="reserver.html">${ic('cal')} Réserver</a>
</div>`;

const lightbox = `<div class="lightbox" data-lightbox role="dialog" aria-modal="true" aria-label="Photo agrandie" hidden>
  <button class="lb-btn lb-close" type="button" data-lb-close aria-label="Fermer">${ic('x')}</button>
  <button class="lb-btn lb-prev" type="button" data-lb-prev aria-label="Photo précédente">${ic('chev-left')}</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button class="lb-btn lb-next" type="button" data-lb-next aria-label="Photo suivante">${ic('chev-right')}</button>
</div>`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;1,700;1,800&family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">`;

// Active les animations dès le premier rendu ; si motion.js ne se charge pas, on les retire après 3 s
const MOTION_BOOT = `<script>(function(d){if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('js-motion');setTimeout(function(){if(!window.__motion)d.classList.remove('js-motion')},3000)}})(document.documentElement)</script>`;

function head({ title, desc, extra = '' }) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="#0d100e">
<link rel="icon" type="image/png" href="assets/img/favicon.png">
<link rel="apple-touch-icon" href="assets/img/icon-180.png">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="VTT É-vasion">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="assets/img/og-image.jpg">
${FONTS}
<link rel="stylesheet" href="${asset('assets/css/style.css')}">
${extra}
</head>`;
}

function page({ file, title, desc, active, body, scripts = [], noBar = false, extraHead = '' }) {
  const html = `${head({ title, desc, extra: MOTION_BOOT + extraHead })}
<body${noBar ? ' class="no-bar"' : ''}>
<a class="skip" href="#main">Aller au contenu</a>
${SPRITE}
${header(active)}
<main id="main">
${body}
</main>
${footer()}
${noBar ? '' : mobileBar()}
${lightbox}
<script src="${asset('assets/js/data.js')}"></script>
<script src="${asset('assets/js/store.js')}"></script>
<script src="${asset('assets/js/site.js')}"></script>
<script src="${asset('assets/js/motion.js')}"></script>
${scripts.map((s) => `<script src="${asset(s)}"></script>`).join('\n')}
</body>
</html>
`;
  fs.writeFileSync(path.join(ROOT, file), html);
  console.log('✓', file);
}

/* ---------- Composants ---------- */
const tickerBand = (cls, items) => `<div class="ticker ${cls}"><div class="ticker-track">${[0, 1].map(() => items.map((t) => `<span>${t}</span>`).join('')).join('')}</div></div>`;

// Parcours décoratif : une version téléphone et une version large, le vélo suit la ligne au défilement
function trailSvg(k, vb, d, [sx, sy], [fx, fy]) {
  return `<svg class="trail-${k}" viewBox="${vb}" data-trail data-stops="Maïdo|Volcan|Plages|Repas Peï" focusable="false">
    <path class="trail-ghost" d="${d}"/>
    <path class="trail-line" d="${d}"/>
    <text x="${sx}" y="${sy + 36}">Départ</text>
    <g transform="translate(${fx} ${fy})"><path d="M0 4V-36" stroke="#0d100e" stroke-width="3" stroke-linecap="round"/><path class="trail-pennant" d="M0 -36l24 8-24 8z" stroke="#0d100e" stroke-width="2" stroke-linejoin="round"/></g>
    <g class="trail-stops"></g>
    <g class="trail-rider"><circle r="18"/><use href="#i-bike" x="-12" y="-12" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>
  </svg>`;
}
const trail = () => `<div class="trail" aria-hidden="true">
      ${trailSvg('m', '0 0 400 150', 'M18 104 C 70 104, 84 44, 140 50 S 228 126, 282 104 S 344 40, 382 56', [18, 104], [382, 56])}
      ${trailSvg('d', '0 0 1200 170', 'M24 120 C 170 120, 214 44, 362 52 S 560 142, 702 118 S 902 30, 1030 48 S 1150 104, 1172 104', [24, 120], [1172, 104])}
    </div>`;
const tripCard = (s, sizes = '(min-width:1024px) 25vw, (min-width:640px) 46vw, 82vw') => `<a class="trip reveal" href="${s.slug}.html">
  ${img(s.card, s.cardAlt, { sizes })}
  <div class="tags"><span class="tag">${s.badge}</span><span class="tag price">${s.price} €</span></div>
  <span class="where">${ic('pin')} ${s.where}</span>
  <h3>${s.cardTitle}</h3>
  <p>${s.cardText}</p>
  <span class="go">Voir la sortie ${ic('arrow')}</span>
</a>`;

const phoneLines = () => `<div class="cta-phones">
  <a class="phone-line" href="tel:${C.tel}"><span class="ic">${ic('phone')}</span><span><small>Sorties E-VTT</small><b>${C.telLabel}</b></span></a>
  <a class="phone-line" href="tel:${C.locTel}"><span class="ic">${ic('bike')}</span><span><small>Location E-VTT</small><b>${C.locTelLabel}</b></span></a>
</div>`;

function cta({ image = 'maido-mafate', eyebrow = 'Prêt à rouler ?', title, text, buttons }) {
  return `<section class="section-tight">
  <div class="container">
    <div class="cta reveal">
      ${img(image, '', { sizes: '100vw' })}
      <span class="eyebrow">${eyebrow}</span>
      <h2>${title}</h2>
      <p class="lead">${text}</p>
      ${phoneLines()}
      <div class="btn-row">${buttons || `<a class="btn btn-volt" href="reserver.html">${ic('cal')} Réserver en ligne</a><a class="btn btn-ghost" href="contact.html">${ic('mail')} Nous écrire</a>`}</div>
    </div>
  </div>
</section>`;
}

const galleryBtn = (n, alt, cap = '') => `<button type="button" data-lb="${big(n)}" data-cap="${esc(cap || alt)}" aria-label="Agrandir : ${esc(alt)}">${img(n, alt, { sizes: '(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw' })}</button>`;

/* ================================================================
   PAGES
   ================================================================ */

/* ---------- Accueil ---------- */
const GALLERY = [
  ['maido-mafate', 'Sortie Maïdo en E-VTT, La Réunion'], ['volcan-guidon', 'Piton de la Fournaise en E-VTT'],
  ['volcan-parking', 'Sortie VTT au volcan, La Réunion'], ['volcan-groupe-piste', 'Paysages lunaires du volcan en VTT'],
  ['volcan-groupe', 'Groupe E-VTT sur les pistes du volcan'], ['volcan-coulees', 'Coulées de lave du Piton de la Fournaise en VTT'],
  ['maido-foret', 'Chemins forestiers du Maïdo en VTT'], ['groupe-route-foret', 'Sortie E-VTT en petit groupe'],
  ['maido-champs', 'Sortie VTT dans les Hauts de l’Ouest'], ['location-velos', 'E-VTT en location à La Réunion'],
  ['location-velos-2', 'Location VTT électrique côte Ouest'], ['repas-pei-assiette', 'Repas Peï à la ferme, cuisine créole']
];

page({
  file: 'index.html', active: 'home',
  title: 'VTT É-vasion – Sorties E-VTT guidées & location de VTT électrique à La Réunion',
  desc: 'Sorties VTT à La Réunion en E-VTT avec guide diplômé BPJEPS : Maïdo, volcan Piton de la Fournaise, Route des plages et repas Peï à la ferme. Petits groupes, matériel récent, location E-VTT.',
  extraHead: `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'SportsActivityLocation', name: 'VTT É-vasion',
    description: 'Sorties E-VTT guidées et location de VTT électriques dans l’Ouest de La Réunion.',
    telephone: C.tel, email: C.email, url: 'https://vtte-vasion.fr/',
    address: { '@type': 'PostalAddress', addressLocality: 'La Saline-les-Bains', addressRegion: 'La Réunion', addressCountry: 'FR' },
    openingHours: 'Mo-Su 08:00-20:00', sameAs: [C.insta]
  })}</script>`,
  body: `
<section class="hero">
  <div class="hero-media" aria-hidden="true">
    ${img('volcan-groupe-piste', '', { eager: true })}
    ${img('groupe-route-foret', '')}
    ${img('volcan-guidon', '')}
    ${img('location-velos-2', '')}
  </div>
  <div class="container hero-content">
    <div class="hero-grid">
      <div>
        <span class="eyebrow">Sorties E-VTT · La Réunion</span>
        <h1>Roulez libre dans <span class="hl">l’île intense</span></h1>
        <p class="lead">Maïdo, volcan, Route des plages, repas Peï : des sorties VTT encadrées par Lucas, guide diplômé BPJEPS, dans l’Ouest de La Réunion.</p>
        <div class="btn-row">
          <a class="btn btn-volt" href="reserver.html">${ic('cal')} Réserver une sortie</a>
          <a class="btn btn-ghost" href="#sorties">Découvrir les sorties</a>
        </div>
      </div>
      <div class="hero-stats">
        <div><b>4</b><span>sorties encadrées</span></div>
        <div><b>7</b><span>pers. max par groupe</span></div>
        <div><b>7j/7</b><span>disponible de 8h à 20h</span></div>
      </div>
    </div>
  </div>
  <a class="scroll-cue" href="#sorties" aria-label="Voir la suite"><i></i>Défiler</a>
</section>

<div class="tickers" aria-hidden="true">
  ${tickerBand('t1', ['Sortie Maïdo', 'Sortie Volcan Fournaise', 'Repas Peï à la ferme', 'Route des plages', 'Pour tous les niveaux', 'E-VTT Focus récents', 'Guide diplômé BPJEPS', 'Formé SST', 'Location VTT électrique', 'Groupes max 7 personnes'])}
  ${tickerBand('t2', ['L’île intense', 'Petits groupes', 'Disponible 7j/7', 'Côte Ouest', 'Cirque de Mafate', 'Piton de la Fournaise', 'La Saline-les-Bains', 'Lagon'])}
</div>

<section class="section" id="sorties">
  <div class="container">
    ${trail()}
    <div class="section-head row">
      <div><span class="eyebrow">Nos programmes</span><h2>Sorties en E-VTT <span class="hl">à La Réunion</span></h2></div>
      <p class="lead">Des sorties VTT encadrées pour tous les niveaux : Maïdo, volcan, Route des plages, repas Peï à la ferme, et même une sortie sur-mesure selon vos envies.</p>
    </div>
    <div class="rail">
      ${SORTIES.map((s) => tripCard(s)).join('\n      ')}
      <a class="trip trip-custom reveal" href="contact.html">
        <div><span class="big">Sortie<br>personnalisée</span><p>Un événement, un team-building, une idée spécifique ? On construit votre aventure E-VTT sur mesure à La Réunion.</p></div>
        <span class="go">Nous contacter ${ic('arrow')}</span>
      </a>
    </div>
  </div>
</section>

<section class="section-tight" style="padding-top:0">
  <div class="container">
    <div class="groups-wrap reveal">
      <div>
        <span class="eyebrow">Nouveau · Groupes ouverts</span>
        <h2>Pas assez nombreux&nbsp;? <span class="hl">Complétez un groupe</span></h2>
        <p class="lead" style="margin-top:14px">Chaque sortie a un minimum de participants. Proposez votre date : votre groupe apparaît dans le calendrier et d’autres riders peuvent le compléter. Lucas valide chaque demande depuis son téléphone.</p>
        <div class="btn-row" style="margin-top:20px"><a class="btn btn-volt" href="reserver.html">${ic('cal')} Ouvrir le calendrier</a></div>
      </div>
      <div class="groups-list" data-open-groups data-limit="4"></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container split">
    <div class="media-frame reveal">
      ${img('volcan-guidon', 'Lucas, guide diplômé BPJEPS de VTT É-vasion, au volcan', { sizes: '(min-width:1024px) 50vw, 100vw' })}
      <div class="media-badge"><b>7</b><span>personnes max<br>par groupe</span></div>
    </div>
    <div>
      <span class="eyebrow">Votre guide local</span>
      <h2>Lucas, guide diplômé <span class="hl">passionné de VTT</span></h2>
      <p class="lead" style="margin-top:16px">Derrière VTT É-vasion, il y a Lucas — guide professionnel diplômé qui roule sur les sentiers de La Réunion depuis des années. Sa mission : vous faire vivre une sortie E-VTT inoubliable, en toute sécurité, dans l’Ouest de l’île.</p>
      <div class="chips"><span class="chip">${ic('award')} BPJEPS VTT</span><span class="chip">${ic('cross')} Formé SST</span><span class="chip">${ic('pin')} Guide local Réunion</span></div>
      <ul class="checks">
        <li><span>${ic('check')}</span><span>Réglage du vélo à votre taille et briefing complet avant chaque sortie.</span></li>
        <li><span>${ic('check')}</span><span>Groupes limités à 7 personnes pour plus de sécurité et de convivialité.</span></li>
        <li><span>${ic('check')}</span><span>Conseils techniques adaptés à votre niveau, débutant ou rider régulier.</span></li>
        <li><span>${ic('check')}</span><span>Connaissance parfaite du terrain : Maïdo, Fournaise, côte Ouest.</span></li>
      </ul>
      <a class="btn btn-dark" href="reserver.html">${ic('cal')} Réserver votre sortie VTT</a>
    </div>
  </div>
</section>

<section class="section dark">
  <div class="container split rev">
    <div class="stack-img reveal">
      ${img('location-velos', 'E-VTT tout-suspendu en location à La Réunion', { sizes: '(min-width:1024px) 25vw, 50vw' })}
      ${img('volcan-velos-focus', 'Location VTT électrique Focus à La Réunion', { sizes: '(min-width:1024px) 25vw, 50vw' })}
      <span class="avail">${ic('clock')} 7j/7 · 8h – 20h</span>
    </div>
    <div>
      <span class="eyebrow">Autonomie totale</span>
      <h2>Location VTT électrique <span class="hl">à La Réunion</span></h2>
      <p class="lead" style="margin-top:16px">Louez un E-VTT tout-suspendu récent et explorez la côte Ouest de La Réunion à votre rythme. Casque, gants et conseils d’itinéraires inclus.</p>
      <div class="prices">
        <div class="price-card"><h3>${ic('sunrise')} Demi-journée</h3><div class="amount">59<small> €</small></div><div class="per">par vélo · ~4 h</div></div>
        <div class="price-card featured"><h3>${ic('sun')} Journée</h3><div class="amount">79<small> €</small></div><div class="per">par vélo</div></div>
        <div class="price-card"><h3>${ic('users')} Groupe 3+ vélos</h3><div class="amount">69<small> €</small></div><div class="per">par vélo · journée</div></div>
      </div>
      <div class="btn-row">
        <a class="btn btn-volt" href="reserver.html?type=location">${ic('cal')} Réserver des vélos</a>
        <a class="btn btn-ghost" href="location-e-vtt.html">Voir la location</a>
      </div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head row">
      <div><span class="eyebrow">En images</span><h2>La Réunion <span class="hl">en E-VTT</span></h2></div>
      <p class="lead">Maïdo, volcan, plages, Hauts — toutes nos sorties en images.</p>
    </div>
    <div class="masonry" data-gallery>
      ${GALLERY.map(([n, a]) => galleryBtn(n, a)).join('\n      ')}
    </div>
  </div>
</section>

<section class="section" style="padding-top:0">
  <div class="container">
    <div class="section-head row">
      <div><span class="eyebrow">Conseils & actualités</span><h2>Notre blog VTT <span class="hl">à La Réunion</span></h2></div>
      <p class="lead">Conseils pour préparer votre sortie, idées de parcours et retours d’expérience.</p>
    </div>
    <div class="posts">
      ${POSTS.map((p) => `<a class="post-card reveal" href="${p.slug}.html">${img(p.card, p.title, { sizes: '(min-width:640px) 33vw, 110px' })}<div><time datetime="${p.iso}">${p.date}</time><h3>${p.title}</h3></div></a>`).join('\n      ')}
    </div>
    <p style="margin-top:22px"><a class="link-arrow" href="blog.html">Voir tous les articles ${ic('arrow')}</a></p>
  </div>
</section>

${cta({
    image: 'maido-mafate', eyebrow: 'Réservation',
    title: 'Prêt à rouler dans <span class="hl">l’île intense ?</span>',
    text: 'Disponibles 7j/7 de 8h à 20h pour répondre à vos questions et finaliser votre réservation. Choisissez votre sortie, on s’occupe du reste.'
  })}
`
});

/* ---------- Pages sorties ---------- */
for (const s of SORTIES) {
  const others = SORTIES.filter((o) => o.id !== s.id);
  page({
    file: s.slug + '.html', active: 'sorties', title: s.metaTitle, desc: s.metaDesc,
    body: `
<section class="page-hero has-img">
  ${img(s.hero, s.heroAlt, { eager: true, cls: 'ph-img' })}
  <div class="container inner">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / <a href="index.html#sorties">Sorties</a> / <span>${s.menu}</span></nav>
    <span class="eyebrow">${s.eyebrow}</span>
    <h1>${s.h1}</h1>
    <p class="lead">${s.lead}</p>
    <div class="btn-row">
      <a class="btn btn-volt" href="reserver.html?sortie=${s.id}">${ic('cal')} Réserver cette sortie</a>
      <a class="btn btn-ghost" href="tel:${C.tel}">${ic('phone')} ${C.telLabel}</a>
    </div>
  </div>
</section>

<div class="container">
  <div class="facts">
    <div class="fact accent"><b>${s.price} €</b><span>par personne</span></div>
    <div class="fact"><b>7</b><span>personnes max</span></div>
    <div class="fact"><b>${s.factDuration[0]}</b><span>${s.factDuration[1]}</span></div>
    <div class="fact"><b>${s.factLevel[0]}</b><span>${s.factLevel[1]}</span></div>
  </div>
</div>

<section class="section">
  <div class="container with-aside">
    <div>
      <span class="eyebrow">${s.introEyebrow}</span>
      <h2>${s.introTitle}</h2>
      <div style="margin-top:18px">${s.intro.map((p) => `<p class="lead">${p}</p>`).join('')}</div>
      <div class="min-note">
        <span class="ic">${ic('users')}</span>
        <p><b>Minimum <span data-act-min="${s.id}">${s.min}</span> participants.</b> Vous êtes moins nombreux&nbsp;? Proposez quand même votre date : votre groupe reste ouvert dans le calendrier pour que d’autres riders le complètent.</p>
      </div>
      <h3 style="margin-top:28px">Groupes ouverts pour cette sortie</h3>
      <div class="mini-groups" data-open-groups data-activity="${s.id}" data-variant="mini" data-limit="3"></div>
    </div>
    <aside>
      <div class="sheet-card">
        <h3>En un coup d’œil</h3>
        ${s.sheet.map(([icn, k, v]) => `<div class="sheet-row"><span class="ic">${ic(icn)}</span><div><small>${k}</small><span>${v}</span></div></div>`).join('\n        ')}
        <a class="btn btn-volt btn-block" href="reserver.html?sortie=${s.id}">${ic('cal')} Voir les dates</a>
      </div>
    </aside>
  </div>
</section>

<section class="section dark">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Points forts</span>
      <h2>${s.whyTitle}</h2>
    </div>
    <div class="highlights">
      ${s.why.map(([icn, t]) => `<div class="hl-card reveal"><span class="ic">${ic(icn)}</span><p>${t}</p></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Infos pratiques</span><h2>Bien préparer <span class="hl">votre sortie</span></h2></div>
    <div class="infos">
      ${s.infos.map(([icn, k, v]) => `<div class="info reveal"><span class="ic">${ic(icn)}</span><div><b>${k}</b><p>${v}</p></div></div>`).join('\n      ')}
    </div>
  </div>
</section>

${s.gallery.length ? `<section class="section" style="padding-top:0">
  <div class="container">
    <div class="section-head"><span class="eyebrow">En images</span><h2>${s.galleryTitle}</h2></div>
    <div class="photo-grid" data-gallery>
      ${s.gallery.map(([n, t, c]) => `<figure class="photo reveal"><button type="button" data-lb="${big(n)}" data-cap="${esc(t + ' — ' + c)}" aria-label="Agrandir : ${esc(t)}">${img(n, t, { sizes: '(min-width:640px) 25vw, 50vw' })}</button><figcaption><b>${t}</b>${c}</figcaption></figure>`).join('\n      ')}
    </div>
  </div>
</section>` : ''}

${cta({
      image: s.ctaImage, eyebrow: s.ctaEyebrow, title: s.ctaTitle, text: s.ctaText,
      buttons: `<a class="btn btn-volt" href="reserver.html?sortie=${s.id}">${ic('cal')} Réserver cette sortie</a><a class="btn btn-ghost" href="contact.html">${ic('mail')} Une question ?</a>`
    })}

<section class="section">
  <div class="container">
    <div class="section-head"><span class="eyebrow">À découvrir aussi</span><h2>Autres sorties <span class="hl">E-VTT</span></h2></div>
    <div class="rail">${others.map((o) => tripCard(o, '(min-width:1024px) 33vw, (min-width:640px) 46vw, 82vw')).join('')}</div>
  </div>
</section>
`
  });
}

/* ---------- Location ---------- */
page({
  file: 'location-e-vtt.html', active: 'location',
  title: 'Location VTT électrique La Réunion – E-VTT à la journée | VTT É-vasion',
  desc: 'Location de VTT électriques tout-suspendus à La Réunion : 59 € la demi-journée, 79 € la journée, 69 € par vélo dès 3 vélos. Casque, gants et conseils d’itinéraires inclus. Départ La Saline-les-Bains.',
  body: `
<section class="page-hero has-img">
  ${img('location-velos-2', 'Location VTT électrique à La Réunion, E-VTT tout-suspendus', { eager: true, cls: 'ph-img' })}
  <div class="container inner">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / <span>Location E-VTT</span></nav>
    <span class="eyebrow">Location VTT électrique · La Réunion</span>
    <h1>Location E-VTT <span class="hl">à La Réunion</span></h1>
    <p class="lead">Louez un E-VTT tout-suspendu récent et explorez la côte Ouest de La Réunion en totale autonomie. Casque, gants et conseils d’itinéraires inclus.</p>
    <div class="btn-row">
      <a class="btn btn-volt" href="reserver.html?type=location">${ic('cal')} Voir les disponibilités</a>
      <a class="btn btn-ghost" href="tel:${C.locTel}">${ic('phone')} ${C.locTelLabel}</a>
    </div>
  </div>
</section>

<div class="container">
  <div class="facts">
    <div class="fact"><b>59 €</b><span>demi-journée</span></div>
    <div class="fact accent"><b>79 €</b><span>journée / vélo</span></div>
    <div class="fact"><b>69 €</b><span>groupe 3+ vélos</span></div>
    <div class="fact"><b>7j/7</b><span>de 8h à 20h</span></div>
  </div>
</div>

<section class="section">
  <div class="container split">
    <div>
      <span class="eyebrow">Pourquoi l’E-VTT ?</span>
      <h2>Pourquoi choisir la location <span class="hl">VTT électrique ?</span></h2>
      <p class="lead" style="margin-top:18px">La Réunion est une île montagneuse, avec beaucoup de relief et des montées parfois exigeantes. Grâce à la location VTT électrique, tout le monde peut profiter des panoramas, même sans être un grand sportif : l’assistance électrique vous aide dans les côtes et vous laisse profiter du paysage.</p>
      <p class="lead">Que vous soyez en vacances ou résident, la location E-VTT est parfaite pour des sorties entre amis, en famille ou pour un team-building. Chacun choisit son niveau d’assistance, ce qui permet de rester ensemble malgré les différences de forme et d’expérience.</p>
    </div>
    <div class="stack-img reveal">
      ${img('location-velos', 'Location E-VTT tout-suspendu à La Réunion', { sizes: '(min-width:1024px) 25vw, 50vw' })}
      ${img('volcan-velos-focus', 'E-VTT Focus récents et entretenus', { sizes: '(min-width:1024px) 25vw, 50vw' })}
      <span class="avail">${ic('bolt')} E-VTT Focus récents</span>
    </div>
  </div>
</section>

<section class="section dark">
  <div class="container">
    <div class="section-head row">
      <div><span class="eyebrow">Nos tarifs</span><h2>Tarifs location <span class="hl">VTT électrique</span></h2></div>
      <p class="lead">Des E-VTT tout-suspendus adaptés au terrain réunionnais, régulièrement révisés : freins, transmission, suspensions, batterie. Vous partez avec un matériel fiable et confortable.</p>
    </div>
    <div class="prices">
      <div class="price-card reveal"><h3>${ic('sunrise')} Demi-journée</h3><div class="amount">59<small> €</small></div><div class="per">par vélo · ~4 h</div><p>Idéal pour une sortie le matin ou l’après-midi sur la Route des plages, autour de votre hébergement ou pour une première découverte de l’E-VTT à La Réunion.</p></div>
      <div class="price-card featured reveal"><h3>${ic('sun')} Journée complète</h3><div class="amount">79<small> €</small></div><div class="per">par vélo / jour</div><p>Partez à la journée pour profiter pleinement de votre location : explorez les Hauts, enchaînez plusieurs spots ou prenez le temps de rouler sans regarder la montre.</p></div>
      <div class="price-card reveal"><h3>${ic('users')} Tarif groupe</h3><div class="amount">69<small> €</small></div><div class="per">par vélo / jour · dès 3 E-VTT</div><p>Formule avantageuse pour les familles et groupes. Parfait pour organiser une grande sortie commune avec assistance électrique à La Réunion.</p></div>
    </div>
    <div class="btn-row"><a class="btn btn-volt" href="reserver.html?type=location">${ic('cal')} Réserver mes vélos</a><a class="btn btn-ghost" href="tel:${C.locTel}">${ic('phone')} ${C.locTelLabel}</a></div>
  </div>
</section>

<section class="section">
  <div class="container split">
    <div>
      <span class="eyebrow">Inclus</span>
      <h2>Ce qui est <span class="hl">inclus</span></h2>
      <ul class="checks" style="margin-top:22px">
        ${['E-VTT tout-suspendu adapté au terrain réunionnais', 'Casque homologué réglé à votre taille', 'Gants de protection VTT', 'Vélos révisés et entretenus régulièrement', 'Réglage complet du vélo avant départ', 'Conseils d’itinéraires selon votre niveau', 'Départ depuis La Saline-les-Bains, côte Ouest'].map((t) => `<li><span>${ic('check')}</span><span>${t}</span></li>`).join('')}
      </ul>
      <p class="lead"><b>À prévoir :</b> eau, protections solaires, lunettes, tenue de sport et chaussures fermées.</p>
    </div>
    <div>
      <span class="eyebrow">Idées de parcours</span>
      <h2>Où rouler <span class="hl">en E-VTT ?</span></h2>
      <div class="infos" style="margin-top:22px;grid-template-columns:1fr">
        <div class="info"><span class="ic">${ic('wave')}</span><div><b>Balade côte Ouest</b><p>Route des plages, lagon — facile, ~15 km</p></div></div>
        <div class="info"><span class="ic">${ic('mountain')}</span><div><b>Les Hauts de Saint-Paul</b><p>Montée panoramique — intermédiaire</p></div></div>
        <div class="info"><span class="ic">${ic('leaf')}</span><div><b>Sentiers de Saint-Leu</b><p>Forêt et côte — tous niveaux</p></div></div>
        <div class="info"><span class="ic">${ic('users')}</span><div><b>Tour du lagon</b><p>Aller-retour famille — facile</p></div></div>
        <div class="info"><span class="ic">${ic('map')}</span><div><b>Itinéraire sur-mesure</b><p>Conseils personnalisés selon vos envies et la météo du jour</p></div></div>
      </div>
    </div>
  </div>
</section>

<section class="section dark-2">
  <div class="container">
    <div class="section-head row">
      <div><span class="eyebrow">Pourquoi VTT É-vasion ?</span><h2>La meilleure location E-VTT <span class="hl">de la côte Ouest</span></h2></div>
      <p class="lead">Des E-VTT tout-suspendus récents, entretenus et réglés à chaque location. Idéaux pour explorer l’île en toute autonomie.</p>
    </div>
    <div class="highlights">
      <div class="hl-card reveal"><span class="ic">${ic('bolt')}</span><p><b>E-VTT Focus récents & révisés.</b> Vélos tout-suspendus entretenus régulièrement, réglés à votre taille avant chaque départ.</p></div>
      <div class="hl-card reveal"><span class="ic">${ic('shield')}</span><p><b>Casque & gants fournis.</b> Équipement de protection complet inclus dans tous les tarifs, sans supplément.</p></div>
      <div class="hl-card reveal"><span class="ic">${ic('map')}</span><p><b>Conseils personnalisés.</b> Lucas vous recommande le parcours adapté à votre niveau et vos envies du jour.</p></div>
      <div class="hl-card reveal"><span class="ic">${ic('cal')}</span><p><b>Disponible 7j/7.</b> Réservation en ligne ou par téléphone. Réponse rapide de 8h à 20h.</p></div>
    </div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="section-head"><span class="eyebrow">Vous préférez être accompagné ?</span><h2>Nos sorties <span class="hl">encadrées</span></h2></div>
    <div class="rail">${SORTIES.map((o) => tripCard(o)).join('')}</div>
  </div>
</section>

${cta({
    image: 'location-velos-2', eyebrow: 'Réservation',
    title: 'Réservez votre location <span class="hl">E-VTT</span>',
    text: 'Disponible 7j/7 de 8h à 20h. Choisissez votre date dans le calendrier ou appelez directement pour réserver votre vélo.',
    buttons: `<a class="btn btn-volt" href="reserver.html?type=location">${ic('cal')} Réserver mes vélos</a><a class="btn btn-ghost" href="contact.html">${ic('mail')} Formulaire de contact</a>`
  })}
`
});

/* ---------- Réserver (calendrier) ---------- */
page({
  file: 'reserver.html', active: 'reserver', noBar: true,
  title: 'Réserver une sortie ou une location E-VTT – Calendrier | VTT É-vasion',
  desc: 'Calendrier de réservation VTT É-vasion : proposez une date de sortie E-VTT, rejoignez un groupe ouvert pour atteindre le minimum de participants ou réservez vos vélos électriques.',
  extraHead: `<link rel="stylesheet" href="${asset('assets/css/app.css')}">`,
  scripts: ['assets/js/booking.js'],
  body: `
<section class="page-hero compact">
  <div class="container inner">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / <span>Calendrier</span></nav>
    <span class="eyebrow">Réservation en ligne</span>
    <h1>Choisissez <span class="hl">votre date</span></h1>
    <p class="lead">Proposez une sortie, rejoignez un groupe déjà formé ou réservez vos vélos. Lucas valide chaque demande depuis son téléphone et vous recontacte.</p>
    <ol class="steps">
      <li><b>1</b><span>Choisissez une sortie (ou la location) et une date</span></li>
      <li><b>2</b><span>Pas assez nombreux ? Votre groupe reste ouvert pour être complété</span></li>
      <li><b>3</b><span>Lucas valide et vous confirme par téléphone ou SMS</span></li>
    </ol>
  </div>
</section>

<section class="section-tight booking-section">
  <div class="container">
    <div class="booking" data-booking>
      <div class="bk-main">
        <div class="bk-tabs" role="tablist" aria-label="Type de réservation">
          <button type="button" role="tab" data-mode="sortie" aria-selected="true">${ic('users')} Sortie guidée</button>
          <button type="button" role="tab" data-mode="location" aria-selected="false">${ic('bike')} Location E-VTT</button>
        </div>
        <div class="bk-acts" data-acts role="radiogroup" aria-label="Choix de la sortie"></div>
        <div class="bk-actinfo" data-actinfo></div>
        <div class="bk-groups" data-bk-groups></div>
        <div class="cal" data-cal>
          <div class="cal-head">
            <button type="button" class="cal-nav" data-cal-prev aria-label="Mois précédent">${ic('chev-left')}</button>
            <h2 class="cal-title" data-cal-title aria-live="polite"></h2>
            <button type="button" class="cal-nav" data-cal-next aria-label="Mois suivant">${ic('chev-right')}</button>
          </div>
          <div class="cal-week" aria-hidden="true"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
          <div class="cal-grid" data-cal-grid role="grid"></div>
          <div class="cal-legend" data-cal-legend></div>
        </div>
      </div>
      <aside class="bk-day" data-day aria-live="polite"></aside>
    </div>
    <p class="demo-note">${ic('info')} <span><b>Version de démonstration.</b> Les demandes sont enregistrées dans ce navigateur pour que vous puissiez tester le parcours complet, puis les valider dans l’<a href="gerant.html">espace gérant</a>. En production, elles arrivent directement sur le téléphone de Lucas.</span></p>
  </div>
</section>

<dialog class="sheet" data-sheet aria-labelledby="sheet-title"></dialog>
`
});

/* ---------- Contact ---------- */
page({
  file: 'contact.html', active: 'contact',
  title: 'Contact & FAQ – VTT É-vasion, sorties et location E-VTT à La Réunion',
  desc: 'Contactez VTT É-vasion : sorties E-VTT au 06 93 62 00 14, location E-VTT au 06 93 49 83 37, 7j/7 de 8h à 20h. Ouest de La Réunion, La Saline-les-Bains.',
  body: `
<section class="page-hero compact">
  <div class="container inner">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / <span>Contact</span></nav>
    <span class="eyebrow">Contact VTT É-vasion</span>
    <h1>Parlons de <span class="hl">votre sortie</span></h1>
    <p class="lead">Une question sur le niveau, un doute sur le parcours, une envie de réserver rapidement ou de louer un E-VTT ? On vous répond simplement et on vous oriente vers la formule la plus adaptée.</p>
    <div class="chips"><span class="chip">${ic('pin')} Ouest de La Réunion</span><span class="chip">${ic('cal')} Disponibles 7j/7</span><span class="chip">${ic('clock')} Appels de 8h à 20h</span></div>
  </div>
</section>

<section class="section">
  <div class="container">
    <div class="contact-cards">
      <div class="contact-card reveal">
        <span class="ic">${ic('phone')}</span>
        <span class="eyebrow" style="margin:0">Sorties encadrées</span>
        <a class="num" href="tel:${C.tel}">${C.telLabel}</a>
        <p>Pour toutes vos questions sur les sorties encadrées — Maïdo, volcan, Route des plages, repas Peï à la ferme — ainsi que sur les niveaux, les enfants acceptés, les disponibilités ou le choix du parcours.</p>
        <a class="btn btn-volt" href="tel:${C.tel}">${ic('phone')} Appeler pour une sortie</a>
      </div>
      <div class="contact-card reveal">
        <span class="ic">${ic('bike')}</span>
        <span class="eyebrow" style="margin:0">Location autonome</span>
        <a class="num" href="tel:${C.locTel}">${C.locTelLabel}</a>
        <p>Pour louer un E-VTT en autonomie, connaître les tarifs demi-journée ou journée, vérifier le stock disponible ou demander des idées d’itinéraires selon votre niveau.</p>
        <a class="btn btn-dark" href="tel:${C.locTel}">${ic('phone')} Appeler pour une location</a>
      </div>
    </div>
  </div>
</section>

<section class="section dark">
  <div class="container split">
    <div>
      <span class="eyebrow">Infos pratiques</span>
      <h2>Organisation <span class="hl">& réservations</span></h2>
      <p class="lead" style="margin-top:16px">Les lieux exacts de départ, les horaires et les derniers détails logistiques sont confirmés directement lors de la réservation selon la sortie choisie et les conditions du jour.</p>
      <div class="highlights" style="grid-template-columns:1fr;margin-top:24px">
        <div class="hl-card"><span class="ic">${ic('mountain')}</span><p><b>Zone d’activité.</b> Ouest de La Réunion : Maïdo, Piton de la Fournaise selon conditions, Route des plages et Hauts de l’Ouest.</p></div>
        <div class="hl-card"><span class="ic">${ic('pin')}</span><p><b>Points de départ.</b> La Saline-les-Bains et secteur Ouest, avec confirmation du lieu précis après échange selon votre sortie.</p></div>
        <div class="hl-card"><span class="ic">${ic('mail')}</span><p><b>Email.</b> Pour les demandes moins urgentes : <a href="mailto:${C.email}" style="word-break:break-all">${C.email}</a></p></div>
      </div>
    </div>
    <div>
      <div class="sheet-card" style="color:var(--text)">
        <h3>Écrivez-nous</h3>
        <p style="color:var(--muted);margin:0 0 6px">Pour le plus rapide, le téléphone reste idéal. Sinon, laissez un message :</p>
        <form class="form" data-mailto="${C.email}">
          <div class="field"><label for="c-name">Nom</label><input id="c-name" name="name" autocomplete="name" required></div>
          <div class="two">
            <div class="field"><label for="c-tel">Téléphone</label><input id="c-tel" name="phone" type="tel" autocomplete="tel" inputmode="tel"></div>
            <div class="field"><label for="c-mail">Email</label><input id="c-mail" name="email" type="email" autocomplete="email"></div>
          </div>
          <div class="field"><label for="c-sub">Sujet</label><select id="c-sub" name="subject"><option>Sortie guidée</option><option>Location E-VTT</option><option>Sortie personnalisée / team-building</option><option>Autre question</option></select></div>
          <div class="field"><label for="c-msg">Message</label><textarea id="c-msg" name="message" required placeholder="Date souhaitée, nombre de personnes, niveau…"></textarea></div>
          <button class="btn btn-volt btn-block" type="submit">${ic('mail')} Envoyer le message</button>
        </form>
      </div>
    </div>
  </div>
</section>

<section class="section" id="faq">
  <div class="container" style="max-width:860px">
    <div class="section-head"><span class="eyebrow">Questions fréquentes</span><h2>Tout savoir <span class="hl">avant de rouler</span></h2></div>
    <div class="faq">
      ${FAQ.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('\n      ')}
    </div>
  </div>
</section>

${cta({
    image: 'volcan-groupe-piste', eyebrow: 'Réservation rapide',
    title: 'Prêt à rouler <span class="hl">dans l’Ouest ?</span>',
    text: 'Un appel suffit pour choisir la bonne sortie, vérifier les disponibilités ou organiser votre location E-VTT. On vous répond simplement, rapidement, et selon votre niveau.'
  })}
`
});

/* ---------- Blog ---------- */
page({
  file: 'blog.html', active: 'blog',
  title: 'Blog VTT à La Réunion – Conseils & sorties E-VTT | VTT É-vasion',
  desc: 'Conseils pour préparer votre sortie VTT à La Réunion : Maïdo, volcan Piton de la Fournaise, repas péï à la ferme. Le blog de VTT É-vasion.',
  body: `
<section class="page-hero compact">
  <div class="container inner">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / <span>Blog</span></nav>
    <span class="eyebrow">Conseils & actualités</span>
    <h1>Le blog <span class="hl">VTT É-vasion</span></h1>
    <p class="lead">Conseils pour préparer votre sortie, idées de parcours et retours d’expérience.</p>
  </div>
</section>
<section class="section">
  <div class="container">
    <div class="posts">
      ${POSTS.map((p) => `<a class="post-card reveal" href="${p.slug}.html">${img(p.card, p.title, { sizes: '(min-width:640px) 33vw, 110px' })}<div><time datetime="${p.iso}">${p.date}</time><h3>${p.title}</h3><p style="margin:8px 0 0;color:var(--muted);font-size:.92rem">${p.excerpt}</p></div></a>`).join('\n      ')}
    </div>
  </div>
</section>
${cta({ image: 'groupe-route-foret', eyebrow: 'Envie de rouler ?', title: 'Passez de la lecture <span class="hl">au guidon</span>', text: 'Choisissez votre sortie et votre date dans le calendrier : Lucas valide votre demande et vous recontacte.' })}
`
});

for (const p of POSTS) {
  const others = POSTS.filter((o) => o.slug !== p.slug);
  page({
    file: p.slug + '.html', active: 'blog', title: p.title + ' | VTT É-vasion', desc: p.excerpt,
    body: `
<section class="page-hero has-img" style="min-height:70svh">
  ${img(p.hero, p.heroAlt || p.title, { eager: true, cls: 'ph-img' })}
  <div class="container inner">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a> / <a href="blog.html">Blog</a> / <span>Article</span></nav>
    <span class="eyebrow">Blog</span>
    <h1 style="font-size:clamp(2.2rem,8vw,4.4rem);max-width:20ch">${p.title}</h1>
    <div class="post-meta"><span>${ic('cal')} <time datetime="${p.iso}">${p.date}</time></span><span>${ic('users')} Par Lucas, VTT É-vasion</span></div>
  </div>
</section>
<section class="section">
  <article class="container prose">
    ${p.body({ img, ic, C })}
  </article>
</section>
<section class="section" style="padding-top:0">
  <div class="container">
    <div class="section-head"><span class="eyebrow">À lire aussi</span><h2>D’autres <span class="hl">articles</span></h2></div>
    <div class="posts">${others.map((o) => `<a class="post-card reveal" href="${o.slug}.html">${img(o.card, o.title, { sizes: '(min-width:640px) 33vw, 110px' })}<div><time datetime="${o.iso}">${o.date}</time><h3>${o.title}</h3></div></a>`).join('')}</div>
  </div>
</section>
`
  });
}

/* ---------- Espace gérant ---------- */
fs.writeFileSync(path.join(ROOT, 'gerant.html'), `${head({
  title: 'Espace gérant – VTT É-vasion',
  desc: 'Espace gérant VTT É-vasion : validation des demandes de sorties et de locations.',
  extra: `<meta name="robots" content="noindex">
<link rel="manifest" href="gerant.webmanifest">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="É-vasion Gérant">
<link rel="stylesheet" href="${asset('assets/css/app.css')}">`
})}
<body class="admin-body">
${SPRITE}
<div class="admin" data-admin>
  <header class="adm-top">
    <a class="adm-brand" href="index.html" aria-label="Retour au site"><img src="assets/img/icon-192.png" width="36" height="36" alt=""><span><b>Espace gérant</b><small>VTT É-vasion</small></span></a>
    <span class="demo-pill">Démo</span>
    <button class="adm-bell" type="button" data-bell aria-label="Demandes à traiter">${ic('bell')}<i data-bell-count hidden></i></button>
  </header>
  <main class="adm-main" id="main">
    <section class="adm-view" data-view="demandes"></section>
    <section class="adm-view" data-view="planning" hidden></section>
    <section class="adm-view" data-view="reglages" hidden></section>
  </main>
  <nav class="adm-tabs" aria-label="Sections">
    <button type="button" data-tab="demandes" aria-current="page">${ic('list')}<span>Demandes</span><i data-tab-count hidden></i></button>
    <button type="button" data-tab="planning">${ic('cal')}<span>Planning</span></button>
    <button type="button" data-tab="reglages">${ic('sliders')}<span>Réglages</span></button>
  </nav>
</div>
<div class="toasts" data-toasts aria-live="polite"></div>
<script src="${asset('assets/js/data.js')}"></script>
<script src="${asset('assets/js/store.js')}"></script>
<script src="${asset('assets/js/gerant.js')}"></script>
</body>
</html>
`);
console.log('✓ gerant.html');

fs.writeFileSync(path.join(ROOT, 'gerant.webmanifest'), JSON.stringify({
  name: 'VTT É-vasion – Gérant', short_name: 'É-vasion Gérant', start_url: 'gerant.html', scope: './',
  display: 'standalone', background_color: '#0d100e', theme_color: '#0d100e', lang: 'fr',
  icons: [{ src: 'assets/img/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'assets/img/icon-512.png', sizes: '512x512', type: 'image/png' }]
}, null, 2));
console.log('✓ gerant.webmanifest');
