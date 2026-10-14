// Les nombres du jeu : aucun nombre magique dans la logique (section 12).
// La version publiée par l'atelier (assets/design/reglages.json) s'y fusionne
// au lancement.
export const REGLAGES = {
  grille: { cols: 15, rows: 11 },
  // Les quatre cavaliers, dans l'ordre des touches 1 à 4
  cavaliers: {
    guerre: { mouvement: 4, degats: 1, choc: 1 },     // choc : dégât d'une poussée contre un obstacle
    famine: { mouvement: 4, rayon: 1 },              // affame tous les vivants à cette distance (8 voisins)
    peste: { mouvement: 3, portee: 4, degats: 1 },   // dégât si la cible est déjà contaminée
    mort: { mouvement: 4, seuil: 1 },                // ne fauche qu'un vivant à ce nombre de PV ou moins
  },
  vivants: {
    soldat: { pv: 2, mouvement: 2 },
    brancardier: { pv: 2, mouvement: 2, soin: 1 },
    aumonier: { pv: 3, mouvement: 1 },
  },
  contagion: { degats: 1 },
  ronde: { entrainement: 2 },   // un vivant touché par autant de danseurs (ou la Mort) entre dans la ronde
  // Le tableau n (0, 1, 2…) : nombre de vivants, quota, sablier
  progression: {
    vivantsBase: 6, vivantsParTableau: 1, vivantsMax: 12,
    quotaPart: 0.35, quotaParTableau: 0.04, quotaPartMax: 0.7,   // part des vivants à faucher
    tours: 7,
    brancardiersDes: 1, aumoniersDes: 2,                          // premier tableau où ils paraissent
    barbelesBase: 6, barbelesParTableau: 1,
    crateresBase: 5, crateresParTableau: 1,
    abris: 3,
  },
};
