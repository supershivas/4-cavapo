// Les règles : du JS pur, sans DOM, sans hasard hors du générateur à graine,
// sans horloge (sections 10 et 12). Même graine, mêmes gestes → même partie.
// Se teste dans Node (test/).
//
// Une partie est une suite de tableaux. Dans un tableau, les quatre cavaliers
// jouent (chacun : chevaucher, puis un geste), puis les vivants fuient vers
// les abris. Les âmes fauchées dansent à la suite de la Mort : le cortège.
// Un tableau est gagné si la ronde a pris son quota d'âmes avant que les
// vivants soient à l'abri ou que le sablier soit vide.
//
// Toute fonction qui refuse rend { ok: false, raison } : la raison est une
// clé de data/textes.js (refus), montrée par l'écran (section 12).
import { createRng } from './lib/rng.js?v=0.1.0';
import { REGLAGES } from './data/reglages.js?v=0.1.0';
import { LIEUX } from './data/tableaux.js?v=0.1.0';

export const ORDRE = ['guerre', 'famine', 'peste', 'mort'];
// Ordre des voisins : l'est d'abord (les abris sont à l'est), puis nord, sud, ouest.
const DIRS = [[1, 0], [0, -1], [0, 1], [-1, 0]];
const BLOQUANT_VIVANT = new Set(['x', 'o']);  // barbelés, cratère
const BLOQUANT_CAVALIER = new Set(['o', 'A']); // cratère, abri

const cle = (x, y) => `${x},${y}`;
const copie = o => JSON.parse(JSON.stringify(o));
const refus = raison => ({ ok: false, raison, evenements: [] });

// ─── Création ──────────────────────────────────────────────────────────────
export function nouvellePartie(seed = 1, R = REGLAGES) {
  const partie = { v: 1, seed, niveau: 0, total: 0, phase: 'jeu', bilan: null, tableau: null, debutTour: null };
  partie.tableau = genererTableau(seed, 0, R);
  partie.debutTour = copie(partie.tableau);
  return partie;
}

export function genererTableau(seed, niveau, R = REGLAGES) {
  const P = R.progression;
  const { cols, rows } = R.grille;
  const lieu = LIEUX[niveau % LIEUX.length];
  const nb = Math.min(P.vivantsMax, P.vivantsBase + niveau * P.vivantsParTableau);
  const part = Math.min(P.quotaPartMax, P.quotaPart + niveau * P.quotaParTableau);
  for (let essai = 0; ; essai++) {
    const rng = createRng(`${seed}:tableau:${niveau}:${essai}`);
    const t = brouillonTableau(rng, niveau, lieu, nb, R, essai > 40);
    if (!t) continue;
    t.quota = Math.max(1, Math.round(nb * part));
    return t;
  }
}

