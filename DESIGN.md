# Les 4 cavaliers — Bible du jeu

Document de référence. Il décrit **l'intention** : ce que le jeu est et veut
être. La technique est dans `CLAUDE.md`. Les décisions de Jérôme sont datées
par version (« Jérôme, v0.1.0 ») ; les propositions pas encore tranchées
portent `[À VALIDER]`.

## Intention

Le monde s'effondre : une Grande Guerre qui ne finit pas, des fronts qui
avancent dans les villages, les gares, les hôpitaux. Le joueur ne sauve
personne. Il mène les quatre cavaliers et compose, tour après tour, une
danse macabre : la Mort ouvre la ronde, les âmes la suivent en se tenant par
la main, et la ronde grandit jusqu'à barrer le monde. On joue pour la
lecture froide du plateau — tout ce qui va arriver est annoncé — et pour
l'élégance d'un tour où les quatre gestes s'enchaînent. On revient parce
qu'on a vu, trop tard, le tour qu'il fallait jouer.

Le ton : la lucidité désespérée, l'ironie, la rage froide (Logique du
pire) ; le memento mori au moment du triomphe ; le silence comme mise en
scène (Rollinat) : le jeu montre, il ne commente pas.

## Piliers

1. **La mort rend tout le monde égal.** Soldat, brancardier, aumônier : tous
   finissent dans la même ronde, avec le même squelette.
2. **Tout est annoncé.** Où chaque vivant va, qui tombera, qui entrera dans
   la ronde : la vérité est à l'écran avant la fin du tour. Le hasard fait
   la carte, jamais le coup.
3. **Quatre fléaux lisibles d'un coup d'œil** (Dürer) : une couleur, une
   silhouette et un attribut chacun — l'épée, la balance, l'arc, la faux.
4. **La ronde est une mécanique, pas un décor.** Elle suit la Mort, barre le
   passage, entraîne les vivants qu'elle touche.
5. **Le silence est l'âme des choses.** Aucun texte indispensable, aucun
   tutoriel : le premier tableau s'apprend par le geste.

## La boucle de jeu

- **Seconde** : choisir un cavalier, voir où il peut chevaucher (cadres
  d'os) et qui il peut atteindre (cadres de braise) ; un clic, il chevauche ;
  un clic, il frappe. Les pointillés des vivants se redessinent aussitôt.
- **Tour** (~30 s) : quatre cavaliers, quatre gestes, dans l'ordre qu'on
  veut ; « Recommencer le tour » si la combinaison ne tient pas ; puis les
  vivants jouent : contagion, ronde, fuite vers les abris.
- **Tableau** (~2 à 3 min, 7 tours au sablier) : prendre le quota d'âmes
  avant que les vivants soient à l'abri ou que l'aube se lève.
- **Partie** (~15 min) : des tableaux de plus en plus peuplés (le front, le
  bois brûlé, le village, la gare, l'hôpital, la cathédrale, la ville), avec
  des brancardiers puis des aumôniers. La partie s'arrête au premier tableau
  manqué : « L'aube se lève. La danse s'arrête. »
- **Entre deux parties** : le record seulement (la plus longue danse). Aucun
  déblocage.

## Le lot minimal

Choisi par Jérôme (v0.1.0) :

1. **Un tableau tactique** : une grille du front (boue, tranchées, barbelés,
   cratères, abris), des vivants qui fuient vers les abris, les quatre
   cavaliers et leurs quatre gestes.
2. **Le cortège** : chaque âme fauchée danse à la suite de la Mort, barre le
   passage et entraîne les vivants qu'elle touche.

Pour que le critère se mesure, les tableaux s'enchaînent déjà (générés par
graine, de plus en plus peuplés) ; les offrandes entre tableaux et la voix
du sablier restent hors du lot.

**Critère de validation** : une partie dure 15 minutes intenses (Jérôme,
v0.1.0). Mesure de départ : le bot glouton tient 4 tableaux en médiane,
31 tours, ≈ 15 min à 30 s par tour. Reste à le confirmer par un joueur.

## Les systèmes

### Les quatre cavaliers

Chacun : chevaucher (une fois), puis un geste (une fois) ; agir sans avoir
chevauché est permis, chevaucher après le geste ne l'est pas.

| Cavalier | Allure | Geste |
|---|---|---|
| **Guerre** (épée, cheval de braise) | 4 | **Frapper** un voisin : −1 PV et le repousse d'une case. Contre un obstacle, le choc blesse (et blesse aussi le vivant heurté). Dans une tranchée, pas de recul. Dans les barbelés, il reste pris un tour. |
| **Famine** (balance, cheval noir) | 4 | **Peser** : tous les vivants autour d'elle (8 voisins) ne bougent plus au prochain tour. |
| **Peste** (arc, masque à gaz, cheval blanc) | 3 | **Décocher** en ligne droite (4 cases) : contamine le premier vivant. Un contaminé perd 1 PV à chaque tour et contamine ses voisins. |
| **Mort** (faux, cheval pâle) | 4 | **Faucher** un voisin à 1 PV, ou un gisant : son âme rejoint la ronde. Elle ne passe que par des cases libres (elle traîne le cortège). |

### Les vivants

- **Soldat** (2 PV, 2 cases) ; **brancardier** (2 PV, 2 cases) : relève un
  gisant voisin (au lieu de marcher) ou soigne un voisin (+1 PV, guérit) ;
  **aumônier** (3 PV, 1 case) : la Mort ne peut faucher ses voisins.
- Un vivant à 0 PV tombe : **gisant**. Seule la Mort le prend ; sinon un
  brancardier peut le relever. Un gisant laissé à la fin du tableau est perdu
  pour la ronde.
- Ils fuient vers l'abri le plus proche par le plus court chemin, le plus
  proche d'un abri d'abord. Barbelés, cratères, cavaliers, gisants et
  danseurs leur barrent la route.

### La ronde

- Les âmes suivent la Mort pas à pas, chacune à la place de celle qui la
  précède. Elles barrent la route des vivants.
- Un vivant touché par **deux danseurs** (la Mort comptée) au début du tour
  des vivants entre dans la ronde : une âme de plus.

### Le tableau

- Quota d'âmes (35 % des vivants au premier tableau, +4 % par tableau, 70 %
  au plus), sablier de 7 tours. Fini quand plus personne n'est debout, ou au
  sablier. Gagné si le quota est atteint.

