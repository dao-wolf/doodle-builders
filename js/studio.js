// Voice studio: record your own voice for every sound, word, number and line in the game.
// Recordings are cleaned up (silence trimmed, volume evened out), saved as small WAV files in
// this browser (IndexedDB), and can be exported as one voice pack (my-voice.json) to ship with the game.
'use strict';

const ST = { tab: 'sounds', cur: null, rec: null, stream: null, saver: undefined, clearArmed: 0 };
const OUT_RATE = 22050;

// ---------------------------------------------------------------- storage (IndexedDB, falls back to memory)
const IDB = { name: 'bobs-outpost-voice', store: 'clips', db: null };
function idbOpen() {
  if (IDB.db) return Promise.resolve(IDB.db);
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(IDB.name, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB.store);
      r.onsuccess = () => { IDB.db = r.result; res(r.result); };
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
function idbDo(mode, fn) {
  return idbOpen().then(db => new Promise((res, rej) => {
    const tx = db.transaction(IDB.store, mode); const out = fn(tx.objectStore(IDB.store));
    tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out); tx.onerror = () => rej(tx.error);
  }));
}
function idbLoadAll() {
  return idbOpen().then(db => new Promise((res, rej) => {
    const all = {}; const req = db.transaction(IDB.store).objectStore(IDB.store).openCursor();
    req.onsuccess = () => { const c = req.result; if (c) { all[c.key] = c.value; c.continue(); } else res(all); };
    req.onerror = () => rej(req.error);
  }));
}
idbLoadAll().then(all => { Object.assign(MY.local, all); studioRefresh(); }).catch(() => { ST.noStore = true; });

// ---------------------------------------------------------------- what can be recorded
const STRETCHY = new Set('s ss f ff l ll m n r v z zz sh th ng'.split(' '));
const BOUNCY = new Set('t p k c ck b d g h j w y qu ch x nk'.split(' '));
const VOWELS = new Set('a e i o u'.split(' '));
function soundTip(g) {
  const [letters, word, , sound] = G[g];
  if (STRETCHY.has(g)) return `Say the pure sound and hold it: "${sound}…", as in ${word}. No "uh" on the end.`;
  if (BOUNCY.has(g)) return `Short and crisp, the sound at the start of "${word}" (${letters}). No "uh" after it.`;
  if (VOWELS.has(g)) return `The short "${letters}" sound, as in ${word}.`;
  if (g === 'oo_s') return 'The short "oo", as in book.';
  if (g === 'oo_l') return 'The long "oo", as in boot.';
  return `Say "${letters}" the way it sounds in ${word}.`;
}
function clipList() {
  const gs = WEEKS.flatMap(w => w.g);
  return [
    ...gs.map(g => ({ key: 's_' + g, tab: 'sounds', label: G[g][0] + (g.startsWith('oo') ? ` (${G[g][1]})` : ''), say: soundTip(g) })),
    ...gs.map(g => ({ key: 'w_' + g, tab: 'words', label: G[g][1], say: `Say: "${TEXT['w_' + g]}"` })),
    ...Array.from({ length: 10 }, (_, i) => ({ key: 'n' + (i + 1), tab: 'numbers', label: String(i + 1), say: `Say: "${TEXT['n' + (i + 1)]}"` })),
    ...Object.keys(TEXT).filter(k => !/^(s_|w_|n\d)/.test(k)).map(k => ({ key: k, tab: 'lines', label: TEXT[k], say: 'Say it cheerfully, like Bob is talking.', line: true })),
  ];
}
const TABS = [['sounds', 'Sounds'], ['words', 'Words'], ['numbers', 'Numbers'], ['lines', "Bob's lines"]];
const clipState = k => MY.local[k] ? 'mine' : MY.pack[k] ? 'pack' : '';

