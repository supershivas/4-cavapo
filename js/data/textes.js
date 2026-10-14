// Les textes du jeu, sous des clés stables (section 13). Courts : le jeu
// montre plutôt qu'il ne dit.
export const TEXTES = {
  cavaliers: {
    guerre: { nom: 'Guerre', geste: 'Frapper', dit: 'Blesse et repousse un voisin.' },
    famine: { nom: 'Famine', geste: 'Peser', dit: 'Les vivants autour ne bougent plus.' },
    peste: { nom: 'Peste', geste: 'Décocher', dit: 'Contamine le premier vivant en ligne.' },
    mort: { nom: 'Mort', geste: 'Faucher', dit: 'Prend un vivant à bout, ou un gisant.' },
  },
  vivants: {
    soldat: 'Soldat',
    brancardier: 'Brancardier',
    aumonier: 'Aumônier',
    gisant: 'Gisant',
    ame: 'Danseur',
  },
  terrains: {
    '.': 'Boue',
    '=': 'Tranchée',
    x: 'Barbelés',
    o: 'Cratère',
    A: 'Abri',
  },
  refus: {
    finie: 'Le tableau est fini.',
    inconnu: 'Personne ici.',
    dejaAgi: 'Il a déjà agi.',
    dejaBouge: 'Il a déjà chevauché.',
    tropLoin: 'Trop loin.',
    occupe: 'La place est prise.',
    infranchissable: 'On ne passe pas.',
    pasDeCible: 'Rien à atteindre là.',
    tropVivant: 'Trop vivant encore.',
    veille: "L'aumônier veille sur lui.",
    personneAutour: 'Personne autour.',
    personneEnLigne: 'Personne dans cette ligne.',
  },
  fin: {
    victoire: 'La ronde continue.',
    memento: 'Souviens-toi : toi aussi tu danseras.',
    defaite: "L'aube se lève. La danse s'arrête.",
    record: 'Plus longue danse',
  },
};
