// La ronde : une musique générative à trois temps, synthétisée (section 14).
// Basse au premier temps, os qui claquent aux deux autres, et une mélodie de
// ré mineur tirée d'un motif qui revient, avec le triton (la « note du
// diable » de la Danse macabre). Elle accélère quand le sablier se vide.
// Le son n'est pas la logique du jeu : il a son propre petit générateur.
//
//   const ronde = creerRonde(audio.ctx, { volume: 0.7 })
//   ronde.jouer(); ronde.arreter(); ronde.setVolume(0.5)
//   ronde.setTension(0..1)   // 0 = début du tableau, 1 = sablier vide

const RE = 146.83; // ré 3
const GAMME = [0, 2, 3, 5, 6, 7, 8, 10, 12, 14, 15]; // ré mineur, avec le triton (6 demi-tons)
const MOTIF = [7, 6, 7, 0, 3, 5, 6, 3];              // indices dans GAMME : la phrase qui revient
const BASSE = [0, 0, 5, 7];                          // demi-tons, une note par mesure

export function creerRonde(ctx, { volume = 0.7, tempoLent = 92, tempoVif = 150 } = {}) {
  if (!ctx) return { jouer() {}, arreter() {}, setVolume() {}, setTension() {}, get joue() { return false; } };
  const sortie = ctx.createGain();
  sortie.gain.value = volume;
  sortie.connect(ctx.destination);
  let graine = 7;
  const hasard = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff; };
  let tension = 0, minuterie = null, prochain = 0, temps = 0, mesure = 0;
  const bruit = ctx.createBuffer(1, ctx.sampleRate / 10, ctx.sampleRate);
  const d = bruit.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = hasard() * 2 - 1;

  function note(freq, quand, dur, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, quand);
    g.gain.exponentialRampToValueAtTime(vol, quand + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, quand + dur);
    o.connect(g); g.connect(sortie);
    o.start(quand); o.stop(quand + dur + 0.02);
  }
  function os(quand, vol) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = bruit; f.type = 'bandpass'; f.frequency.value = 2400 + hasard() * 800; f.Q.value = 6;
    g.gain.setValueAtTime(vol, quand); g.gain.exponentialRampToValueAtTime(0.0001, quand + 0.06);
    s.connect(f); f.connect(g); g.connect(sortie);
    s.start(quand); s.stop(quand + 0.08);
  }
  const demiTon = n => RE * 2 ** (n / 12);

  function temps3(quand, duree) {
    const t = temps % 3;
    if (t === 0) {
      note(demiTon(BASSE[mesure % BASSE.length] - 12), quand, duree * 2.2, 'triangle', 0.32);
      if (mesure % 2 === 0) note(demiTon(BASSE[mesure % BASSE.length]), quand, duree * 0.9, 'square', 0.04);
    } else os(quand, t === 1 ? 0.22 : 0.14);
    // La mélodie : le motif, parfois varié ; plus serrée quand la tension monte
    const pas = (mesure * 3 + t) % MOTIF.length;
    if (t !== 1 || hasard() < 0.3 + tension * 0.5) {
      let i = MOTIF[pas];
      if (hasard() < 0.25) i = Math.min(GAMME.length - 1, Math.max(0, i + (hasard() < 0.5 ? -1 : 1)));
      note(demiTon(GAMME[i] + 12), quand, duree * 0.8, 'square', 0.05 + tension * 0.03);
    }
    temps++;
    if (temps % 3 === 0) mesure++;
  }

  function planifier() {
    const duree = 60 / (tempoLent + (tempoVif - tempoLent) * tension);
    while (prochain < ctx.currentTime + 0.15) {
      temps3(prochain, duree);
      prochain += duree;
    }
  }

  return {
    get joue() { return minuterie !== null; },
    jouer() {
      if (minuterie !== null) return;
      prochain = ctx.currentTime + 0.05;
      minuterie = setInterval(planifier, 40);
    },
    arreter() { clearInterval(minuterie); minuterie = null; },
    setVolume(v) { sortie.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.02); },
    setTension(x) { tension = Math.max(0, Math.min(1, x)); },
  };
}

// Les bruitages du jeu, ajoutés à la banque de audio.js
export const BRUITAGES = {
  choisir: { type: 'square', freq: 520, dur: 0.04, vol: 0.18 },
  galop: [{ type: 'noise', dur: 0.05, vol: 0.35, filter: 700 }, { type: 'noise', dur: 0.05, vol: 0.3, filter: 600, at: 0.09 }, { type: 'noise', dur: 0.05, vol: 0.32, filter: 650, at: 0.18 }],
  frapper: [{ type: 'noise', dur: 0.12, vol: 0.55, filter: 1400, to: 300 }, { type: 'square', freq: 180, to: 90, dur: 0.1, vol: 0.2 }],
  peser: [{ type: 'triangle', freq: 110, to: 82, dur: 0.5, vol: 0.4 }, { type: 'triangle', freq: 165, to: 123, dur: 0.5, vol: 0.18 }],
  decocher: [{ type: 'noise', dur: 0.08, vol: 0.3, filter: 4000, to: 1500 }, { type: 'square', freq: 900, to: 300, dur: 0.15, vol: 0.12 }],
  faucher: [{ type: 'noise', dur: 0.3, vol: 0.45, filter: 6000, to: 400 }, { type: 'triangle', freq: 587, dur: 0.6, vol: 0.25, at: 0.12 }, { type: 'triangle', freq: 830, dur: 0.6, vol: 0.12, at: 0.12 }],
  ronde: [{ type: 'triangle', freq: 440, dur: 0.15, vol: 0.2 }, { type: 'triangle', freq: 622, dur: 0.3, vol: 0.2, at: 0.15 }],
  abri: { type: 'square', freq: 330, to: 220, dur: 0.2, vol: 0.12 },
  glas: [{ type: 'triangle', freq: 98, dur: 1.2, vol: 0.4 }, { type: 'triangle', freq: 147, dur: 1, vol: 0.15 }],
  refus: { type: 'sawtooth', freq: 140, to: 100, dur: 0.16, vol: 0.2 },
  victoire: [{ type: 'triangle', freq: 294, dur: 0.3 }, { type: 'triangle', freq: 349, dur: 0.3, at: 0.25 }, { type: 'triangle', freq: 440, dur: 0.3, at: 0.5 }, { type: 'triangle', freq: 415, dur: 0.9, at: 0.75 }],
  aube: [{ type: 'triangle', freq: 220, to: 110, dur: 1.4, vol: 0.35 }],
};
