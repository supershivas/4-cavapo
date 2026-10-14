// Le cycle de vie : écran titre → partie → pause ; réglages, sauvegarde,
// mise à jour, debug. Les règles sont dans game.js, le dessin dans rendu.js.
import { createKeys, stopTypeahead } from './lib/keys.js?v=0.1.0';
import { createPointer, lockBrowserGestures } from './lib/pointer.js?v=0.1.0';
import { createStore, autosave, pickJSONFile } from './lib/save.js?v=0.1.0';
import { createAudio } from './lib/audio.js?v=0.1.0';
import { startUpdateCheck, loadVersion, loadChangelog, downloadJSON } from './lib/app-update.js?v=0.1.0';
import { spriteCanvas } from './lib/sprites.js?v=0.1.0';
import { PALETTE, ROLES } from './palette.js?v=0.1.0';
import * as Regles from './game.js?v=0.1.0';
import { creerRendu } from './rendu.js?v=0.1.0';
import { chargerContenu } from './design-store.js?v=0.1.0';
import { TEXTES } from './data/textes.js?v=0.1.0';
import { creerRonde, BRUITAGES } from './musique.js?v=0.1.0';

const JEU = '4-cavapo';
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const params = new URLSearchParams(location.search);
const DEBUG = params.has('debug');

// Une seule source pour les couleurs : la palette, posée en variables CSS
for (const [role, couleur] of Object.entries(ROLES)) document.documentElement.style.setProperty(`--jeu-${role}`, couleur);

const store = createStore({
  game: JEU,
  debug: DEBUG,
  entries: {
    partie: { version: 1 },
    meta: { version: 1, defaults: { record: { ames: 0, tableaux: 0 }, parties: 0 } },   // progression permanente : le record seul
    prefs: { version: 1, debugWrites: false, defaults: { musique: 70, effets: 80 } },
  },
  secret: ['gh-token'],
});
const prefs = store.load('prefs');
const audio = createAudio({ music: prefs.musique / 100, sfx: prefs.effets / 100 });
for (const [nom, def] of Object.entries(BRUITAGES)) audio.define(nom, def);
audio.unlockOn(document);
const ronde = creerRonde(audio.ctx, { volume: (prefs.musique / 100) * 0.6 });

const { sprites, reglages, aPublier } = await chargerContenu();
const rendu = await creerRendu($('scene'), { sprites });
lockBrowserGestures($('ecran'));
stopTypeahead();

let partie = null;
const ui = { selection: null, curseur: null, deplacements: [], cibles: [], intentions: [] };

// L'interface suit le canevas : même cadre, et --u = pixels CSS par pixel logique
function caler(c = rendu.cadre()) {
  const s = $('interface').style;
  const r = $('ecran').getBoundingClientRect();
  Object.assign(s, { left: `${c.left - r.left}px`, top: `${c.top - r.top}px`, width: `${c.width}px`, height: `${c.height}px` });
  document.documentElement.style.setProperty('--u', `${c.unite}px`);
}
rendu.onResize = caler;
caler();

// La frise de l'écran titre : la Mort mène la ronde, les danseurs suivent.
// Agrandie d'un facteur entier en pixels physiques (section 7).
function frise() {
  const dpr = window.devicePixelRatio || 1;
  const k = Math.max(1, Math.round(3 * dpr));
  $('frise').replaceChildren(...['mort', 'guerre', 'famine', 'peste', 'ame', 'ame', 'ame'].map(nom => {
    const src = spriteCanvas(sprites[nom], PALETTE, { scale: k });   // en cache : on en fait une copie
    const c = Object.assign(document.createElement('canvas'), { width: src.width, height: src.height });
    c.getContext('2d').drawImage(src, 0, 0);
    c.style.width = `${(24 * k) / dpr}px`;
    return c;
  }));
}
frise();

// ─── Écrans ────────────────────────────────────────────────────────────────
const enJeu = () => !!partie && $('titre').hidden;
const dialogueOuvert = () => !!document.querySelector('dialog[open]');
function montrerTitre() {
  ronde.arreter();
  $('titre').hidden = false;
  $('interface').hidden = true;
  $('continuer').hidden = !store.has('partie');
  const meta = store.load('meta');
  $('record').hidden = !meta.record.ames;
  $('record').textContent = `${TEXTES.fin.record} : ${meta.record.ames} âmes, ${meta.record.tableaux} tableau${meta.record.tableaux > 1 ? 'x' : ''}`;
  ($('continuer').hidden ? $('nouvelle') : $('continuer')).focus();
}
function jouer(p) {
  partie = p;
  ui.selection = null;
  ui.curseur = { x: 0, y: Math.floor(p.tableau.rows / 2) };
  $('titre').hidden = true;
  $('interface').hidden = false;
  caler();
  dessinerCartes();
  rafraichir();
  sauvegarder();
  if (audio.unlocked) ronde.jouer();
  if (partie.phase === 'bilan') montrerBilan();
}
function sauvegarder() { if (partie && partie.phase !== 'fin') store.save('partie', partie); }
function pause() {
  if (!enJeu() || dialogueOuvert()) return;
  sauvegarder();
  ronde.arreter();
  rendu.pause();
  $('dialogue-pause').showModal();
}

