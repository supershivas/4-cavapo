// Le Labo (section 16) : il MONTRE et compare, il ne modifie rien.
// Chaque sujet utilise les mêmes modules que le jeu (rendu.js, sprites,
// musique) : ce qu'on voit ici est ce que le jeu dessinera. Ajouter un sujet
// ou une variante = ajouter une entrée dans GROUPES.
import { mountLabo } from './lib/labo-shell.js?v=0.1.0';
import { spriteCanvas, sheet, spriteToPNG, paletteToGPL, paletteToHex } from './lib/sprites.js?v=0.1.0';
import { createAudio } from './lib/audio.js?v=0.1.0';
import { PALETTE, ROLES } from './palette.js?v=0.1.0';
import { chargerContenu } from './design-store.js?v=0.1.0';
import { nouvellePartie, genererTableau, prevoir, ORDRE } from './game.js?v=0.1.0';
import { creerRendu } from './rendu.js?v=0.1.0';
import { creerRonde, BRUITAGES } from './musique.js?v=0.1.0';

document.documentElement.style.setProperty('--jeu-accent', ROLES.accent);
const NOM = document.title.replace(/^Labo — /, ''); // le nom vient de la page (une apostrophe ne casse rien)
const { sprites, reglages } = await chargerContenu();
const audio = createAudio();
for (const [nom, def] of Object.entries(BRUITAGES)) audio.define(nom, def);
let ronde = null;

const el = (tag, props = {}, ...kids) => {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...kids);
  return e;
};
const telecharger = (blob, nom) => {
  const a = el('a', { href: URL.createObjectURL(blob), download: nom });
  document.body.append(a); a.click(); a.remove();
};

// La planche d'échelle : tout se mesure au cavalier (une case, 24 px), section 7
const FAMILLES = {
  'Les cavaliers': ORDRE,
  'Les vivants': ['soldat', 'brancardier', 'aumonier', 'gisant', 'ame'],
  'Le terrain': ['sol_boue', 'sol_tranchee', 'sol_barbeles', 'sol_cratere', 'sol_abri'],
  'Les marques': ['marque_contagion', 'marque_faim'],
};
function planche(stage, facteur, fond = PALETTE.b) {
  for (const [titre, noms] of Object.entries(FAMILLES)) {
    stage.append(el('h3', { textContent: titre }));
    const p = el('div', { className: 'planche' });
    p.style.background = fond;
    for (const nom of noms) {
      if (!sprites[nom]) continue;
      p.append(el('figure', {}, spriteCanvas(sprites[nom], PALETTE, { scale: facteur }), el('figcaption', { textContent: `${nom} ${sprites[nom][0].length}×${sprites[nom].length}` })));
    }
    stage.append(p);
  }
}

// Un tableau rendu par rendu.js, exactement comme dans le jeu
function tableau(stage, niveau, { intentions = true } = {}) {
  const cadre = el('div', { className: 'cadre-jeu' });
  stage.append(cadre);
  const partie = nouvellePartie(11, reglages);
  if (niveau) { partie.niveau = niveau; partie.tableau = genererTableau(11, niveau, reglages); }
  const ui = { selection: 'mort', curseur: null, deplacements: [], cibles: [], intentions: intentions ? prevoir(partie, reglages) : [] };
  const r = creerRendu(cadre, { sprites }).then(rendu => { rendu.afficher(partie, ui); return rendu; });
  return () => r.then(rendu => rendu.destroy());
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a, b) { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); }

