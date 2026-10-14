// Les règles du jeu, sans navigateur : node outils/test-run.mjs
import { readFileSync } from 'node:fs';
import {
  nouvellePartie, genererTableau, deplacer, agir, finirTour, tableauSuivant, recommencerTour,
  prevoir, invariants, deplacementsPossibles, ciblesPossibles, terrain, ORDRE,
} from '../js/game.js';
import { REGLAGES } from '../js/data/reglages.js';
import { TEXTES } from '../js/data/textes.js';
import { SPRITES } from '../js/sprites-data.js';
import { PALETTE } from '../js/palette.js';
import { validateSprite } from '../js/lib/sprites.js';
import { jouerBot } from './bot.mjs';

// Un plateau fait à la main : '.' boue, '=' tranchée, 'x' barbelés, 'o' cratère, 'A' abri
function plateau(lignes, { vivants = [], cavaliers = {}, cortege = [] } = {}) {
  const p = nouvellePartie(1);
  const t = p.tableau;
  t.sol = lignes; t.rows = lignes.length; t.cols = lignes[0].length;
  t.vivants = vivants.map((v, i) => ({ id: `v${i + 1}`, type: 'soldat', pv: 2, etat: 'debout', infecte: false, affame: false, ...v }));
  t.cavaliers = ORDRE.map((id, i) => ({ id, x: cavaliers[id]?.[0] ?? i, y: cavaliers[id]?.[1] ?? t.rows - 1, bouge: false, agi: false }));
  t.cortege = cortege.map(([x, y]) => ({ x, y }));
  t.ames = cortege.length;
  t.quota = 1;
  p.debutTour = JSON.parse(JSON.stringify(t));
  return p;
}
const VIDE = ['.......A', '........', '........', '........', '........'];

group('règles — génération');
test('même graine, même tableau', () => {
  assert.deepEqual(nouvellePartie(42), nouvellePartie(42));
  assert.notDeepEqual(nouvellePartie(42).tableau.sol, nouvellePartie(43).tableau.sol);
});
test('chaque tableau généré est jouable : invariants, abris, vivants qui peuvent fuir', () => {
  for (let seed = 1; seed <= 30; seed++) {
    for (const niveau of [0, 3, 8]) {
      const t = genererTableau(seed, niveau);
      const p = { tableau: t };
      assert.deepEqual(invariants(p), [], `graine ${seed}, tableau ${niveau}`);
      assert.ok(t.sol.join('').split('A').length - 1 >= 1);
      assert.ok(t.quota >= 1 && t.quota <= t.vivants.length);
      for (const c of t.cavaliers) assert.equal(terrain(t, c.x, c.y), '.');
    }
  }
});
test('les brancardiers et les aumôniers arrivent avec les tableaux', () => {
  const types = n => genererTableau(5, n).vivants.map(v => v.type);
  assert.ok(!types(0).includes('brancardier') && !types(0).includes('aumonier'));
  assert.ok(types(REGLAGES.progression.aumoniersDes).includes('aumonier'));
});