const graineNouvelle = () => window.__seed ?? Date.now() % 1000000; // la graine elle-même peut venir de l'horloge
$('continuer').onclick = () => jouer(store.load('partie') || Regles.nouvellePartie(graineNouvelle(), reglages));
$('nouvelle').onclick = () => {
  if (!store.has('partie')) return jouer(Regles.nouvellePartie(graineNouvelle(), reglages));
  const d = $('dialogue-confirmer');
  d.onclose = () => { if (d.returnValue === 'oui') jouer(Regles.nouvellePartie(graineNouvelle(), reglages)); };
  d.showModal();
};
$('pause').onclick = pause;
$('reprendre').onclick = () => $('dialogue-pause').close();
$('dialogue-pause').addEventListener('close', () => { rendu.reprendre(); if (enJeu()) ronde.jouer(); });
$('quitter').onclick = () => { $('dialogue-pause').close(); sauvegarder(); montrerTitre(); };
$('pause-reglages').onclick = () => $('dialogue-reglages').showModal();
$('plein-ecran').onclick = () => { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.(); };
$('ouvrir-reglages').onclick = () => $('dialogue-reglages').showModal();
// Fenêtre quittée : pause (section 9)
window.addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('pointerdown', () => { if (enJeu() && !dialogueOuvert()) ronde.jouer(); }, { once: true });

// ─── Réglages ──────────────────────────────────────────────────────────────
for (const [id, cle, canal] of [['vol-musique', 'musique', 'music'], ['vol-effets', 'effets', 'sfx']]) {
  $(id).value = prefs[cle];
  $(id).oninput = e => {
    prefs[cle] = Number(e.target.value);
    audio.setVolume(canal, prefs[cle] / 100);
    if (canal === 'music') ronde.setVolume((prefs[cle] / 100) * 0.6);
    store.save('prefs', prefs);
    if (canal === 'sfx') audio.sfx('choisir');
  };
}
$('exporter').onclick = () => { sauvegarder(); downloadJSON(store.exportAll(), `${JEU}-sauvegarde.json`); };
$('importer').onclick = async () => {
  try {
    const n = store.importAll(await pickJSONFile());
    toast(`${n} élément(s) importé(s)`);
    setTimeout(() => location.reload(), 800);
  } catch (e) { toast(e.message); }
};
loadVersion().then(v => { $('version').textContent = v ? `v${v}` : ''; });
loadChangelog().then(entrees => {
  $('changelog').replaceChildren(...entrees.flatMap(e => [
    el('h3', { textContent: `v${e.version} — ${e.date}` }),
    el('ul', {}, ...e.changes.map(c => el('li', { textContent: c }))),
  ]));
});

function toast(texte) {
  const t = $('toast');
  t.textContent = texte;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2500);
}

// ─── L'interface en jeu ────────────────────────────────────────────────────
function dessinerCartes() {
  $('cavaliers').replaceChildren(...Regles.ORDRE.map((id, i) => {
    const portrait = spriteCanvas(sprites[id], PALETTE);
    const b = el('button', { className: 'carte', type: 'button' }, portrait,
      el('span', { className: 'nom' }, el('kbd', { textContent: String(i + 1) }), TEXTES.cavaliers[id].nom),
      el('span', { className: 'geste', textContent: TEXTES.cavaliers[id].geste }));
    b.dataset.id = id;
    b.onclick = () => { b.blur(); choisir(id); };
    return b;
  }));
}

