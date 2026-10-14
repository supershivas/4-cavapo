// Le rendu (Phaser 3.90, chargé par vendor/phaser.min.js) : il dessine la
// partie et ne la modifie jamais (section 12). Partagé par le jeu et le labo :
// ce que le labo montre est ce que le jeu dessine.
//
// Espace logique fixe 640 × 360, une case de 24 px (un cavalier). La mise à
// l'échelle se fait ici seulement : facteur ENTIER en pixels physiques
// (section 7), caméra zoomée de ce facteur, canevas réduit en CSS de
// devicePixelRatio (sinon, à 125 %, les pixels tombent entre deux pixels).
// Rendu CANVAS et non WebGL : palette exacte, et le jeu tourne sans carte
// graphique (le conteneur de vérification n'en a pas).
import { spriteCanvas } from './lib/sprites.js?v=0.1.0';
import { PALETTE } from './palette.js?v=0.1.0';

export const LOGIQUE = { largeur: 640, hauteur: 360, case: 24 };
export const PLATEAU = { x: 140, y: 44 };   // coin du plateau, en pixels logiques
const C = LOGIQUE.case;
const SOL = { '.': 'sol_boue', '=': 'sol_tranchee', x: 'sol_barbeles', o: 'sol_cratere', A: 'sol_abri' };
const PAS_MS = 70;                          // durée d'une case parcourue
const hex = c => parseInt(PALETTE[c].slice(1), 16);
const centre = (x, y) => ({ x: PLATEAU.x + x * C, y: PLATEAU.y + y * C });

