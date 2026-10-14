// Un joueur glouton, pour les tests et les mesures d'équilibrage : pour chaque
// cavalier (la Mort en dernier), il essaie chaque case et chaque geste, et
// garde le meilleur coup immédiat. Ce n'est pas un bon joueur : c'est un
// plancher. Si le jeu bat ce bot, un humain appliqué fait mieux.
import { nouvellePartie, deplacer, agir, finirTour, tableauSuivant, deplacementsPossibles, ciblesPossibles, prevoir } from '../js/game.js';
import { REGLAGES } from '../js/data/reglages.js';

const copie = o => JSON.parse(JSON.stringify(o));
const ORDRE_BOT = ['peste', 'guerre', 'famine', 'mort'];

function valeur(p) {
  const t = p.tableau;
  let s = t.ames * 100 - t.refugies * 60;
  for (const v of t.vivants) s += v.etat === 'gisant' ? 40 : (REGLAGES.vivants[v.type].pv - v.pv) * 15 + (v.infecte ? 12 : 0) + (v.affame ? 6 : 0);
  // Approcher : chaque cavalier près d'un vivant ; la Mort près d'un vivant à bout ou d'un gisant
  const debout = t.vivants.filter(v => v.etat === 'debout');
  for (const c of t.cavaliers) {
    const proies = c.id === 'mort' ? t.vivants.filter(v => v.etat === 'gisant' || v.pv <= 1 || v.infecte) : debout;
    const d = Math.min(99, ...(proies.length ? proies : debout).map(v => Math.abs(v.x - c.x) + Math.abs(v.y - c.y)));
    s -= d * (c.id === 'mort' ? 4 : 2);
  }
  // Ce que les vivants feront ensuite : un réfugié annoncé coûte, une âme annoncée rapporte
  if (p.phase === 'jeu') for (const o of prevoir(p)) s += o.issue === 'refugie' ? -45 : o.issue === 'entraine' ? 80 : 0;
  return s;
}

export function meilleurCoup(p, id) {
  let meilleur = { s: valeur(p), coup: null };
  const essayer = coup => {
    const q = copie(p);
    if (coup.case && !deplacer(q, id, coup.case.x, coup.case.y).ok) return;
    if (coup.cible && !agir(q, id, coup.cible.x, coup.cible.y).ok) return;
    const s = valeur(q);
    if (s > meilleur.s) meilleur = { s, coup };
  };
  for (const cible of ciblesPossibles(p.tableau, id)) essayer({ cible });
  for (const c of deplacementsPossibles(p.tableau, id)) {
    essayer({ case: c });
    const q = copie(p);
    deplacer(q, id, c.x, c.y);
    for (const cible of ciblesPossibles(q.tableau, id)) essayer({ case: c, cible });
  }
  return meilleur.coup;
}

// → { tableaux: tableaux gagnés, total: âmes, tours: tours joués }
export function jouerBot(seed, { tableaux = Infinity, verifier } = {}) {
  const p = nouvellePartie(seed);
  let gagnes = 0, tours = 0;
  while (p.phase !== 'fin' && gagnes < tableaux) {
    if (p.phase === 'bilan') { gagnes++; if (gagnes >= tableaux) break; tableauSuivant(p); continue; }
    for (const id of ORDRE_BOT) {
      if (p.phase !== 'jeu') break;
      const coup = meilleurCoup(p, id);
      if (coup?.case) deplacer(p, id, coup.case.x, coup.case.y);
      if (coup?.cible) agir(p, id, coup.cible.x, coup.cible.y);
      verifier?.(p);
    }
    if (p.phase === 'jeu') { finirTour(p); tours++; verifier?.(p); }
  }
  return { tableaux: gagnes, total: p.total, tours };
}
