// La palette du jeu, « boue et linceul » : le SEUL endroit où vivent ses
// couleurs (section 5 des conventions). Une lettre par couleur : c'est
// l'alphabet des sprites. Déclarée aussi dans la section Description du
// CLAUDE.md. Les quatre cavaliers ont chacun la leur (Dürer : rouge, noir,
// blanc, pâle) : sang, nuit cernée d'os, linceul, vert-de-gris.
export const PALETTE = {
  n: '#14111c', // nuit — le fond, le cheval de Famine
  s: '#2b2530', // suie — ombres, soutanes, cratères
  b: '#4d4038', // boue — le sol
  t: '#7a6450', // terre — bois, piquets, berges
  k: '#8a8660', // kaki — les uniformes
  v: '#6f8f7e', // vert-de-gris — le cheval pâle de la Mort, la contagion
  a: '#46566b', // acier — casques, barbelés, armures
  o: '#d9ceb0', // os — l'encre, les squelettes
  l: '#f2ead6', // linceul — le cheval de Peste, le texte fort
  r: '#a0302a', // sang — Guerre, les blessures
  e: '#d86a3a', // braise — les cibles, les coups
  c: '#c9a24a', // cire — la bougie, la balance, le curseur
};

// Les rôles, lus par le CSS (variables --jeu-*) et par le rendu
export const ROLES = {
  fond: PALETTE.n,
  panneau: PALETTE.s,
  sol: PALETTE.b,
  ombre: PALETTE.s,
  encre: PALETTE.o,
  fort: PALETTE.l,
  accent: PALETTE.c,
  braise: PALETTE.e,
  sang: PALETTE.r,
  terre: PALETTE.t,
  peste: PALETTE.v,
};