group('règles — cavaliers');
test('chevaucher puis agir ; pas de seconde chevauchée, pas de second geste', () => {
  const p = plateau(VIDE, { vivants: [{ x: 3, y: 2 }], cavaliers: { guerre: [0, 2] } });
  assert.equal(deplacer(p, 'guerre', 2, 2).ok, true);
  assert.equal(deplacer(p, 'guerre', 1, 2).raison, 'dejaBouge');
  assert.equal(agir(p, 'guerre', 3, 2).ok, true);
  assert.equal(agir(p, 'guerre', 3, 2).raison, 'dejaAgi');
});
test('un cavalier ne chevauche pas plus loin que son allure', () => {
  const p = plateau(VIDE, { cavaliers: { famine: [0, 0] } });
  const n = REGLAGES.cavaliers.famine.mouvement;
  assert.equal(deplacer(p, 'famine', n + 1, 0).raison, 'tropLoin');
  assert.equal(deplacer(p, 'famine', n, 0).ok, true);
});
test('Guerre blesse et repousse ; contre un obstacle, le choc blesse', () => {
  const p = plateau(VIDE, { vivants: [{ x: 2, y: 2, pv: 3 }], cavaliers: { guerre: [1, 2] } });
  agir(p, 'guerre', 2, 2);
  const v = p.tableau.vivants[0];
  assert.deepEqual([v.x, v.y, v.pv], [3, 2, 2]);
  const q = plateau(['..o.....', ...VIDE.slice(1)], { vivants: [{ x: 1, y: 0, pv: 3 }], cavaliers: { guerre: [0, 0] } });
  agir(q, 'guerre', 1, 0);
  const w = q.tableau.vivants[0];
  assert.deepEqual([w.x, w.y, w.pv], [1, 0, 1]);
});
test('dans une tranchée, Guerre blesse sans repousser', () => {
  const p = plateau(['..=.....', ...VIDE.slice(1)], { vivants: [{ x: 2, y: 0, pv: 3 }], cavaliers: { guerre: [1, 0] } });
  agir(p, 'guerre', 2, 0);
  assert.deepEqual([p.tableau.vivants[0].x, p.tableau.vivants[0].pv], [2, 2]);
});
test('repoussé dans les barbelés, un vivant y reste pris', () => {
  const p = plateau(['..x....A', ...VIDE.slice(1)], { vivants: [{ x: 1, y: 0, pv: 3 }], cavaliers: { guerre: [0, 0] } });
  agir(p, 'guerre', 1, 0);
  const v = p.tableau.vivants[0];
  assert.deepEqual([v.x, v.affame], [2, true]);
  finirTour(p);
  assert.equal(v.x, 2, 'pris, il ne bouge pas ce tour');
});
test('Famine fige les vivants autour d\'elle pour un tour', () => {
  const p = plateau(VIDE, { vivants: [{ x: 2, y: 1 }, { x: 3, y: 3 }], cavaliers: { famine: [2, 2] } });
  assert.equal(agir(p, 'famine', 2, 1).ok, true);
  const avant = p.tableau.vivants.map(v => [v.x, v.y]);
  finirTour(p);
  assert.deepEqual(p.tableau.vivants.map(v => [v.x, v.y]), avant);
  finirTour(p);
  assert.notDeepEqual(p.tableau.vivants.map(v => [v.x, v.y]), avant);
});
test('Peste contamine le premier en ligne ; la contagion blesse et se répand', () => {
  const p = plateau(['........', 'x.......', '..xxxxxx', '........', '........'], { vivants: [{ x: 3, y: 0 }, { x: 4, y: 0 }], cavaliers: { peste: [0, 0] } });
  assert.deepEqual(ciblesPossibles(p.tableau, 'peste'), [{ x: 3, y: 0 }]);
  agir(p, 'peste', 3, 0);
  assert.equal(p.tableau.vivants[0].infecte, true);
  finirTour(p);
  const [a, b] = p.tableau.vivants;
  assert.equal(a.pv, 1);
  assert.equal(b.infecte, true, 'le voisin est contaminé');
});
test('la Mort ne fauche qu\'un vivant à bout, ou un gisant ; l\'âme rejoint le cortège', () => {
  const p = plateau(VIDE, { vivants: [{ x: 1, y: 1, pv: 2 }, { x: 2, y: 0, pv: 1 }], cavaliers: { mort: [1, 0] } });
  assert.equal(agir(p, 'mort', 1, 1).raison, 'tropVivant');
  const r = agir(p, 'mort', 2, 0);
  assert.equal(r.ok, true);
  assert.equal(p.tableau.ames, 1);
  assert.deepEqual(p.tableau.cortege, [{ x: 2, y: 0 }]);
});
test('l\'aumônier veille sur ses voisins', () => {
  const p = plateau(VIDE, { vivants: [{ x: 2, y: 0, pv: 1 }, { x: 3, y: 0, type: 'aumonier', pv: 3 }], cavaliers: { mort: [1, 0] } });
  assert.equal(agir(p, 'mort', 2, 0).raison, 'veille');
});
test('le cortège suit la Mort pas à pas', () => {
  const p = plateau(VIDE, { cortege: [[0, 1], [0, 2]], cavaliers: { mort: [0, 0] } });
  deplacer(p, 'mort', 2, 0);
  assert.deepEqual(p.tableau.cortege, [{ x: 1, y: 0 }, { x: 0, y: 0 }]);
  assert.deepEqual(invariants(p), []);
});
test('un vivant touché par deux danseurs entre dans la ronde', () => {
  const p = plateau(['.......A', '........', '........', '........', '........'], { vivants: [{ x: 2, y: 1 }], cortege: [[2, 2]], cavaliers: { mort: [2, 0] } });
  finirTour(p);
  assert.equal(p.tableau.ames, 2);
  assert.equal(p.tableau.vivants.length, 0);
});
test('le brancardier relève un gisant voisin', () => {
  const p = plateau(VIDE, { vivants: [{ x: 3, y: 3, pv: 0, etat: 'gisant' }, { x: 4, y: 3, type: 'brancardier' }] });
  finirTour(p);
  assert.equal(p.tableau.vivants[0].etat, 'debout');
  assert.equal(p.tableau.vivants[0].pv, 1);
});
test('les vivants fuient vers l\'abri, et y sont à l\'abri', () => {
  const p = plateau(['.....A..', ...VIDE.slice(1)], { vivants: [{ x: 3, y: 0 }] });
  finirTour(p);
  assert.equal(p.tableau.refugies, 1);
});
test('les intentions annoncées sont exactement ce qui arrive', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const p = nouvellePartie(seed);
    for (let tour = 0; tour < 4 && p.phase === 'jeu'; tour++) {
      const prevu = prevoir(p);
      finirTour(p);
      for (const o of prevu) {
        const v = p.tableau.vivants.find(v => v.id === o.id);
        if (o.issue === 'refugie' || o.issue === 'entraine') assert.equal(v, undefined, `${o.id} ${o.issue}`);
        else {
          const fin = o.chemin.length ? o.chemin[o.chemin.length - 1] : o.de;
          assert.deepEqual([v.x, v.y], [fin.x, fin.y], `graine ${seed}, ${o.id}`);
        }
      }
    }
  }
});
test('recommencer le tour oublie les gestes', () => {
  const p = plateau(VIDE, { vivants: [{ x: 3, y: 2 }], cavaliers: { guerre: [2, 2] } });
  agir(p, 'guerre', 3, 2);
  recommencerTour(p);
  assert.deepEqual(p.tableau, p.debutTour);
  assert.equal(p.tableau.vivants[0].pv, 2);
});
test('un refus a toujours une raison écrite', () => {
  const p = plateau(VIDE, { vivants: [{ x: 3, y: 2, pv: 2 }], cavaliers: { mort: [2, 2], famine: [0, 4] } });
  const raisons = [
    agir(p, 'mort', 3, 2).raison, agir(p, 'famine', 0, 0).raison, deplacer(p, 'famine', 7, 0).raison,
    deplacer(p, 'mort', 3, 2).raison, agir(p, 'peste', 5, 3).raison,
  ];
  for (const r of raisons) assert.ok(TEXTES.refus[r], `raison sans texte : ${r}`);
});
test('le tableau finit au sablier ; gagné au quota, sinon la partie s\'arrête', () => {
  const p = nouvellePartie(3);
  while (p.phase === 'jeu') finirTour(p);
  assert.equal(p.phase, 'fin', 'sans rien faire, la danse s\'arrête');
  assert.ok(p.bilan && !p.bilan.victoire);
});

