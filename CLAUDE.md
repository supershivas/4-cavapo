@.claude/conventions-jeu.md

# Les 4 cavaliers

<!-- Ce fichier ne décrit QUE le jeu actuel (section 15 des conventions).
     Ce qui a été essayé puis retiré part dans docs/archives/, avec sa raison.
     Chaque règle porte son coût : le bug, la mesure ou la raison qui l'a fait naître. -->

## Description

Tactique au tour par tour. Une uchronie de la Grande Guerre : le front ne
s'arrête plus, et quatre cavaliers — Guerre, Famine, Peste, Mort — mènent la
danse. Le joueur les commande tous les quatre. À chaque tour, chacun chevauche
puis fait son geste ; ensuite les vivants fuient vers les abris. Les âmes
fauchées dansent à la suite de la Mort et forment la ronde, qui barre le
passage et entraîne les vivants qu'elle touche. Un tableau est gagné si la
ronde a pris son quota ; la partie dure tant que la ronde continue.
L'intention complète est dans `DESIGN.md`.

- **Production** : https://supershivas.github.io/4-cavapo/
- **Aperçu** : https://supershivas.github.io/4-cavapo/apercu.html (le jeu dans un cadre de téléphone)
- **Genre** : Stratégie — tactique au tour par tour (GENRES.md, famille D), en
  parties courtes qui recommencent (roguelite sans déblocage).
- **Vue et rendu** : de dessus, pixel art 2D avec Phaser ; profil
  `profils/pixel-2d-phaser.md` de game-system.
- **Cible** : bureau (clavier et souris). Le téléphone n'est qu'un aperçu.
- **Public** : joueur averti.
- **Session** : partie courte qui recommence ; critère : une partie dure
  15 minutes intenses (voir DESIGN.md, « Le lot minimal »).
- **Steam** : porte ouverte (section 22). Exception : pas de manette pour
  l'instant (voir « Exceptions »).
- **Langue** : français seulement (pas de `i18n.js`).
- Jeu : pas de sous-titre (section 3 des conventions).

### Palette « boue et linceul »

Douze couleurs. Source unique : `js/palette.js` (lettres des sprites et rôles
`--jeu-*` du CSS). Identique entre canvas, interface et écran titre.

| Lettre | Valeur | Nom | Rôle |
|---|---|---|---|
| `n` | `#14111c` | nuit | le fond, le cheval de Famine, les contours |
| `s` | `#2b2530` | suie | panneaux, soutanes, fonds de cratère |
| `b` | `#4d4038` | boue | le sol |
| `t` | `#7a6450` | terre | bois, piquets, caillebotis |
| `k` | `#8a8660` | kaki | uniformes, sacs de sable, contour de Famine |
| `v` | `#6f8f7e` | vert-de-gris | le cheval pâle de la Mort, la contagion |
| `a` | `#46566b` | acier | casques, barbelés, armure de Guerre |
| `o` | `#d9ceb0` | os | l'encre, les squelettes, les cases où chevaucher |
| `l` | `#f2ead6` | linceul | le cheval de Peste, texte fort, chemin vers l'abri |
| `r` | `#a0302a` | sang | crinière de Guerre, croix du brancardier |
| `e` | `#d86a3a` | braise | le cheval de Guerre, les cibles, les PV, les refus |
| `c` | `#c9a24a` | cire | la balance, le curseur, les pointillés des vivants |

Pas de transparence : le voile des dialogues est retiré (`::backdrop`
transparent), un éclat se fait en cachant / montrant, jamais en fondu.
Les quatre chevaux sont cernés (nuit, ou kaki pour le cheval noir) : la paire
qui compte est la couleur et son contour. Le cheval de Guerre était `r` :
1,3:1 contre la boue, invisible en niveaux de gris ; il est passé en braise
(mesuré par `outils/lisibilite.mjs`, v0.1.0).

### Échelle

