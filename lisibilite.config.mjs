// Configuration de node outils/lisibilite.mjs (voir l'en-tête de l'outil).
// Une paire de couleurs s'ajoute le jour où on la dessine. Les sprites sont
// cernés : la paire qui compte est la couleur et son contour.
import { PALETTE } from './js/palette.js';
import { SPRITES as S } from './js/sprites-data.js';

export default {
  palette: PALETTE,
  paires: [
    { avant: 'o', fond: 'n', role: 'texte', ou: 'bandeau, compteurs, menus' },
    { avant: 'l', fond: 'n', role: 'texte', ou: 'nom du lieu, titre' },
    { avant: 'c', fond: 'n', role: 'texte', ou: 'quota atteint, touches' },
    { avant: 'e', fond: 'n', role: 'texte', ou: 'message de refus' },
    { avant: 'o', fond: 's', role: 'texte', ou: 'cartes des cavaliers, fiche' },
    { avant: 'l', fond: 's', role: 'texte', ou: 'noms sur les cartes' },
    { avant: 'c', fond: 's', role: 'texte', ou: 'touches sur les cartes' },
    { avant: 'n', fond: 'o', role: 'texte', ou: 'boutons' },
    { avant: 'n', fond: 'l', role: 'texte', ou: 'bouton Fin du tour' },
    { avant: 'r', fond: 'o', role: 'texte', ou: 'touche dans un bouton' },
    { avant: 'e', fond: 's', role: 'signe', ou: 'PV dans la fiche' },
    { avant: 'c', fond: 's', role: 'signe', ou: 'carte choisie' },
    { avant: 'o', fond: 'b', role: 'signe', ou: 'cases où chevaucher' },
    { avant: 'c', fond: 'b', role: 'signe', ou: 'pointillés : où vont les vivants' },
    { avant: 'l', fond: 'b', role: 'signe', ou: 'pointillés : vers l\'abri' },
    { avant: 'e', fond: 'n', role: 'signe', ou: 'cadre de cible doublé de nuit, PV' },
    { avant: 'e', fond: 'n', role: 'signe', ou: 'cheval de Guerre cerné de nuit' },
    { avant: 'n', fond: 'k', role: 'signe', ou: 'cheval de Famine cerné de kaki' },
    { avant: 'l', fond: 'n', role: 'signe', ou: 'cheval de Peste cerné de nuit' },
    { avant: 'v', fond: 'n', role: 'signe', ou: 'cheval de la Mort cerné de nuit' },
    { avant: 'k', fond: 'n', role: 'signe', ou: 'uniformes cernés de nuit' },
    { avant: 's', fond: 'k', role: 'signe', ou: 'soutane cernée de kaki' },
    { avant: 'o', fond: 'n', role: 'signe', ou: 'danseurs de la ronde' },
  ],
  groupes: {
    cavaliers: { guerre: S.guerre, famine: S.famine, peste: S.peste, mort: S.mort },
    vivants: { soldat: S.soldat, brancardier: S.brancardier, aumonier: S.aumonier, gisant: S.gisant, ame: S.ame },
    terrain: { boue: S.sol_boue, tranchee: S.sol_tranchee, barbeles: S.sol_barbeles, cratere: S.sol_cratere, abri: S.sol_abri },
  },
  poses: [
    { ou: 'portrait sur une carte de cavalier (en pixels logiques)', image: [24, 24], case: [24, 24] },
    { ou: 'unité dans une case', image: [24, 24], case: [24, 24] },
  ],
};