function brouillonTableau(rng, niveau, lieu, nb, R, sansObstacles) {
  const P = R.progression;
  const { cols, rows } = R.grille;
  const sol = Array.from({ length: rows }, () => Array(cols).fill('.'));
  // Les tranchées : des lignes nord-sud qui serpentent
  for (let i = 0; i < lieu.tranchees; i++) {
    let x = rng.int(4, cols - 5);
    for (let y = 0; y < rows; y++) {
      sol[y][x] = '=';
      if (rng.chance(0.3)) {
        const nx = Math.max(3, Math.min(cols - 4, x + (rng.chance(0.5) ? 1 : -1)));
        sol[y][nx] = '=';
        x = nx;
      }
    }
  }
  const libre = (x, y) => sol[y]?.[x] === '.';
  if (!sansObstacles) {
    for (let i = 0; i < P.barbelesBase + niveau * P.barbelesParTableau; i++) {
      let x = rng.int(3, cols - 3), y = rng.int(0, rows - 1);
      const [dx, dy] = rng.chance(0.5) ? [1, 0] : [0, 1];
      for (let k = rng.int(1, 3); k > 0; k--, x += dx, y += dy) if (libre(x, y)) sol[y][x] = 'x';
    }
    for (let i = 0; i < P.crateresBase + niveau * P.crateresParTableau; i++) {
      const x = rng.int(2, cols - 3), y = rng.int(0, rows - 1);
      if (libre(x, y)) sol[y][x] = 'o';
    }
  }
  // Les abris, sur le bord est, un par bande de lignes
  for (let i = 0; i < P.abris; i++) {
    const y0 = Math.floor((i * rows) / P.abris), y1 = Math.floor(((i + 1) * rows) / P.abris) - 1;
    sol[rng.int(y0, y1)][cols - 1] = 'A';
  }
  // Les cavaliers, sur le bord ouest
  const cavaliers = ORDRE.map((id, i) => {
    const x = i % 2, y = Math.round(((i + 1) * (rows - 1)) / 5);
    sol[y][x] = '.';
    return { id, x, y, bouge: false, agi: false };
  });
  // Les vivants, au milieu du no man's land
  const types = [];
  const nbBrancardiers = niveau >= P.brancardiersDes ? 1 + Math.floor((niveau - P.brancardiersDes) / 3) : 0;
  const nbAumoniers = niveau >= P.aumoniersDes ? 1 + Math.floor((niveau - P.aumoniersDes) / 4) : 0;
  for (let i = 0; i < nb; i++) types.push(i < nbBrancardiers ? 'brancardier' : i < nbBrancardiers + nbAumoniers ? 'aumonier' : 'soldat');
  const places = [];
  for (let y = 0; y < rows; y++) for (let x = 3; x <= Math.min(cols - 6, 7); x++) if (sol[y][x] === '.' || sol[y][x] === '=') places.push([x, y]);
  rng.shuffle(places);
  if (places.length < nb) return null;
  const vivants = types.map((type, i) => {
    const [x, y] = places[i];
    return { id: `v${i + 1}`, type, x, y, pv: R.vivants[type].pv, etat: 'debout', infecte: false, affame: false };
  });
  const t = {
    lieu: lieu.cle, nom: lieu.nom, niveau, cols, rows,
    sol: sol.map(r => r.join('')),
    tour: 1, tours: P.tours, quota: 1, ames: 0, refugies: 0, echappes: 0,
    cavaliers, vivants, cortege: [],
  };
  // Chaque vivant doit pouvoir atteindre un abri (par le terrain seul)
  for (const v of vivants) if (!cheminVivant(t, v, { ignorerUnites: true })) return null;
  return t;
}

// ─── Lecture du plateau ────────────────────────────────────────────────────
export const terrain = (t, x, y) => (x < 0 || y < 0 || x >= t.cols || y >= t.rows ? null : t.sol[y][x]);
export const cavalierEn = (t, x, y) => t.cavaliers.find(c => c.x === x && c.y === y);
export const vivantEn = (t, x, y) => t.vivants.find(v => v.x === x && v.y === y);
export const ameEn = (t, x, y) => t.cortege.findIndex(a => a.x === x && a.y === y);
const debouts = t => t.vivants.filter(v => v.etat === 'debout');
const occupe = (t, x, y) => !!cavalierEn(t, x, y) || !!vivantEn(t, x, y) || ameEn(t, x, y) >= 0;

// Plus court chemin (largeur d'abord), voisins dans l'ordre DIRS : déterministe.
function bfs(t, depart, { passe, but, max = Infinity }) {
  const prec = new Map([[cle(depart.x, depart.y), null]]);
  let front = [[depart.x, depart.y, 0]];
  while (front.length) {
    const suite = [];
    for (const [x, y, d] of front) {
      if (d >= max) continue;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, k = cle(nx, ny);
        if (prec.has(k) || terrain(t, nx, ny) === null) continue;
        if (but && but(nx, ny)) {
          prec.set(k, cle(x, y));
          return remonter(prec, k);
        }
        if (!passe(nx, ny)) continue;
        prec.set(k, cle(x, y));
        suite.push([nx, ny, d + 1]);
      }
    }
    front = suite;
  }
  return but ? null : prec;
}
function remonter(prec, k) {
  const chemin = [];
  for (let c = k; prec.get(c) !== null; c = prec.get(c)) chemin.unshift(c.split(',').map(Number));
  return chemin.map(([x, y]) => ({ x, y }));
}

// Ce qu'un cavalier traverse : Guerre, Famine et Peste passent entre les
// leurs, sur les gisants et à travers la ronde ; la Mort, qui traîne son
// cortège, ne passe que par des cases libres (sinon un danseur tomberait
// sur une case déjà prise).
function passeCavalier(t, c) {
  return (x, y) => {
    if (BLOQUANT_CAVALIER.has(terrain(t, x, y))) return false;
    const v = vivantEn(t, x, y);
    if (v && v.etat === 'debout') return false;
    if (c.id === 'mort') return !occupe(t, x, y);
    return true;
  };
}