- Résolution logique : **640 × 360**, facteur entier en pixels physiques,
  bandes de nuit autour (écran fixe). ×2 en 1280 × 720, ×3 en 1080p.
- **Une case = 24 px = un cavalier** (cheval et cavalier tiennent dans la
  case). Un vivant debout fait 16 px de haut, à l'encolure du cheval ; un
  danseur de la ronde, la même taille qu'un vivant ; un gisant est couché
  sur 18 px.
- Plateau : 15 × 11 cases (360 × 264), posé en (140, 44). Interface autour :
  cartes des cavaliers à gauche, fiche à droite, bandeau en haut, pied en bas.
- La planche d'échelle est le sujet « Échelle » du labo.

### Commandes

| Action | Clavier | Souris |
|---|---|---|
| Choisir un cavalier | 1 à 4 (rangée ou pavé) | clic sur lui ou sur sa carte |
| Déplacer le curseur | flèches, ZQSD / WASD | survol |
| Chevaucher / agir sur la case | Entrée, Espace | clic sur la case (cadre d'os : chevaucher ; cadre de braise : le geste) |
| Désélectionner | Échap | clic droit, clic hors du plateau |
| Fin du tour | F | bouton « Fin du tour » |
| Recommencer le tour | R | bouton « Recommencer le tour » |
| Pause | Échap (sans sélection), P | bouton pause |

Un clic pendant une animation l'achève aussitôt (le joueur n'attend jamais).
Famine agit aussi par un clic sur elle-même.

## Stack

- Vanilla JS, modules ES, sans build ; GitHub Pages par le workflow
  `.github/workflows/pages.yml` (tests avant publication).
- **Phaser 3.90.0** dans `vendor/phaser.min.js` avec sa licence (accord de
  Jérôme, v0.1.0), chargé par un `<script>` classique avant les modules.
  Rendu **CANVAS**, pas WebGL : palette exacte, et le jeu tourne sans carte
  graphique. Phaser ne fait que dessiner : ses entrées (clavier, souris)
  sont coupées, les commandes passent par `keys.js` et `pointer.js`.
- Modules de game-system dans `js/lib/` (tenus à jour par
  `scripts/sync-game-system.sh` au début de chaque session) : app-update,
  audio, debug, game.css, gh-publish, keys, labo-shell, pixel-editor,
  pointer, rng, save, sprites. Outils dans `outils/`.
- Données : `localStorage`, clés `4-cavapo:partie` (la danse en cours),
  `4-cavapo:meta` (le record, seule progression permanente),
  `4-cavapo:prefs`, `4-cavapo:atelier` (brouillon de l'atelier),
  `4-cavapo:gh-token` (jamais exporté). Export / import JSON dans les réglages.
- Onglet caché ou fenêtre quittée : pause (et la ronde se tait).

## Structure

- `index.html` — écran titre (avec la frise), interface en jeu, dialogues
  (pause, réglages, confirmation, bilan), rattachés au body.
- `apercu.html` — le jeu dans un cadre de téléphone (iframe à la vraie taille).
- `js/main.js` — cycle de vie, interface, commandes, bilan, debug.
- `js/game.js` — **les règles, pures** : génération des tableaux (graine),
  gestes des cavaliers, tour des vivants, ronde, fin de tableau, `prevoir()`
  (ce que feront les vivants, joué sur une copie : la vérité, pas une
  estimation), `invariants()` (juge partagé par les tests).
- `js/rendu.js` — le dessin Phaser, partagé jeu / labo ; ne modifie jamais
  l'état. Échelle entière, animations des trajets, surcouches (cases,
  cibles, intentions, PV).
- `js/musique.js` — la ronde générative (3/4, ré mineur avec triton, qui
  accélère avec le sablier) et la banque de bruitages.