function rafraichir(evenements = []) {
  if (!partie) return 0;
  const t = partie.tableau;
  const sel = ui.selection;
  const enCours = partie.phase === 'jeu';
  ui.deplacements = enCours && sel ? Regles.deplacementsPossibles(t, sel, reglages) : [];
  ui.cibles = enCours && sel ? Regles.ciblesPossibles(t, sel, reglages) : [];
  ui.intentions = enCours ? Regles.prevoir(partie, reglages) : [];
  rendu.afficher(partie, ui, evenements);

  $('lieu').textContent = t.nom;
  const tour = Math.min(t.tour, t.tours);
  $('sablier').innerHTML = `Tour <b>${tour}</b> / ${t.tours}`;
  $('ames').innerHTML = `Âmes <b>${t.ames}</b> / ${t.quota}`;
  $('ames').classList.toggle('plein', t.ames >= t.quota);
  for (const b of $('cavaliers').children) {
    const c = t.cavaliers.find(c => c.id === b.dataset.id);
    b.classList.toggle('choisi', c.id === sel);
    b.classList.toggle('fait', c.agi);
    b.querySelector('.geste').textContent = c.agi ? 'a agi' : c.bouge ? `${TEXTES.cavaliers[c.id].geste} ·` : TEXTES.cavaliers[c.id].geste;
  }
  ronde.setTension((t.tour - 1) / Math.max(1, t.tours - 1));
  remplirFiche();
  return 0;
}

// La fiche : ce qu'il y a sous le curseur, ou le cavalier choisi
function remplirFiche() {
  const t = partie.tableau;
  const f = $('fiche');
  const kids = [];
  const p = ui.curseur;
  const c = p && Regles.cavalierEn(t, p.x, p.y) || (ui.selection && t.cavaliers.find(c => c.id === ui.selection));
  const v = p && Regles.vivantEn(t, p.x, p.y);
  if (v) {
    kids.push(el('h3', { textContent: v.etat === 'gisant' ? TEXTES.vivants.gisant : TEXTES.vivants[v.type] }));
    if (v.etat === 'debout') kids.push(el('p', { className: 'pv', textContent: '♥'.repeat(v.pv) }));
    if (v.infecte) kids.push(el('p', { textContent: 'Contaminé' }));
    if (v.affame) kids.push(el('p', { textContent: 'Ne bougera pas' }));
    const o = ui.intentions.find(o => o.id === v.id);
    const issue = { refugie: "Atteindra l'abri", entraine: 'Entrera dans la ronde', tombe: 'Tombera' }[o?.issue];
    if (issue) kids.push(el('p', { className: 'issue', textContent: issue }));
  } else if (p && Regles.ameEn(t, p.x, p.y) >= 0) {
    kids.push(el('h3', { textContent: TEXTES.vivants.ame }));
  } else if (c) {
    const T = TEXTES.cavaliers[c.id];
    kids.push(el('h3', { textContent: T.nom }), el('p', { textContent: `${T.geste} : ${T.dit}` }));
  }
  if (p) kids.push(el('p', { textContent: TEXTES.terrains[Regles.terrain(t, p.x, p.y)] }));
  f.replaceChildren(...kids);
}

function message(texte, refus = false) {
  $('message').textContent = texte;
  $('message').classList.toggle('refus', refus);
}

function choisir(id) {
  if (!partie || partie.phase !== 'jeu') return;
  rendu.achever();
  ui.selection = ui.selection === id ? null : id;
  const c = partie.tableau.cavaliers.find(c => c.id === id);
  if (ui.selection) { ui.curseur = { x: c.x, y: c.y }; audio.sfx('choisir'); message(''); }
  rafraichir();
}

// Un geste du joueur sur une case : choisir, chevaucher ou agir
function viserCase(x, y) {
  if (!partie || partie.phase !== 'jeu') return;
  rendu.achever();
  const t = partie.tableau;
  ui.curseur = { x, y };
  const sel = ui.selection;
  const c = Regles.cavalierEn(t, x, y);
  const ici = l => l.some(p => p.x === x && p.y === y);
  if (sel && ici(ui.cibles)) return geste(Regles.agir(partie, sel, x, y, reglages));
  if (sel === 'famine' && c?.id === 'famine' && ui.cibles.length) return geste(Regles.agir(partie, sel, x, y, reglages));
  if (sel && ici(ui.deplacements)) return geste(Regles.deplacer(partie, sel, x, y, reglages));
  if (c) return choisir(c.id);
  if (sel) {
    // Pourquoi pas ici : la raison, dite à voix haute (sur une copie : rien ne change)
    const essai = structuredClone(partie);
    const r = Regles.vivantEn(t, x, y) ? Regles.agir(essai, sel, x, y, reglages) : Regles.deplacer(essai, sel, x, y, reglages);
    if (!r.ok) { message(TEXTES.refus[r.raison] || r.raison, true); audio.sfx('refus'); }
  }
  rafraichir();
}