export function deplacementsPossibles(t, id, R = REGLAGES) {
  const c = t.cavaliers.find(c => c.id === id);
  if (!c || c.bouge || c.agi) return [];
  const prec = bfs(t, c, { passe: passeCavalier(t, c), max: R.cavaliers[id].mouvement });
  const out = [];
  for (const k of prec.keys()) {
    const [x, y] = k.split(',').map(Number);
    if ((x !== c.x || y !== c.y) && !occupe(t, x, y)) out.push({ x, y });
  }
  return out;
}

export function ciblesPossibles(t, id, R = REGLAGES) {
  const c = t.cavaliers.find(c => c.id === id);
  if (!c || c.agi) return [];
  const voisins = DIRS.map(([dx, dy]) => vivantEn(t, c.x + dx, c.y + dy)).filter(Boolean);
  if (id === 'guerre') return voisins.filter(v => v.etat === 'debout').map(({ x, y }) => ({ x, y }));
  if (id === 'famine') return dansRayon(t, c, R.cavaliers.famine.rayon).map(({ x, y }) => ({ x, y }));
  if (id === 'peste') return DIRS.map(d => tir(t, c, d, R.cavaliers.peste.portee)).filter(Boolean).map(({ x, y }) => ({ x, y }));
  if (id === 'mort') return voisins.filter(v => fauchable(t, v, R) === true).map(({ x, y }) => ({ x, y }));
  return [];
}

const dansRayon = (t, c, r) => debouts(t).filter(v => Math.max(Math.abs(v.x - c.x), Math.abs(v.y - c.y)) <= r);

// La flèche de Peste : le premier vivant debout dans la ligne ; un cavalier
// ou un danseur l'arrête, elle passe au-dessus du terrain et des gisants.
function tir(t, c, [dx, dy], portee) {
  for (let i = 1; i <= portee; i++) {
    const x = c.x + dx * i, y = c.y + dy * i;
    if (terrain(t, x, y) === null) return null;
    if (cavalierEn(t, x, y) || ameEn(t, x, y) >= 0) return null;
    const v = vivantEn(t, x, y);
    if (v && v.etat === 'debout') return v;
  }
  return null;
}

// true, ou la raison du refus
function fauchable(t, v, R) {
  if (v.etat === 'gisant') return true;
  if (v.pv > R.cavaliers.mort.seuil) return 'tropVivant';
  const garde = debouts(t).some(a => a.type === 'aumonier' && a !== v && Math.abs(a.x - v.x) + Math.abs(a.y - v.y) === 1);
  return garde ? 'veille' : true;
}

// ─── Les gestes des cavaliers ──────────────────────────────────────────────
export function deplacer(partie, id, x, y, R = REGLAGES) {
  const t = partie.tableau;
  if (partie.phase !== 'jeu') return refus('finie');
  const c = t.cavaliers.find(c => c.id === id);
  if (!c) return refus('inconnu');
  if (c.agi) return refus('dejaAgi');
  if (c.bouge) return refus('dejaBouge');
  if (terrain(t, x, y) === null || BLOQUANT_CAVALIER.has(terrain(t, x, y))) return refus('infranchissable');
  if (occupe(t, x, y)) return refus('occupe');
  const chemin = bfs(t, c, { passe: passeCavalier(t, c), but: (bx, by) => bx === x && by === y, max: R.cavaliers[id].mouvement });
  if (!chemin || chemin.length > R.cavaliers[id].mouvement) return refus('tropLoin');
  const depart = { x: c.x, y: c.y };
  if (id === 'mort') {
    // Le cortège suit pas à pas : chaque danseur prend la place de celui qui le précède
    for (const p of chemin) {
      let prev = { x: c.x, y: c.y };
      for (const a of t.cortege) { const ici = { x: a.x, y: a.y }; a.x = prev.x; a.y = prev.y; prev = ici; }
      c.x = p.x; c.y = p.y;
    }
  } else {
    c.x = x; c.y = y;
  }
  c.bouge = true;
  return { ok: true, evenements: [{ type: 'chevauche', id, de: depart, chemin }] };
}