group('règles — équilibre (un bot glouton contre l\'inaction)');
test('un joueur appliqué gagne le premier tableau presque toujours, l\'inaction jamais', () => {
  let gagnes = 0;
  for (let seed = 1; seed <= 20; seed++) if (jouerBot(seed, { tableaux: 1 }).tableaux >= 1) gagnes++;
  assert.ok(gagnes >= 16, `bot : ${gagnes}/20`);
});

group('règles — pureté');
test('aucun hasard ni horloge dans les règles', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.ok(!/Math\.random|Date\.now|performance\.now|crypto\./.test(src), 'game.js doit rester pur (section 10)');
});
test('les invariants tiennent pendant des parties entières', () => {
  for (let seed = 1; seed <= 8; seed++) jouerBot(seed, { tableaux: 3, verifier: p => assert.deepEqual(invariants(p), [], `graine ${seed}`) });
});

group('sauvegarde');
test('une partie relue est la même, et se comporte pareil', () => {
  const a = nouvellePartie(9);
  deplacer(a, 'guerre', ...Object.values(deplacementsPossibles(a.tableau, 'guerre')[0]));
  finirTour(a);
  const b = JSON.parse(JSON.stringify(a));
  assert.deepEqual(b, a);
  for (let i = 0; i < 3; i++) { finirTour(a); finirTour(b); }
  assert.deepEqual(b, a);
});
test('le tableau suivant ne vient qu\'après une victoire', () => {
  const p = nouvellePartie(2);
  assert.equal(tableauSuivant(p).ok, false);
  p.phase = 'bilan';
  assert.equal(tableauSuivant(p).ok, true);
  assert.equal(p.niveau, 1);
});

group('dessins');
test('chaque sprite est dans la palette', () => {
  for (const [nom, rows] of Object.entries(SPRITES)) assert.deepEqual(validateSprite(rows, PALETTE), [], nom);
});
test('chaque cavalier, vivant et terrain a son sprite', () => {
  for (const id of [...ORDRE, 'soldat', 'brancardier', 'aumonier', 'gisant', 'ame', 'sol_boue', 'sol_tranchee', 'sol_barbeles', 'sol_cratere', 'sol_abri']) assert.ok(SPRITES[id], id);
});