const SONS = { chevauche: 'galop', frappe: 'frapper', pese: 'peser', decoche: 'decocher', fauche: 'faucher', entraine: 'ronde', refugie: 'abri', tombe: 'glas' };
function geste(r) {
  if (!r.ok) { message(TEXTES.refus[r.raison] || r.raison, true); audio.sfx('refus'); return; }
  const sel = partie.tableau.cavaliers.find(c => c.id === ui.selection);
  if (sel?.agi) ui.selection = null;
  raconter(r.evenements);
  rafraichir(r.evenements);
  sauvegarder();
  if (partie.phase !== 'jeu') setTimeout(montrerBilan, 600);
}

// Le son et la ligne de message d'une suite d'événements
function raconter(evenements) {
  const joues = new Set();
  let texte = '';
  for (const e of evenements) {
    const son = SONS[e.type];
    if (son && !joues.has(son)) { joues.add(son); audio.sfx(son); }
    window.__jeu?.log(e.type, e);
    if (e.type === 'fauche') texte = 'La Mort fauche. Une âme entre dans la ronde.';
    else if (e.type === 'entraine') texte = 'La ronde entraîne un vivant.';
    else if (e.type === 'tombe' && !texte) texte = 'Un vivant tombe.';
    else if (e.type === 'releve') texte = 'Un brancardier relève un gisant.';
    else if (e.type === 'refugie' && !texte) texte = "Un vivant atteint l'abri.";
  }
  message(texte);
}

function finir() {
  if (!partie || partie.phase !== 'jeu') return;
  rendu.achever();
  ui.selection = null;
  const r = Regles.finirTour(partie, reglages);
  raconter(r.evenements);
  rafraichir(r.evenements);
  sauvegarder();
  if (partie.phase !== 'jeu') setTimeout(montrerBilan, 900);
}

function recommencer() {
  if (!partie || partie.phase !== 'jeu') return;
  rendu.achever();
  Regles.recommencerTour(partie);
  ui.selection = null;
  message('');
  rafraichir();
  sauvegarder();
}

// ─── Bilan d'un tableau, fin de la danse ───────────────────────────────────
function montrerBilan() {
  if (!partie?.bilan || dialogueOuvert()) return;
  const b = partie.bilan;
  const d = $('dialogue-bilan');
  const bouton = (texte, action) => el('button', { className: 'bouton', textContent: texte, onclick: () => { d.close(); action(); } });
  if (b.victoire) {
    audio.sfx('victoire');
    $('bilan-titre').textContent = TEXTES.fin.victoire;
    $('bilan-chiffres').textContent = `Âmes ${b.ames} / ${b.quota} · à l'abri ${b.refugies}`;
    $('bilan-memento').textContent = TEXTES.fin.memento;
    $('bilan-actions').replaceChildren(bouton('Tableau suivant', () => {
      Regles.tableauSuivant(partie, reglages);
      ui.selection = null;
      message('');
      rafraichir();
      sauvegarder();
    }));
  } else {
    audio.sfx('aube');
    ronde.arreter();
    const meta = store.load('meta');
    const nouveau = partie.total > meta.record.ames;
    if (nouveau) meta.record = { ames: partie.total, tableaux: partie.niveau };
    meta.parties++;
    store.save('meta', meta);
    store.clear('partie');
    window.__jeu?.log('finDePartie', { total: partie.total, tableaux: partie.niveau });
    $('bilan-titre').textContent = TEXTES.fin.defaite;
    $('bilan-chiffres').textContent = `Âmes ${b.ames} / ${b.quota} · en tout ${partie.total} âmes, ${partie.niveau} tableau${partie.niveau > 1 ? 'x' : ''} traversé${partie.niveau > 1 ? 's' : ''}`;
    $('bilan-memento').textContent = nouveau ? `${TEXTES.fin.record}.` : '';
    $('bilan-actions').replaceChildren(
      bouton('Nouvelle partie', () => jouer(Regles.nouvellePartie(graineNouvelle(), reglages))),
      bouton('Écran titre', () => { partie = null; montrerTitre(); }),
    );
  }
  d.showModal();
}
$('dialogue-bilan').addEventListener('cancel', e => e.preventDefault()); // Échap ne saute pas le bilan

$('finir').onclick = e => { e.currentTarget.blur(); finir(); };
$('recommencer').onclick = e => { e.currentTarget.blur(); recommencer(); };