// ---------------------------------------------------------------- UI
function studioRefresh() {
  if (!$('studio') || $('studio').hidden) return;
  const all = clipList();
  $('studioTabs').innerHTML = TABS.map(([id, name]) => {
    const list = all.filter(c => c.tab === id), done = list.filter(c => clipState(c.key)).length;
    return `<button role="tab" aria-selected="${ST.tab === id}" data-tab="${id}">${name} ${done}/${list.length}</button>`;
  }).join('');
  $('studioTabs').querySelectorAll('button').forEach(b => b.addEventListener('click', () => { ST.tab = b.dataset.tab; selectClip(all.find(c => c.tab === ST.tab)); }));
  $('clipList').innerHTML = all.filter(c => c.tab === ST.tab).map(c =>
    `<button class="clip ${c.line ? 'line' : ''} ${clipState(c.key)}" data-key="${c.key}" ${ST.cur && ST.cur.key === c.key ? 'aria-current="true"' : ''}><i></i>${escapeHtml(c.label)}</button>`).join('');
  $('clipList').querySelectorAll('.clip').forEach(b => b.addEventListener('click', () => selectClip(all.find(c => c.key === b.dataset.key))));
  if (ST.cur) {
    $('recLabel').textContent = ST.cur.tab === 'sounds' ? showG(ST.cur.key.slice(2)).join(' ') + (ST.cur.key.startsWith('s_oo') ? ` (${G[ST.cur.key.slice(2)][1]})` : '') : ST.cur.label;
    $('recLabel').classList.toggle('long', ST.cur.label.length > 12);
    const st = clipState(ST.cur.key);
    $('recSay').textContent = ST.cur.say + (st === 'mine' ? ' (Recorded.)' : st === 'pack' ? ' (In your voice pack.)' : '');
    $('recDel').disabled = st !== 'mine';
  }
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
function selectClip(c) { if (!c) return; ST.cur = c; recMsg(''); studioRefresh(); const el = $('clipList').querySelector('[aria-current="true"]'); if (el) el.scrollIntoView({ block: 'nearest' }); }
function recMsg(t) { $('recMsg').textContent = t; }
function openStudio() {
  audioInit();
  $('settings').hidden = true; $('studio').hidden = false;
  if (!ST.cur) ST.cur = clipList().find(c => c.tab === ST.tab);
  const canMic = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  $('micNote').hidden = canMic;
  $('micNote').textContent = canMic ? '' : "This browser can't use a microphone here. Use “Upload a file” to add recordings made on your phone, or open the game from your own website (see the README) to record.";
  studioRefresh();
  if (ST.saver === undefined && window.claude && typeof window.claude.use === 'function') {
    ST.saver = null; window.claude.use('downloads').then(d => { ST.saver = d; }).catch(() => { ST.saver = null; });
  }
}
function closeStudio() {
  stopRecording(true);
  if (ST.stream) { ST.stream.getTracks().forEach(t => t.stop()); ST.stream = null; }
  $('studio').hidden = true; fillSettingsUI(); $('settings').hidden = false;
}

// ---------------------------------------------------------------- recording
async function startRecording() {
  if (ST.rec) { stopRecording(); return; }
  audioInit(); stopVoice();
  if (!ST.cur) return;
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { micBlocked(); return; }
  try {
    ST.stream = ST.stream || await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch (e) { micBlocked(e); return; }
  if (AC.state === 'suspended') await AC.resume();
  const src = AC.createMediaStreamSource(ST.stream), proc = AC.createScriptProcessor(4096, 1, 1);
  const rec = { src, proc, chunks: [], rate: AC.sampleRate, t: 0, floor: 0, heard: false, quiet: 0, maxT: ST.cur.line ? 9 : 4.5 };
  proc.onaudioprocess = e => {
    if (ST.rec !== rec) return;
    const d = e.inputBuffer.getChannelData(0); rec.chunks.push(new Float32Array(d));
    let s = 0; for (let i = 0; i < d.length; i++) s += d[i] * d[i];
    const rms = Math.sqrt(s / d.length), dur = d.length / rec.rate; rec.t += dur;
    $('meterBar').style.width = Math.min(100, rms * 400) + '%';
    if (rec.t < 0.3) { rec.floor = Math.max(rec.floor, rms); return; } // listen to the room first
    const thr = Math.max(0.012, rec.floor * 2.5);
    if (rms > thr) { rec.heard = true; rec.quiet = 0; } else if (rec.heard) rec.quiet += dur;
    if ((rec.heard && rec.quiet > 0.75) || rec.t > rec.maxT || (!rec.heard && rec.t > 6)) stopRecording();
  };
  src.connect(proc); proc.connect(AC.destination); // the processor outputs silence; it only needs to run
  ST.rec = rec;
  $('recBtn').classList.add('on'); $('recBtn').innerHTML = '&#9632; STOP';
  recMsg('Listening… say it now.');
}
function stopRecording(cancel) {
  const rec = ST.rec; if (!rec) return;
  ST.rec = null;
  try { rec.proc.disconnect(); rec.src.disconnect(); } catch (e) { /* already disconnected */ }
  rec.proc.onaudioprocess = null;
  $('recBtn').classList.remove('on'); $('recBtn').innerHTML = '&#9679; RECORD'; $('meterBar').style.width = '0%';
  if (cancel) return;
  const n = rec.chunks.reduce((a, c) => a + c.length, 0), all = new Float32Array(n);
  let o = 0; rec.chunks.forEach(c => { all.set(c, o); o += c.length; });
  const clean = cleanClip(all, rec.rate);
  if (!clean) { recMsg("I didn't catch that. Try again, a little closer to the microphone."); return; }
  saveClip(ST.cur.key, encodeWav(clean, OUT_RATE), true);
}
function micBlocked(err) {
  $('micNote').hidden = false;
  $('micNote').textContent = (err && err.name === 'NotAllowedError')
    ? "The microphone isn't allowed here. Allow it in your browser, or use “Upload a file”. Inside the Claude app the microphone is always blocked: open the game from your own website to record."
    : "This browser can't use a microphone here. Use “Upload a file” instead, or open the game from your own website to record.";
}
// trim the silence, even out the volume and convert to a small mono file
function cleanClip(x, rate) {
  const win = Math.max(1, Math.round(rate * 0.01)), frames = [];
  for (let i = 0; i < x.length; i += win) { let s = 0; const e = Math.min(x.length, i + win); for (let j = i; j < e; j++) s += x[j] * x[j]; frames.push(Math.sqrt(s / (e - i))); }
  const loud = Math.max(...frames);
  if (!(loud > 0.01)) return null;
  const sorted = frames.slice().sort((a, b) => a - b), floor = sorted[Math.floor(sorted.length * 0.1)] || 0;
  const thr = Math.max(floor * 2.5, loud * 0.07);
  let a = frames.findIndex(f => f > thr), b = frames.length - 1 - frames.slice().reverse().findIndex(f => f > thr);
  if (a < 0) return null;
  a = Math.max(0, a - 6); b = Math.min(frames.length - 1, b + 15);
  const seg = x.subarray(a * win, Math.min(x.length, (b + 1) * win));
  const n = Math.max(1, Math.round(seg.length * OUT_RATE / rate)), y = new Float32Array(n);
  for (let i = 0; i < n; i++) { const p = i * rate / OUT_RATE, k = Math.floor(p), f = p - k; y[i] = (seg[k] || 0) * (1 - f) + (seg[k + 1] || 0) * f; }
  let peak = 0; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(y[i]));
  const gain = Math.min(12, 0.85 / (peak || 1));
  const fi = Math.round(OUT_RATE * 0.008), fo = Math.round(OUT_RATE * 0.04);
  for (let i = 0; i < n; i++) { let g = gain; if (i < fi) g *= i / fi; if (i > n - fo) g *= (n - i) / fo; y[i] *= g; }
  return y;
}
function encodeWav(samples, rate) {
  const buf = new ArrayBuffer(44 + samples.length * 2), v = new DataView(buf);
  const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + samples.length * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  return buf;
}
function saveClip(key, wav, playBack) {
  MY.local[key] = wav; forgetDecoded([key]);
  idbDo('readwrite', st => st.put(wav, key)).then(() => {
    recMsg(playBack ? 'Saved. Listen back, then tap Next or record again.' : 'Saved.');
  }).catch(() => recMsg("Saved for now, but this browser can't keep recordings after it closes. Export a voice pack to keep them."));
  studioRefresh();
  if (playBack) setTimeout(() => talk([key], { show: false }), 150);
}
function nextClip() {
  const list = clipList().filter(c => c.tab === ST.tab), i = list.findIndex(c => ST.cur && c.key === ST.cur.key);
  const rest = [...list.slice(i + 1), ...list.slice(0, i + 1)];
  selectClip(rest.find(c => !clipState(c.key)) || list[(i + 1) % list.length]);
}
async function uploadClip(file) {
  if (!file || !ST.cur) return;
  audioInit();
  try {
    const audio = await new Promise((res, rej) => { file.arrayBuffer().then(b => AC.decodeAudioData(b, res, rej)).catch(rej); });
    const ch = audio.getChannelData(0), clean = cleanClip(ch, audio.sampleRate);
    if (!clean) { recMsg('That file seems to be silent. Try another recording.'); return; }
    saveClip(ST.cur.key, encodeWav(clean, OUT_RATE), true);
  } catch (e) { recMsg("Couldn't read that file. Try an MP3, M4A or WAV recording."); }
}

// ---------------------------------------------------------------- voice pack export / import
function bufToB64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
async function exportPack() {
  const clips = {};
  Object.entries(MY.pack).forEach(([k, b]) => { clips[k] = bufToB64(b); });
  Object.entries(MY.local).forEach(([k, b]) => { clips[k] = bufToB64(b); });
  const n = Object.keys(clips).length;
  if (!n) { $('packMsg').textContent = 'Record something first.'; return; }
  const blob = new Blob([JSON.stringify({ format: 'bobs-outpost-voice', version: 1, created: new Date().toISOString(), clips })], { type: 'application/json' });
  if (ST.saver) {
    try { await ST.saver.save({ filename: 'my-voice.json', data: blob }); $('packMsg').textContent = `Saved my-voice.json with ${n} recordings.`; }
    catch (e) { $('packMsg').textContent = e && e.code === 'declined' ? 'Not saved.' : "Couldn't save the file here."; }
    return;
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-voice.json';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  $('packMsg').textContent = `Downloaded my-voice.json with ${n} recordings.`;
}
async function importPack(file) {
  if (!file) return;
  try {
    const j = JSON.parse(await file.text());
    if (!j || !j.clips) throw new Error('not a voice pack');
    const keys = Object.keys(j.clips);
    for (const k of keys) { const b = b64ToBuf(j.clips[k]); MY.local[k] = b; try { await idbDo('readwrite', st => st.put(b, k)); } catch (e) { /* kept in memory */ } }
    forgetDecoded(keys); studioRefresh();
    $('packMsg').textContent = `Imported ${keys.length} recordings.`;
  } catch (e) { $('packMsg').textContent = "That file isn't a Bob's Outpost voice pack."; }
}
function clearAll() {
  if (Date.now() - ST.clearArmed > 4000) { ST.clearArmed = Date.now(); $('clearBtn').textContent = 'Tap again to delete them all'; setTimeout(() => { $('clearBtn').textContent = 'Delete all my recordings'; }, 4000); return; }
  const keys = Object.keys(MY.local);
  keys.forEach(k => delete MY.local[k]); forgetDecoded(keys);
  idbDo('readwrite', st => st.clear()).catch(() => {});
  ST.clearArmed = 0; $('clearBtn').textContent = 'Delete all my recordings';
  $('packMsg').textContent = 'Deleted your recordings on this device.'; studioRefresh();
}
function deleteClip() {
  if (!ST.cur || !MY.local[ST.cur.key]) return;
  const k = ST.cur.key; delete MY.local[k]; forgetDecoded([k]);
  idbDo('readwrite', st => st.delete(k)).catch(() => {});
  recMsg('Deleted. Jenny will say this one again.'); studioRefresh();
}

// ---------------------------------------------------------------- wiring
$('openStudio').addEventListener('click', openStudio);
$('testVoice').addEventListener('click', testVoice);
$('studioClose').addEventListener('click', closeStudio);
$('recBtn').addEventListener('click', startRecording);
$('recPlay').addEventListener('click', () => { audioInit(); if (ST.cur) talk([ST.cur.key], { show: false }); });
$('recNext').addEventListener('click', nextClip);
$('recDel').addEventListener('click', deleteClip);
$('uplInput').addEventListener('change', e => { uploadClip(e.target.files[0]); e.target.value = ''; });
$('exportBtn').addEventListener('click', exportPack);
$('importInput').addEventListener('change', e => { importPack(e.target.files[0]); e.target.value = ''; });
$('clearBtn').addEventListener('click', clearAll);