const GROUPES = [
  { id: 'dessin', title: 'Dessin', topics: [
    { id: 'echelle', title: 'Échelle', variants: [
      { title: 'Taille ×4, sur la boue', note: 'Chaque élément côte à côte, sur le sol où il sera vu.', status: 'actuelle', render: s => planche(s, 4) },
      { title: 'Taille ×2, sur la boue', note: 'La taille d\'un écran de 1280 × 720.', render: s => planche(s, 2) },
      { title: 'Taille ×1, sur la nuit', note: 'Ce que voit un joueur sans agrandissement.', render: s => planche(s, 1, PALETTE.n) },
    ] },
    { id: 'palette', title: 'Palette', variants: [
      { title: 'Nuancier', note: 'Les douze couleurs du jeu, et rien d\'autre.', status: 'actuelle', render: s => {
        const parLum = Object.values(PALETTE).sort((a, b) => lum(a) - lum(b));
        s.append(el('div', { className: 'nuancier' }, ...Object.entries(PALETTE).map(([k, hex]) => {
          const d = el('div', { textContent: `${k} ${hex}` });
          d.style.background = hex;
          d.style.color = lum(hex) > 0.18 ? parLum[0] : parLum[parLum.length - 1];
          return d;
        })));
        s.append(el('p', {}, el('button', { className: 'essai', textContent: 'Palette .gpl', onclick: () => telecharger(new Blob([paletteToGPL(PALETTE, NOM)]), '4-cavapo.gpl') }),
          el('button', { className: 'essai', textContent: 'Palette .hex', onclick: () => telecharger(new Blob([paletteToHex(PALETTE)]), '4-cavapo.hex') })));
      } },
      { title: 'Contrastes', note: 'Rapport WCAG de chaque paire (4,5 pour du texte, 3 pour un signe).', render: s => {
        const ks = Object.keys(PALETTE);
        const t = el('table', { className: 'contraste' });
        t.append(el('tr', {}, el('th'), ...ks.map(k => el('th', { textContent: k }))));
        for (const a of ks) t.append(el('tr', {}, el('th', { textContent: a }), ...ks.map(b => el('td', { textContent: a === b ? '—' : contraste(PALETTE[a], PALETTE[b]).toFixed(1) }))));
        s.append(t);
      } },
    ] },
    { id: 'sprites', title: 'Sprites', variants: [
      { title: 'Planche', note: 'Tout ce que le jeu peint, à exporter pour le reprendre dans un éditeur.', status: 'actuelle', render: s => {
        const c = sheet(Object.values(sprites), PALETTE, { scale: 4, gap: 2 });
        c.style.imageRendering = 'pixelated';
        s.append(c, el('p'));
        for (const [nom, rows] of Object.entries(sprites)) {
          s.append(el('button', { className: 'essai', textContent: `${nom}.png`, onclick: async () => telecharger(await spriteToPNG(rows, PALETTE, 1), `${nom}.png`) }));
        }
      } },
    ] },
  ] },
  { id: 'jeu', title: 'Jeu', topics: [
    { id: 'tableau', title: 'Tableau', variants: [
      { title: 'Le front (tableau 1)', note: 'Le premier tableau, avec ce que feront les vivants.', status: 'actuelle', render: s => tableau(s, 0) },
      { title: 'Le village (tableau 3)', note: 'Plus de vivants ; les brancardiers sont là.', render: s => tableau(s, 2) },
      { title: 'L\'hôpital (tableau 5)', note: 'Les aumôniers veillent ; le quota monte.', render: s => tableau(s, 4) },
      { title: 'Sans les intentions', note: 'Le même front, sans les pointillés : se lit-il encore ?', render: s => tableau(s, 0, { intentions: false }) },
    ] },
  ] },
  { id: 'son', title: 'Son', topics: [
    { id: 'bruitages', title: 'Bruitages', variants: [
      { title: 'Banque', note: 'Chaque son du jeu, à écouter.', status: 'actuelle', render: s => {
        audio.unlockOn(s);
        for (const nom of Object.keys(BRUITAGES)) s.append(el('button', { className: 'essai', textContent: nom, onclick: () => { audio.unlock(); audio.sfx(nom); } }));
      } },
    ] },
    { id: 'ronde', title: 'La ronde', variants: [
      ...[['Premier tour', 0, 'Le tableau commence : la ronde est lente.'], ['Mi-tableau', 0.5, 'Le sablier se vide.'], ['Dernier tour', 1, 'Le sablier est vide : la ronde s\'emballe.']].map(([titre, tension, note], i) => ({
        title: titre, note, status: i === 0 ? 'actuelle' : undefined, render: s => {
          s.append(el('button', { className: 'essai', textContent: 'Écouter', onclick: () => {
            audio.unlock();
            ronde ??= creerRonde(audio.ctx, { volume: 0.5 });
            ronde.setTension(tension);
            ronde.jouer();
          } }), el('button', { className: 'essai', textContent: 'Arrêter', onclick: () => ronde?.arreter() }));
          return () => ronde?.arreter();
        },
      })),
    ] },
  ] },
];

mountLabo(document.getElementById('labo'), { game: NOM, home: './', atelier: 'atelier.html', groups: GROUPES });