export function agir(partie, id, x, y, R = REGLAGES) {
  const t = partie.tableau;
  if (partie.phase !== 'jeu') return refus('finie');
  const c = t.cavaliers.find(c => c.id === id);
  if (!c) return refus('inconnu');
  if (c.agi) return refus('dejaAgi');
  const ev = [];
  const v = vivantEn(t, x, y);
  const adjacent = Math.abs(x - c.x) + Math.abs(y - c.y) === 1;

  if (id === 'guerre') {
    if (!v || v.etat !== 'debout' || !adjacent) return refus('pasDeCible');
    const G = R.cavaliers.guerre;
    ev.push({ type: 'frappe', id, cible: v.id, x, y });
    blesser(t, v, G.degats, ev);
    if (v.etat === 'debout' && terrain(t, x, y) !== '=') {
      // La poussée : une case plus loin, dans le sens du coup
      const nx = x + (x - c.x), ny = y + (y - c.y);
      const tn = terrain(t, nx, ny);
      const obstacle = vivantEn(t, nx, ny);
      if (tn === null || tn === 'o' || tn === 'A' || occupe(t, nx, ny)) {
        ev.push({ type: 'choc', id: v.id, x: nx, y: ny });
        blesser(t, v, G.choc, ev);
        if (obstacle && obstacle.etat === 'debout') blesser(t, obstacle, G.choc, ev);
      } else {
        v.x = nx; v.y = ny;
        ev.push({ type: 'pousse', id: v.id, de: { x, y }, vers: { x: nx, y: ny } });
        if (tn === 'x') { v.affame = true; ev.push({ type: 'pris', id: v.id }); }
      }
    }
  } else if (id === 'famine') {
    const autour = dansRayon(t, c, R.cavaliers.famine.rayon);
    if (!autour.length) return refus('personneAutour');
    if (!autour.some(a => a.x === x && a.y === y) && !(x === c.x && y === c.y)) return refus('pasDeCible');
    for (const a of autour) a.affame = true;
    ev.push({ type: 'pese', id, cibles: autour.map(a => a.id) });
  } else if (id === 'peste') {
    const d = [Math.sign(x - c.x), Math.sign(y - c.y)];
    if ((x !== c.x && y !== c.y) || (x === c.x && y === c.y)) return refus('personneEnLigne');
    const touche = tir(t, c, d, R.cavaliers.peste.portee);
    if (!touche || touche.x !== x || touche.y !== y) return refus(touche ? 'pasDeCible' : 'personneEnLigne');
    ev.push({ type: 'decoche', id, cible: touche.id, de: { x: c.x, y: c.y }, vers: { x, y } });
    if (touche.infecte) blesser(t, touche, R.cavaliers.peste.degats, ev);
    if (touche.etat === 'debout') { touche.infecte = true; ev.push({ type: 'contamine', id: touche.id }); }
  } else if (id === 'mort') {
    if (!v || !adjacent) return refus('pasDeCible');
    const ok = fauchable(t, v, R);
    if (ok !== true) return refus(ok);
    entrerDansLaRonde(t, v, 'fauche', ev);
  }
  c.agi = true;
  c.bouge = true;
  verifierFin(partie, false, ev);
  return { ok: true, evenements: ev };
}

function blesser(t, v, n, ev) {
  if (v.etat !== 'debout') return;
  v.pv = Math.max(0, v.pv - n);
  ev.push({ type: 'blesse', id: v.id, pv: v.pv });
  if (v.pv === 0) { v.etat = 'gisant'; v.infecte = false; v.affame = false; ev.push({ type: 'tombe', id: v.id, x: v.x, y: v.y }); }
}

function entrerDansLaRonde(t, v, comment, ev) {
  t.vivants.splice(t.vivants.indexOf(v), 1);
  t.cortege.push({ x: v.x, y: v.y });
  t.ames++;
  ev.push({ type: comment, id: v.id, x: v.x, y: v.y, ames: t.ames });
}

