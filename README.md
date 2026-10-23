# VTT É-vasion — nouvelle version du site (démo)

Refonte complète de [vtte-vasion.fr](https://vtte-vasion.fr/) (WordPress/Elementor) en site statique rapide, pensé d'abord pour le téléphone, avec un **calendrier de réservation** et un **espace gérant** pour valider les demandes depuis le téléphone.

Mêmes photos, mêmes textes et mêmes infos que le site actuel ; le mot « descente » a été remplacé par « sortie » partout.

## Pages

| Page | Fichier |
|---|---|
| Accueil | `index.html` |
| Sorties | `sortie-maido.html`, `sortie-volcan.html`, `sortie-route-des-plages.html`, `sortie-repas-pei.html` |
| Location E-VTT | `location-e-vtt.html` |
| Calendrier / réservation | `reserver.html` |
| Contact + FAQ | `contact.html` |
| Blog + 3 articles | `blog.html`, `blog-*.html` |
| Espace gérant (téléphone) | `gerant.html` (lien discret en bas de chaque page) |

## Le calendrier

**Côté client (`reserver.html`)**
- Choix *Sortie guidée* ou *Location E-VTT*, puis d'une date.
- Chaque sortie a un **minimum** et un **maximum** de participants. Un groupe trop petit peut quand même proposer sa date : il apparaît dans le calendrier comme « groupe ouvert » (ex. « il manque 2 pers. ») et d'autres personnes peuvent le **rejoindre** pour atteindre le minimum.
- Le client peut partager le lien de son groupe (`reserver.html?groupe=…`).
- Location : le calendrier affiche les vélos libres par demi-journée (flotte limitée).
- Aucune demande n'est automatique : tout est **à valider par le gérant**.

**Côté gérant (`gerant.html`)** — conçu comme une appli de téléphone (installable sur l'écran d'accueil)
- Liste des demandes à traiter : groupes en formation, groupes prêts (minimum atteint), locations.
- **Conflits** signalés avant de valider : vélos insuffisants quand une sortie et une location se chevauchent, autre sortie le même jour, jour fermé. Le gérant choisit : accepter l'un, l'autre, ou les deux « quand même ».
- Boutons appeler / SMS, SMS de confirmation pré-rempli après validation, annulation possible (« Annuler » pendant 5 s).
- Planning des 30 prochains jours avec l'occupation des vélos matin / après-midi.
- Réglages : nombre de vélos, minimum / maximum / prix de chaque sortie, jours fermés.

### Mode démo
Pour la démonstration, les demandes sont enregistrées **dans le navigateur** (localStorage) : on peut tout tester sur un même appareil (réserver côté client, puis valider dans l'espace gérant). Des demandes d'exemple sont créées automatiquement ; « Réglages › Réinitialiser la démo » les remet à zéro.

### Pour la mise en production
- Brancher `assets/js/store.js` (fonctions `load` / `save`) sur une vraie base partagée (ex. Supabase ou Firebase, offre gratuite suffisante) — le reste du code ne change pas.
- Notifications sur le téléphone de Lucas à chaque nouvelle demande (notification push, SMS ou e-mail).
- Protéger `gerant.html` par une connexion.
- Ajouter les mentions légales et la politique de confidentialité.

## Animations
Gérées par `assets/js/motion.js` (+ fin de `style.css` et `app.css`) : titre qui apparaît mot à mot, apparitions en cascade au défilement, compteurs, photos en rideau et parallaxe, bandeaux croisés, parcours qui se trace avec un vélo qui le suit, cartes qui s'inclinent à la souris, en-tête qui se rétracte, transitions entre les pages, confettis à la confirmation d'une demande. Tout est désactivé automatiquement si le téléphone est réglé sur « réduire les animations ».

Écran de chargement animé (éclair, logo, barre avec le vélo) : affiché une seule fois par visite, il attend la photo du héros (4 s maximum).

## Photos
Chaque photo existe en AVIF (léger) et WebP, en 480 à 2400 px, avec un recadrage vertical pour les grandes photos sur téléphone et un aperçu flou affiché pendant le chargement. Le diaporama de l'accueil ne passe à une photo que lorsqu'elle est chargée. Le générateur (`node _build/build.mjs`) s'arrête si une page référence une image absente.

## À valider avec le client
- Minimums de participants par sortie (valeurs provisoires : Maïdo 4, Volcan 4, Repas Peï 4, Route des plages 2 ; maximum 7 comme sur le site actuel).
- Nombre de vélos dans la flotte (provisoire : 8).
- Créneaux : Maïdo le matin (départ 8h30), Volcan et Repas Peï à la journée, Route des plages en demi-journée (matin ou après-midi).
- « BPEJEPS » du site actuel corrigé en « BPJEPS ».

## Modifier le site
Les pages sont générées à partir de gabarits communs (en-tête, menu, pied de page) :

```bash
node _build/build.mjs
```

- Textes des sorties, articles et FAQ : `_build/content.mjs`
- Mise en page des pages : `_build/build.mjs`
- Styles : `assets/css/style.css` (site) et `assets/css/app.css` (calendrier + gérant)
- Tarifs, téléphones, minimums par défaut : `assets/js/data.js`

Aperçu local : `python -m http.server 5180` puis http://localhost:5180