- `js/palette.js`, `js/sprites-data.js` — la palette et les sprites
  (matrices de lettres, retouchables dans l'atelier).
- `js/data/reglages.js` (tous les nombres), `js/data/tableaux.js` (les lieux),
  `js/data/textes.js` (tous les textes, clés stables, et les raisons de refus).
- `js/design-store.js` — contenu publié par l'atelier (`assets/design/`) plus
  le brouillon de ce navigateur.
- `labo.html`, `js/labo.js` — le labo : échelle, palette, sprites, tableaux
  rendus par `rendu.js`, bruitages, la ronde à trois tensions.
- `atelier.html`, `js/atelier.js`, `css/atelier.css` — l'atelier : dessins
  (éditeur de pixels) et publication.
- `test/regles.test.mjs` — règles, sauvegarde, dessins ; `test/bot.mjs` — un
  joueur glouton (plancher d'équilibrage, utilisé par les tests).
- `lisibilite.config.mjs` — paires de couleurs, silhouettes, poses.

## Vérifier et livrer

```bash
node outils/test-run.mjs                                    # règles, équilibre, sauvegarde, dessins
node outils/captures.mjs --clic "#nouvelle"                 # en jeu, téléphone + bureau, sans erreur console
node outils/captures.mjs --page labo.html --page atelier.html
node outils/audit-ecran.mjs --ecrans bureau,bureau_125,telephone --page index.html --page labo.html --page atelier.html
node outils/audit-ecran.mjs --ecrans bureau,bureau_125 --clic "#nouvelle"
node outils/lisibilite.mjs                                  # contraste, silhouettes
node outils/stamp-version.mjs                               # après chaque changement de version.json
```

Équilibrage : le bot glouton (`test/bot.mjs`) sert de plancher. Mesure de
v0.1.0, 30 graines : tableaux gagnés p25 3, médiane 4, p75 5 ; 31 tours en
médiane, soit ≈ 15 min à 30 s par tour. Le test exige qu'il gagne le premier
tableau au moins 16 fois sur 20, et l'inaction n'en gagne jamais.

## Exceptions aux conventions

- **Pas de manette** (section 22) : décision de Jérôme au démarrage (clavier
  et souris, v0.1.0). `gamepad.js` est retiré ; à rajouter avant Steam.
- **Pas de boucle à pas fixe** (section 9) : les règles avancent par tours,
  jamais par le temps. Le seul temps est celui des animations (tweens
  Phaser, accélérés par `__jeu.timeScale`). `loop.js` et `pixel-canvas.js`
  sont retirés ; la mise à l'échelle entière est refaite dans `rendu.js`
  d'après `pixel-canvas.js` (Phaser tient son propre canevas).
- **Musique** : la ronde a son propre gain, branché sur la destination, car
  `audio.js` n'expose pas son canal musique. Le volume musique des réglages
  la pilote.

## Ce qui a été retiré

| Quoi | Version | Pourquoi (ce que ça coûtait) |
|---|---|---|
| Le jeu des étoiles du départ | 0.1.0 | remplacé par le tableau tactique |
| Onglet « Réglages » de l'atelier | 0.1.0 | seul l'atelier de dessins a été retenu |

## Pièges connus

- **Variable `--jeu-cible`** : le rôle de couleur `cible` de la palette
  écrasait la taille des cibles tactiles (`--jeu-cible: 44px`), et tous les
  boutons tombaient à 22 px. Le rôle s'appelle `braise`. Ne jamais nommer un
  rôle de palette comme une variable de `game.css`.
- **`TweenChain.complete()` plante en Phaser 3.90** (« Cannot read
  properties of null (reading 'onComplete') ») : pour achever les
  animations, `rendu.achever()` arrête tout et pose chaque image à sa place.
- **La Mort ne traverse rien** : si elle passait par une case occupée, le
  cortège (qui reprend ses cases pas à pas) y poserait un danseur sur une
  unité. Les trois autres passent entre les leurs et à travers la ronde.
- **Phaser sonde WebGL même en rendu CANVAS** : dans Chromium sans carte
  graphique, la console affiche un avertissement « Automatic fallback to
  software WebGL » ; ce n'est pas une erreur du jeu.