// ─── Commandes : clavier et souris (section 8) ─────────────────────────────
const DIRS = { haut: [0, -1], bas: [0, 1], gauche: [-1, 0], droite: [1, 0] };
createKeys({
  actions: {
    haut: ['ArrowUp', 'KeyW'], bas: ['ArrowDown', 'KeyS'], gauche: ['ArrowLeft', 'KeyA'], droite: ['ArrowRight', 'KeyD'],
    valider: ['Enter', ' '],
    c1: ['1', 'Digit1', 'Numpad1'], c2: ['2', 'Digit2', 'Numpad2'], c3: ['3', 'Digit3', 'Numpad3'], c4: ['4', 'Digit4', 'Numpad4'],
    finir: 'f', recommencer: 'r', pause: ['Escape', 'p'],
  },
  onAction: (nom, e) => {
    if (!enJeu() || dialogueOuvert()) return;
    if (nom === 'pause') {
      if (e.key === 'Escape' && ui.selection) { ui.selection = null; message(''); rafraichir(); return; }
      return pause();
    }
    if (nom === 'valider' && e.target?.closest?.('button, a, summary')) return; // le bouton focalisé garde Entrée et Espace
    if (DIRS[nom]) {
      const t = partie.tableau;
      const p = ui.curseur || { x: 0, y: 0 };
      ui.curseur = { x: Math.max(0, Math.min(t.cols - 1, p.x + DIRS[nom][0])), y: Math.max(0, Math.min(t.rows - 1, p.y + DIRS[nom][1])) };
      return rafraichir();
    }
    if (nom === 'valider' && ui.curseur) return viserCase(ui.curseur.x, ui.curseur.y);
    if (nom[0] === 'c' && nom.length === 2) return choisir(Regles.ORDRE[Number(nom[1]) - 1]);
    if (nom === 'finir') return finir();
    if (nom === 'recommencer') return recommencer();
  },
});
createPointer($('scene'), {
  onTap: p => {
    if (!enJeu() || dialogueOuvert()) return;
    const k = rendu.versCase(p.event.clientX, p.event.clientY, partie.tableau);
    if (p.button === 2) { ui.selection = null; message(''); return rafraichir(); }
    if (k) viserCase(k.x, k.y);
    else if (ui.selection) { ui.selection = null; rafraichir(); }
  },
  onHover: p => {
    if (!enJeu() || dialogueOuvert()) return;
    const r = $('scene').getBoundingClientRect();
    const k = rendu.versCase(p.x + r.left, p.y + r.top, partie.tableau);
    if (k && (k.x !== ui.curseur?.x || k.y !== ui.curseur?.y)) { ui.curseur = k; rafraichir(); }
  },
});

autosave(sauvegarder, { everyMs: 10000 });

// ─── Mise à jour automatique : jamais en plein tour (section 4) ────────────
startUpdateCheck({
  isBusy: () => enJeu() && !dialogueOuvert(),
  beforeReload: sauvegarder,
  onUpdated: v => toast(`Mis à jour en v${v}`),
});

// ─── Mode debug (section 18) : chargé seulement avec ?debug=1 ──────────────
if (DEBUG) {
  const { installDebug, seedFromUrl } = await import('./lib/debug.js?v=0.1.0');
  window.__seed = seedFromUrl() ?? undefined;
  installDebug({
    state: () => partie && {
      phase: partie.phase, niveau: partie.niveau, total: partie.total, tour: partie.tableau.tour,
      ames: partie.tableau.ames, quota: partie.tableau.quota, vivants: partie.tableau.vivants.length,
      selection: ui.selection, enJeu: enJeu(),
    },
    places: Object.fromEntries(Regles.ORDRE.map(id => [id, { id }])),
    // Téléporte le cavalier nommé sur une case libre (x, y) : hors règles, pour les tests
    teleport: ({ id, x, y }) => {
      const c = partie?.tableau.cavaliers.find(c => c.id === (id || ui.selection || 'guerre'));
      if (c && x != null && !Regles.cavalierEn(partie.tableau, x, y) && !Regles.vivantEn(partie.tableau, x, y)) { c.x = x; c.y = y; rafraichir(); }
    },
    setTimeScale: s => rendu.setTimeScale(s),
    setSeed: n => jouer(Regles.nouvellePartie(n, reglages)),
    reset: () => { store.clear('partie'); partie = null; montrerTitre(); },
    extra: {
      partie: () => partie,
      viser: (x, y) => viserCase(x, y),
      choisir: id => choisir(id),
      finir: () => finir(),
      prevoir: () => partie && Regles.prevoir(partie, reglages),
    },
  });
}

if (aPublier) toast(`${aPublier} retouche(s) de l'atelier pas encore publiée(s)`);
montrerTitre();
