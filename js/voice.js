// Speech. Every spoken line is made of short clips (see TEXT in content.js).
// For each clip we play, in order of preference:
//   1. your own recording made in the Voice studio (kept in this browser),
//   2. your own recording shipped with the game in voice/my-voice.json,
//   3. Jenny's recording in voice/jenny.json,
// and if any clip in a line is missing, the whole line falls back to the device's speech engine.
'use strict';

const VO = { raw: null, buf: {}, nodes: [], endAt: 0, token: 0, route: '' };
const MY = { local: {}, pack: {} }; // clip key -> ArrayBuffer of WAV or MP3 bytes
fetch('voice/jenny-missing.json').then(r => r.ok ? r.json() : null).then(j => { VO.raw = j; if (AC) decodeVoice(); }).catch(() => { VO.raw = null; });
fetch('voice/my-voice.json').then(r => r.ok ? r.json() : null).then(j => {
  if (!j || !j.clips) return;
  Object.entries(j.clips).forEach(([k, b]) => { MY.pack[k] = b64ToBuf(b); });
  forgetDecoded(Object.keys(j.clips));
  if (typeof studioRefresh === 'function') studioRefresh();
}).catch(() => { /* no voice pack shipped: that's fine */ });

function b64ToBuf(b) { const s = atob(b), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
function myBytes(k) { return S.myVoice === false ? null : (MY.local[k] || MY.pack[k] || null); }
function forgetDecoded(keys) { keys.forEach(k => { delete VO.buf['me:' + k]; delete VO.buf['_pme:' + k]; }); }
function decodeBytes(cacheKey, getBytes) {
  if (VO.buf[cacheKey]) return Promise.resolve(VO.buf[cacheKey]);
  if (VO.buf['_p' + cacheKey]) return VO.buf['_p' + cacheKey];
  const bytes = getBytes();
  if (!bytes || !AC) return Promise.resolve(null);
  const p = new Promise(res => {
    try {
      const r = AC.decodeAudioData(bytes.slice(0), b => { VO.buf[cacheKey] = b; res(b); }, () => res(null));
      if (r && r.catch) r.catch(() => res(null));
    } catch (e) { res(null); }
  });
  VO.buf['_p' + cacheKey] = p;
  return p;
}
async function clipFor(k) {
  if (myBytes(k)) { const b = await decodeBytes('me:' + k, () => myBytes(k)); if (b) return { b, src: 'mine' }; }
  if (S.voice === 'natural' && VO.raw && VO.raw[k]) { const b = await decodeBytes(k, () => b64ToBuf(VO.raw[k])); if (b) return { b, src: 'jenny' }; }
  return null;
}
async function decodeVoice() { if (!VO.raw || !AC || S.voice !== 'natural') return; for (const k of Object.keys(VO.raw)) await decodeBytes(k, () => b64ToBuf(VO.raw[k])); }

let voice = null;
const hasSpeech = 'speechSynthesis' in window;
function pickVoice() {
  if (!hasSpeech) return;
  const vs = speechSynthesis.getVoices();
  const nice = /natural|neural|enhanced|premium|sonia|libby|serena|kate|martha|stephanie|google uk english female/i;
  voice = vs.find(v => /en[-_]GB/i.test(v.lang) && nice.test(v.name)) || vs.find(v => /^en/i.test(v.lang) && nice.test(v.name))
    || vs.find(v => /en[-_]GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null;
}
if (hasSpeech) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
const talking = () => (AC && AC.currentTime < VO.endAt) || (hasSpeech && speechSynthesis.speaking);
let sayTimer = null;
function caption(text) { $('say').textContent = text; clearTimeout(sayTimer); sayTimer = setTimeout(() => { $('say').textContent = ''; }, 5500); }
function stopVoice() { VO.token++; VO.nodes.forEach(n => { try { n.stop(); } catch (e) { /* already stopped */ } }); VO.nodes = []; VO.endAt = 0; if (hasSpeech) speechSynthesis.cancel(); }
// parts: clip keys, or numbers (a pause in seconds)
async function talk(parts, { interrupt = true, show = true, cap = null } = {}) {
  const text = parts.filter(p => typeof p === 'string').map(p => TEXT[p] || '').join(' ').replace(/ ([!?.,…])/g, '$1');
  if (show) caption(cap || text);
  if (interrupt) stopVoice();
  const token = VO.token;
  if (AC) {
    const clips = await Promise.all(parts.map(p => typeof p === 'string' ? clipFor(p) : Promise.resolve(p)));
    if (token !== VO.token) return;
    if (!clips.some(c => c === null)) {
      let t = Math.max(AC.currentTime + 0.03, VO.endAt);
      clips.forEach(c => {
        if (typeof c === 'number') { t += c; return; }
        const s = AC.createBufferSource(); s.buffer = c.b; s.connect(voiceGain); s.start(t); VO.nodes.push(s); t += c.b.duration + 0.06;
      });
      VO.endAt = t; VO.route = clips.some(c => c && c.src === 'mine') ? 'mine' : 'jenny';
      if (musicGain) { musicGain.gain.setTargetAtTime(musicLevel(), AC.currentTime, 0.08); setTimeout(() => musicGain.gain.setTargetAtTime(musicLevel(), AC.currentTime, 0.3), (t - AC.currentTime) * 1000 + 50); }
      return;
    }
  }
  if (!hasSpeech) { VO.route = 'none'; return; }
  try {
    const u = new SpeechSynthesisUtterance(text.replace(/…/g, ', '));
    if (voice) u.voice = voice;
    u.lang = voice ? voice.lang : 'en-GB'; u.rate = 0.86; u.pitch = 1.04; u.volume = 0.9;
    speechSynthesis.speak(u); VO.route = 'device';
  } catch (e) { VO.route = 'none'; }
}
const yes = () => pick(['yes1', 'yes2', 'yes3', 'yes4']);
// "Test the voice" in settings: says hello and reports what actually played
async function testVoice() {
  audioInit();
  await talk(['hi_' + (S.char || 'bob'), 0.2, 's_s', 'w_s']);
  const msg = { mine: 'Playing your own recordings (Jenny fills any gaps).', jenny: "Playing Jenny's voice.",
    device: "Using this device's own voice. If you can't hear it, turn the volume up or switch to Natural.",
    none: 'No voice is available on this device. Check the volume, and on iPhone make sure the ringer switch is on or the volume is up.' }[VO.route] || '';
  $('voiceStatus').textContent = msg;
}