## Le monde, le récit

Une uchronie de 14-18 qui n'a jamais signé d'armistice. Les lieux
s'enfoncent du front vers la ville. Pas de nom réel. Le récit est dans le
plateau : les tranchées, les abris éclairés d'une lanterne (l'espoir), le
cortège qui grandit. Une seule phrase au triomphe, celle de l'esclave
derrière le général : « Souviens-toi : toi aussi tu danseras. »

## Palette, échelle, son

- **Boue et linceul** : un front boueux, des os, un peu de braise et de
  cire (la bougie des vanités). Les quatre chevaux de Dürer : rouge (braise,
  pour se lire sur la boue), noir, blanc, pâle.
- Une case de 24 px est un cavalier ; un vivant est à l'encolure du cheval :
  les cavaliers dominent.
- **La ronde** : une musique générative à trois temps, basse au premier,
  os qui claquent aux deux autres, une mélodie de ré mineur avec le triton
  de la Danse macabre ; elle accélère quand le sablier se vide.

## Public et accessibilité

Joueur averti, au bureau, clavier et souris. Tout se fait des deux. Aucun
texte indispensable : les cadres disent où aller et qui atteindre, les
pointillés disent ce que feront les vivants, la fiche nomme ce qui est sous
le curseur. Un refus dit sa raison (« Trop vivant encore. »).

## Ce que le jeu refuse

- **Pas de tutoriel bavard** (Jérôme, v0.1.0) : le premier tableau
  s'apprend par le geste ; la fiche nomme, elle n'explique pas.
- Pas de hasard dans la résolution d'un coup : tout ce qui est annoncé
  arrive (pilier 2) `[À VALIDER]`.
- Pas de déblocage permanent qui rendrait le jeu plus facile : le record
  seul `[À VALIDER]`.

## Questions ouvertes

- **Les offrandes** entre deux tableaux (une règle tordue à choisir parmi
  trois) : la course de 3 tableaux proposée au démarrage, hors du lot.
- **La voix du sablier** : un murmure memento mori quand le quota est
  atteint (au moment du triomphe).
- **La manette** avant Steam.
- Un tableau dure-t-il assez pour que le sablier pèse ? À mesurer avec un
  joueur.