// ─── Le tour des vivants ───────────────────────────────────────────────────
export function finirTour(partie, R = REGLAGES) {
  if (partie.phase !== 'jeu') return refus('finie');
  const t = partie.tableau;
  const ev = tourDesVivants(t, R);
  t.tour++;
  for (const c of t.cavaliers) { c.bouge = false; c.agi = false; }
  ev.push({ type: 'tour', tour: t.tour });
  verifierFin(partie, true, ev);
  if (partie.phase === 'jeu') partie.debutTour = copie(t);
  return { ok: true, evenements: ev };
}

function tourDesVivants(t, R) {
  const ev = [];
  // 1. La contagion : les contaminés s'affaiblissent et contaminent leurs voisins
  const contamines = debouts(t).filter(v => v.infecte);
  const nouveaux = new Set();
  for (const v of contamines) {
    for (const [dx, dy] of DIRS) {
      const w = vivantEn(t, v.x + dx, v.y + dy);
      if (w && w.etat === 'debout' && !w.infecte) nouveaux.add(w);
    }
  }
  for (const v of contamines) blesser(t, v, R.contagion.degats, ev);
  for (const w of nouveaux) if (w.etat === 'debout') { w.infecte = true; ev.push({ type: 'contamine', id: w.id }); }

  // 2. La ronde : un vivant pris entre assez de danseurs entre dans la danse
  const mort = t.cavaliers.find(c => c.id === 'mort');
  const danseur = (x, y) => ameEn(t, x, y) >= 0 || (mort.x === x && mort.y === y);
  for (const v of debouts(t)) {
    const n = DIRS.filter(([dx, dy]) => danseur(v.x + dx, v.y + dy)).length;
    if (n >= R.ronde.entrainement) entrerDansLaRonde(t, v, 'entraine', ev);
  }

  // 3. Chacun son tour, le plus proche d'un abri d'abord
  const ordre = debouts(t)
    .map(v => ({ v, d: cheminVivant(t, v, { ignorerUnites: true })?.length ?? Infinity }))
    .sort((a, b) => a.d - b.d || Number(a.v.id.slice(1)) - Number(b.v.id.slice(1)))
    .map(o => o.v);
  for (const v of ordre) {
    if (v.etat !== 'debout' || !t.vivants.includes(v)) continue;
    if (v.affame) { v.affame = false; ev.push({ type: 'immobile', id: v.id }); continue; }
    if (v.type === 'brancardier' && soigner(t, v, R, ev) === 'releve') continue;
    marcher(t, v, R, ev);
  }
  return ev;
}

// Le brancardier relève un gisant voisin (et ne bouge pas), ou soigne un voisin
function soigner(t, b, R, ev) {
  const voisins = DIRS.map(([dx, dy]) => vivantEn(t, b.x + dx, b.y + dy)).filter(Boolean);
  const gisant = voisins.find(v => v.etat === 'gisant');
  if (gisant) {
    gisant.etat = 'debout'; gisant.pv = 1; gisant.affame = true; // relevé, il reprend son souffle
    ev.push({ type: 'releve', id: gisant.id, par: b.id });
    return 'releve';
  }
  const blesse = [b, ...voisins].find(v => v.etat === 'debout' && (v.infecte || v.pv < R.vivants[v.type].pv));
  if (blesse) {
    blesse.infecte = false;
    blesse.pv = Math.min(R.vivants[blesse.type].pv, blesse.pv + R.vivants.brancardier.soin);
    ev.push({ type: 'soigne', id: blesse.id, par: b.id, pv: blesse.pv });
  }
  return 'soigne';
}

function cheminVivant(t, v, { ignorerUnites = false } = {}) {
  return bfs(t, v, {
    but: (x, y) => terrain(t, x, y) === 'A',
    passe: (x, y) => {
      if (BLOQUANT_VIVANT.has(terrain(t, x, y))) return false;
      if (ignorerUnites) return true;
      return !occupe(t, x, y);
    },
  });
}

function marcher(t, v, R, ev) {
  // Un chemin libre ; sinon le chemin du terrain, en attendant que la place se libère
  const chemin = cheminVivant(t, v) || cheminVivant(t, v, { ignorerUnites: true });
  if (!chemin) return;
  const pas = [];
  for (const p of chemin.slice(0, R.vivants[v.type].mouvement)) {
    if (terrain(t, p.x, p.y) !== 'A' && occupe(t, p.x, p.y)) break;
    pas.push(p);
    if (terrain(t, p.x, p.y) === 'A') break;
  }
  if (!pas.length) return;
  const de = { x: v.x, y: v.y };
  const fin = pas[pas.length - 1];
  v.x = fin.x; v.y = fin.y;
  ev.push({ type: 'marche', id: v.id, de, chemin: pas });
  if (terrain(t, fin.x, fin.y) === 'A') {
    t.vivants.splice(t.vivants.indexOf(v), 1);
    t.refugies++;
    ev.push({ type: 'refugie', id: v.id, x: fin.x, y: fin.y });
  }
}

