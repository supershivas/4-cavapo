// L'Atelier (section 17) : il MODIFIE le contenu que le jeu lit.
// Chaque modification est gardée tout de suite dans ce navigateur (brouillon),
// visible dans le jeu de ce navigateur, puis publiée d'un geste dans le dépôt
// (un commit sur main, par l'API de GitHub) : assets/design/*.json.
import { mountPixelEditor } from './lib/pixel-editor.js?v=0.1.0';
import { createPublisher, TOKEN_URL } from './lib/gh-publish.js?v=0.1.0';
import { PALETTE } from './palette.js?v=0.1.0';
import { chargerContenu, lireBrouillon, ecrireBrouillon } from './design-store.js?v=0.1.0';

const REPO = 'supershivas/4-cavapo';
const $ = id => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const pub = createPublisher({ repo: REPO, tokenKey: '4-cavapo:gh-token' });
let contenu = await chargerContenu();
let editeur = null;

function aPublier() {
  const b = lireBrouillon();
  const n = Object.keys(b.sprites || {}).length + Object.keys(b.reglages || {}).length;
  $('a-publier').textContent = n ? `${n} à publier` : '';
  return n;
}
function toast(t) { const e = $('toast'); e.textContent = t; e.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { e.hidden = true; }, 3000); }

// ─── Dessins ───────────────────────────────────────────────────────────────
function ongletDessins(zone, nom = Object.keys(contenu.sprites)[0]) {
  const choix = el('select', { ariaLabel: 'Sprite' }, ...Object.keys(contenu.sprites).map(n => el('option', { value: n, textContent: n, selected: n === nom })));
  choix.onchange = () => ongletDessins(zone, choix.value);
  const retablir = el('button', { textContent: 'Revenir au publié', onclick: () => {
    const b = lireBrouillon(); delete b.sprites?.[nom]; ecrireBrouillon(b);
    contenu.sprites[nom] = contenu.publie.sprites[nom]; aPublier(); ongletDessins(zone, nom);
  } });
  const surface = el('div');
  zone.replaceChildren(el('h2', { textContent: 'Dessins' }), el('div', { className: 'at-row' }, choix, retablir), surface,
    el('p', { className: 'at-note', textContent: 'Pour un gros travail : Pixel Studio, puis export PNG à la palette (exportée par le labo).' }));
  editeur?.destroy();
  editeur = mountPixelEditor(surface, {
    rows: contenu.sprites[nom], palette: PALETTE, zoom: 24,
    onChange: rows => {
      const b = lireBrouillon(); b.sprites = { ...(b.sprites || {}), [nom]: rows }; ecrireBrouillon(b);
      contenu.sprites[nom] = rows; aPublier();
    },
  });
}

// ─── Publier ───────────────────────────────────────────────────────────────
function ongletPublier(zone) {
  const jeton = el('input', { type: 'password', placeholder: 'github_pat_…', value: pub.getToken(), autocomplete: 'off' });
  const statut = el('p', { className: 'at-note' });
  const n = aPublier();
  zone.replaceChildren(
    el('h2', { textContent: 'Publier' }),
    el('p', { className: 'at-note' }, `Publier écrit les retouches dans le dépôt ${REPO} (un commit sur main) ; le jeu est à jour partout en une à dix minutes. Il faut un jeton GitHub limité à ce dépôt, avec le droit « Contents : Read and write ». Il reste dans ce navigateur et n'est jamais exporté. `,
      el('a', { href: TOKEN_URL, target: '_blank', rel: 'noopener', textContent: 'Créer un jeton' })),
    el('div', { className: 'at-row' }, jeton, el('button', { textContent: 'Enregistrer le jeton', onclick: () => { pub.setToken(jeton.value); toast('Jeton enregistré dans ce navigateur'); } })),
    el('div', { className: 'at-row' }, el('button', { className: 'primaire', textContent: n ? `Publier (${n})` : 'Rien à publier', disabled: !n, onclick: publier })),
    statut,
  );
  async function publier() {
    try {
      const b = lireBrouillon();
      const fichiers = [];
      if (b.sprites && Object.keys(b.sprites).length) {
        const enLigne = (await pub.readJSON('assets/design/sprites.json')) || {};
        fichiers.push({ path: 'assets/design/sprites.json', json: { ...enLigne, ...b.sprites } });
      }
      if (b.reglages && Object.keys(b.reglages).length) {
        const enLigne = (await pub.readJSON('assets/design/reglages.json')) || {};
        for (const [g, v] of Object.entries(b.reglages)) enLigne[g] = { ...(enLigne[g] || {}), ...v };
        fichiers.push({ path: 'assets/design/reglages.json', json: enLigne });
      }
      await pub.publish(fichiers, { message: "Publie les retouches de l'atelier", progress: t => { statut.textContent = t; } });
      ecrireBrouillon({});
      contenu = await chargerContenu();
      toast('Publié');
      ongletPublier(zone);
    } catch (e) { statut.textContent = e.message; }
  }
}

const ONGLETS = { Dessins: ongletDessins, Publier: ongletPublier };
function ouvrir(nom) {
  for (const b of $('onglets').children) b.classList.toggle('is-on', b.textContent === nom);
  if (nom !== 'Dessins') { editeur?.destroy(); editeur = null; }
  ONGLETS[nom]($('travail'));
  history.replaceState(null, '', `#${nom}`);
}
$('onglets').append(...Object.keys(ONGLETS).map(nom => el('button', { textContent: nom, onclick: () => ouvrir(nom) })));
ouvrir(ONGLETS[decodeURIComponent(location.hash.slice(1))] ? decodeURIComponent(location.hash.slice(1)) : 'Dessins');
aPublier();