// → Promise<api>. `parent` doit avoir une taille ; le canevas ne la lui donne jamais.
export function creerRendu(parent, { sprites, mode = 'ecran' } = {}) {
  const Phaser = window.Phaser;
  let api;
  return new Promise(resolve => {
    class Scene extends Phaser.Scene {
      constructor() { super('plateau'); }
      create() {
        for (const [nom, rows] of Object.entries(sprites)) this.textures.addCanvas(nom, spriteCanvas(rows, PALETTE));
        this.sols = this.add.container(0, 0);
        this.gSous = this.add.graphics();
        this.unites = this.add.container(0, 0);
        this.gSur = this.add.graphics();
        this.marques = this.add.container(0, 0);
        this.images = new Map();
        this.fantomes = new Set();   // images qui s'en vont (réfugiés), détruites à la fin de leur trajet
        this.cleTableau = null;
        this.vue = null;
        this.temps = 0;
        api = creerApi(this);
        resize();
        resolve(api);
      }
      update(_t, dt) {
        this.temps += dt / 1000;
        danser(this);
      }
    }
    const game = new Phaser.Game({
      type: Phaser.CANVAS,
      parent,
      width: LOGIQUE.largeur,
      height: LOGIQUE.hauteur,
      backgroundColor: PALETTE.n,
      pixelArt: true,
      roundPixels: true,
      antialias: false,
      banner: false,
      audio: { noAudio: true },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      scale: { mode: Phaser.Scale.NONE },
      scene: Scene,
    });
    let facteur = 1;
    // Le plus grand facteur entier qui fait tenir 640 × 360 en pixels physiques
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.floor(parent.clientWidth * dpr), h = Math.floor(parent.clientHeight * dpr);
      facteur = Math.max(1, Math.floor(Math.min(w / LOGIQUE.largeur, h / LOGIQUE.hauteur)));
      game.scale.resize(LOGIQUE.largeur * facteur, LOGIQUE.hauteur * facteur);
      game.scale.setZoom(1 / dpr);
      const cam = game.scene.getScene('plateau')?.cameras.main;
      if (cam) { cam.setZoom(facteur); cam.centerOn(LOGIQUE.largeur / 2, LOGIQUE.hauteur / 2); }
      const c = game.canvas;
      c.style.position = 'absolute';
      c.style.left = `${Math.floor((parent.clientWidth - (LOGIQUE.largeur * facteur) / dpr) / 2)}px`;
      c.style.top = `${Math.floor((parent.clientHeight - (LOGIQUE.hauteur * facteur) / dpr) / 2)}px`;
      c.style.imageRendering = 'pixelated';
      api?.onResize?.(cadre());
    }
    const cadre = () => {
      const r = game.canvas.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height, unite: r.width / LOGIQUE.largeur, facteur };
    };
    const ro = new ResizeObserver(() => resize());
    ro.observe(parent);
    let mq = null;
    const suivreDpr = () => { mq?.removeEventListener('change', surDpr); mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`); mq.addEventListener('change', surDpr); };
    function surDpr() { resize(); suivreDpr(); }
    suivreDpr();

    function creerApi(scene) {
      return {
        game, scene,
        cadre,
        onResize: null,
        // Coordonnées d'écran (clientX, clientY) → case du plateau, ou null
        versCase(cx, cy, t) {
          const r = cadre();
          const lx = (cx - r.left) / r.unite, ly = (cy - r.top) / r.unite;
          const x = Math.floor((lx - PLATEAU.x) / C), y = Math.floor((ly - PLATEAU.y) / C);
          return t && x >= 0 && y >= 0 && x < t.cols && y < t.rows ? { x, y } : null;
        },
        afficher(partie, ui = {}, evenements = []) { afficher(scene, partie, ui, evenements); },
        // Vrai tant qu'une animation joue (les vivants marchent)
        get occupe() { return scene.tweens.getTweens().some(tw => tw.isPlaying()); },
        // Un geste du joueur n'attend pas l'animation : elle s'achève aussitôt
        // (TweenChain.complete plante en 3.90 : on arrête tout et l'on pose chaque image à sa place)
        achever() {
          scene.tweens.killAll();
          for (const img of scene.images.values()) if (img.cible) img.setPosition(img.cible.x, img.cible.y);
          for (const img of scene.fantomes) img.destroy();
          scene.fantomes.clear();
        },
        setTimeScale(s) { scene.tweens.timeScale = s; },
        pause() { game.loop.sleep(); },
        reprendre() { game.loop.wake(); },
        resize,
        destroy() { ro.disconnect(); mq?.removeEventListener('change', surDpr); game.destroy(true); },
      };
    }
  });
}

// ─── Dessin ────────────────────────────────────────────────────────────────
function afficher(scene, partie, ui, evenements) {
  const t = partie.tableau;
  scene.vue = { partie, ui };
  const cleT = `${partie.seed}:${t.niveau}`;
  if (cleT !== scene.cleTableau) {
    scene.cleTableau = cleT;
    scene.sols.removeAll(true);
    scene.tweens.killAll();
    for (const img of [...scene.images.values(), ...scene.fantomes]) img.destroy();
    scene.images.clear();
    scene.fantomes.clear();
    for (let y = 0; y < t.rows; y++) for (let x = 0; x < t.cols; x++) {
      const p = centre(x, y);
      scene.sols.add(scene.add.image(p.x, p.y, SOL[t.sol[y][x]]).setOrigin(0));
    }
    evenements = [];
  }

  // Les trajets à suivre pas à pas (chevauchée, marche, poussée)
  const trajets = new Map();
  let delai = 0;
  for (const e of evenements) {
    if (e.type === 'chevauche' || e.type === 'marche') trajets.set(e.id, e.chemin);
    else if (e.type === 'pousse') trajets.set(e.id, [e.vers]);
    if (e.type === 'marche') delai = Math.max(delai, e.chemin.length * PAS_MS);
  }

  // Les unités voulues : cavaliers, vivants, danseurs
  const voulues = new Map();
  for (const c of t.cavaliers) voulues.set(c.id, { x: c.x, y: c.y, tex: c.id });
  for (const v of t.vivants) voulues.set(v.id, { x: v.x, y: v.y, tex: v.etat === 'gisant' ? 'gisant' : v.type });
  t.cortege.forEach((a, i) => voulues.set(`ame:${i}`, { x: a.x, y: a.y, tex: 'ame' }));

  for (const [id, img] of scene.images) {
    if (voulues.has(id)) continue;
    // Disparu : réfugié (il entre dans l'abri) ou pris par la ronde
    const traj = trajets.get(id);
    if (traj?.length) { scene.fantomes.add(img); suivre(scene, img, traj, () => { scene.fantomes.delete(img); img.destroy(); }); }
    else img.destroy();
    scene.images.delete(id);
  }
  for (const [id, u] of voulues) {
    const p = centre(u.x, u.y);
    let img = scene.images.get(id);
    if (img) img.cible = p;
    if (!img) {
      img = scene.add.image(p.x, p.y, u.tex).setOrigin(0);
      img.cible = p;
      scene.unites.add(img);
      scene.images.set(id, img);
      if (evenements.length && id.startsWith('ame:')) clignoter(scene, img);
      continue;
    }
    if (img.texture.key !== u.tex) { img.setTexture(u.tex); if (u.tex === 'gisant') clignoter(scene, img); }
    if (img.x === p.x && img.y === p.y) continue;
    const traj = trajets.get(id);
    scene.tweens.killTweensOf(img);
    if (traj?.length && traj[traj.length - 1].x === u.x && traj[traj.length - 1].y === u.y) suivre(scene, img, traj);
    else scene.tweens.add({ targets: img, x: p.x, y: p.y, duration: PAS_MS * 2 });
  }
  // Les unités se recouvrent du nord au sud ; les gisants dessous
  scene.unites.list.sort((a, b) => a.y - b.y || (a.texture.key === 'gisant' ? -1 : 0) - (b.texture.key === 'gisant' ? -1 : 0));
  dessinerSurcouches(scene);
  return delai;
}

function suivre(scene, img, chemin, fin) {
  scene.tweens.chain({
    targets: img,
    tweens: chemin.map(p => ({ ...centre(p.x, p.y), duration: PAS_MS })),
    onComplete: fin,
  });
}

// Un éclat bref (afficher / cacher), sans transparence : aucune teinte de plus
function clignoter(scene, img) {
  scene.time.addEvent({ delay: 60, repeat: 5, callback: () => { if (img.active) img.setVisible(!img.visible); } });
  scene.time.delayedCall(420, () => img.active && img.setVisible(true));
}

// La ronde danse : chaque danseur saute d'un pixel, à son tour
function danser(scene) {
  if (!scene.vue) return;
  const { partie, ui } = scene.vue;
  const t = partie.tableau;
  t.cortege.forEach((a, i) => {
    const img = scene.images.get(`ame:${i}`);
    if (!img || scene.tweens.isTweening(img)) return;
    img.y = centre(a.x, a.y).y - (Math.floor(scene.temps * 3 + i) % 2);
  });
  const sel = ui.selection && scene.images.get(ui.selection);
  for (const c of t.cavaliers) {
    const img = scene.images.get(c.id);
    if (!img || scene.tweens.isTweening(img)) continue;
    img.y = centre(c.x, c.y).y - (img === sel && Math.floor(scene.temps * 4) % 2 ? 1 : 0);
  }
  dessinerSurcouches(scene);
}

function cadreCase(g, x, y, couleur, epaisseur = 1, coin = 0) {
  const p = centre(x, y);
  g.fillStyle(hex(couleur));
  if (!coin) {
    g.fillRect(p.x, p.y, C, epaisseur); g.fillRect(p.x, p.y + C - epaisseur, C, epaisseur);
    g.fillRect(p.x, p.y, epaisseur, C); g.fillRect(p.x + C - epaisseur, p.y, epaisseur, C);
    return;
  }
  const e = epaisseur, x0 = p.x, y0 = p.y, x1 = p.x + C, y1 = p.y + C;
  for (const [x, y, w, hh] of [
    [x0, y0, coin, e], [x0, y0, e, coin], [x1 - coin, y0, coin, e], [x1 - e, y0, e, coin],
    [x0, y1 - e, coin, e], [x0, y1 - coin, e, coin], [x1 - coin, y1 - e, coin, e], [x1 - e, y1 - coin, e, coin],
  ]) g.fillRect(x, y, w, hh);
}

// Pointillé de case en case, au pixel (aucune ligne lissée)
function pointilles(g, de, chemin, couleur) {
  g.fillStyle(hex(couleur));
  let a = { x: de.x, y: de.y };
  for (const b of chemin) {
    const pa = centre(a.x, a.y), pb = centre(b.x, b.y);
    const n = 6;
    for (let i = 1; i <= n; i++) {
      const x = Math.round(pa.x + ((pb.x - pa.x) * i) / n) + C / 2 - 1, y = Math.round(pa.y + ((pb.y - pa.y) * i) / n) + C / 2 - 1;
      g.fillRect(x, y, 2, 2);
    }
    a = b;
  }
}

function dessinerSurcouches(scene) {
  const { partie, ui } = scene.vue;
  const t = partie.tableau;
  const g = scene.gSous, h = scene.gSur;
  g.clear(); h.clear();
  scene.marques.removeAll(true);
  const enJeu = partie.phase === 'jeu';

  // La chaîne de la ronde : les danseurs se tiennent par la main
  const mort = t.cavaliers.find(c => c.id === 'mort');
  if (t.cortege.length) pointilles(g, mort, t.cortege, 'o');

  // Ce que feront les vivants (la vérité, voir prevoir())
  if (enJeu && ui.intentions) {
    for (const o of ui.intentions) {
      if (o.chemin.length) pointilles(g, o.de, o.chemin, o.issue === 'refugie' ? 'l' : 'c');
    }
  }
  // Cases où chevaucher, cibles du geste
  for (const p of ui.deplacements || []) cadreCase(g, p.x, p.y, 'o', 1, 4);
  // Une cible : un cadre de braise doublé de nuit, lisible sur la boue comme sur l'os
  for (const p of ui.cibles || []) { cadreCase(h, p.x, p.y, 'e', 2); const c = centre(p.x, p.y); h.fillStyle(hex('n')); h.fillRect(c.x + 2, c.y + 2, C - 4, 1); h.fillRect(c.x + 2, c.y + C - 3, C - 4, 1); h.fillRect(c.x + 2, c.y + 2, 1, C - 4); h.fillRect(c.x + C - 3, c.y + 2, 1, C - 4); }
  if (ui.selection) {
    const c = t.cavaliers.find(c => c.id === ui.selection);
    if (c) cadreCase(g, c.x, c.y, 'c', 1);
  }
  if (ui.curseur) cadreCase(h, ui.curseur.x, ui.curseur.y, 'c', 1, 6);

  // Les PV, l'état, et ce qui va arriver
  const issue = new Map((ui.intentions || []).map(o => [o.id, o.issue]));
  for (const v of t.vivants) {
    const img = scene.images.get(v.id);
    if (!img || v.etat !== 'debout') continue;
    const x = Math.round(img.x), y = Math.round(img.y);
    for (let i = 0; i < v.pv; i++) { h.fillStyle(hex('n')); h.fillRect(x + 3 + i * 4, y + 1, 4, 4); h.fillStyle(hex('e')); h.fillRect(x + 4 + i * 4, y + 2, 2, 2); }
    if (v.infecte) scene.marques.add(scene.add.image(x + 18, y + 1, 'marque_contagion').setOrigin(0));
    if (v.affame) scene.marques.add(scene.add.image(x + 18, y + 7, 'marque_faim').setOrigin(0));
    const fin = issue.get(v.id);
    if (enJeu && (fin === 'entraine' || fin === 'tombe')) {
      // Une croix d'os : il ne passera pas le tour
      h.fillStyle(hex('o'));
      for (let i = 0; i < 5; i++) { h.fillRect(x + 1 + i, y + 17 + i, 1, 1); h.fillRect(x + 5 - i, y + 17 + i, 1, 1); }
    }
  }
}