// ─── Fin du tableau, suite de la partie ────────────────────────────────────
function verifierFin(partie, finDeTour, ev) {
  const t = partie.tableau;
  const restants = debouts(t).length;
  const sablierVide = t.tour > t.tours;
  // Plus personne debout ni à terre : inutile d'attendre la fin du tour
  const fini = finDeTour ? restants === 0 || sablierVide : t.vivants.length === 0;
  if (!fini) return;
  t.echappes = restants;
  const victoire = t.ames >= t.quota;
  partie.total += t.ames;
  partie.phase = victoire ? 'bilan' : 'fin';
  partie.bilan = { victoire, ames: t.ames, quota: t.quota, refugies: t.refugies, echappes: restants, perdus: t.vivants.length - restants, niveau: t.niveau };
  ev.push({ type: 'fin', ...partie.bilan });
}

export function tableauSuivant(partie, R = REGLAGES) {
  if (partie.phase !== 'bilan') return refus('finie');
  partie.niveau++;
  partie.tableau = genererTableau(partie.seed, partie.niveau, R);
  partie.debutTour = copie(partie.tableau);
  partie.phase = 'jeu';
  partie.bilan = null;
  return { ok: true, evenements: [{ type: 'tableau', niveau: partie.niveau }] };
}

// Revenir au début du tour (les gestes des cavaliers sont oubliés)
export function recommencerTour(partie) {
  if (partie.phase !== 'jeu') return refus('finie');
  partie.tableau = copie(partie.debutTour);
  return { ok: true, evenements: [{ type: 'recommence' }] };
}

// Ce que feront les vivants si le tour finit maintenant : la vérité, pas une
// estimation (le tour des vivants est joué sur une copie).
export function prevoir(partie, R = REGLAGES) {
  const t = copie(partie.tableau);
  const ev = tourDesVivants(t, R);
  const out = new Map();
  for (const v of debouts(partie.tableau)) out.set(v.id, { id: v.id, de: { x: v.x, y: v.y }, chemin: [], issue: 'reste' });
  for (const e of ev) {
    const o = out.get(e.id);
    if (!o) continue;
    if (e.type === 'marche') o.chemin = e.chemin;
    else if (e.type === 'refugie') o.issue = 'refugie';
    else if (e.type === 'entraine') o.issue = 'entraine';
    else if (e.type === 'tombe') o.issue = 'tombe';
    else if (e.type === 'immobile') o.issue = 'immobile';
  }
  return [...out.values()];
}

// Le juge des invariants, partagé par les tests et la sauvegarde :
// chaque case porte au plus une unité, chaque unité est sur le plateau.
export function invariants(partie) {
  const t = partie.tableau;
  const erreurs = [];
  const vues = new Map();
  const poser = (x, y, quoi) => {
    if (terrain(t, x, y) === null) erreurs.push(`${quoi} hors du plateau (${x},${y})`);
    const k = cle(x, y);
    if (vues.has(k)) erreurs.push(`${quoi} et ${vues.get(k)} sur la même case (${k})`);
    vues.set(k, quoi);
  };
  for (const c of t.cavaliers) poser(c.x, c.y, c.id);
  for (const v of t.vivants) {
    poser(v.x, v.y, v.id);
    if (v.etat === 'debout' && v.pv <= 0) erreurs.push(`${v.id} debout sans PV`);
    if (v.etat === 'debout' && BLOQUANT_VIVANT.has(terrain(t, v.x, v.y)) && terrain(t, v.x, v.y) !== 'x') erreurs.push(`${v.id} dans un cratère`);
  }
  t.cortege.forEach((a, i) => poser(a.x, a.y, `danseur ${i}`));
  if (t.cortege.length !== t.ames) erreurs.push(`cortège ${t.cortege.length} ≠ âmes ${t.ames}`);
  return erreurs;
}
