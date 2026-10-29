"""Builds voice/jenny.json: every clip the game speaks, made with the free Piper text-to-speech voice
"Jenny (Dioco)" (British English). Pure phonics sounds are shaped by hand (hissed sounds are filtered noise,
hummed sounds are stretched, bouncy sounds are cut short) because text-to-speech cannot say them well.
Run add_lines.py afterwards for the lines added later (Mr Henry, levels, Nibblers). See tools/voice/README.md."""
import base64, io, json, subprocess, wave, sys
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

import os
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, 'models') + os.sep           # put en_GB-jenny_dioco-medium.onnx(.json) here as jenny.onnx(.json)
VOICE_JSON = os.path.join(HERE, '..', '..', 'voice', 'jenny.json')
v = PiperVoice.load(D + 'jenny.onnx')
SR = v.config.sample_rate

# id: (pure-sound phonemes, trim seconds or None, word)
G = {
    's': (['s', 'ː', 'ː', 'ː'], None, 'sun'), 'a': (['ˈ', 'æ', 'ː'], None, 'ant'), 't': (['t', 'ʰ', 'h'], 0.2, 'tiger'),
    'p': (['p', 'ʰ', 'h'], 0.2, 'pig'), 'i': (['ˈ', 'ɪ', 'ː'], None, 'insect'), 'n': (['n', 'ː', 'ː', 'ː'], None, 'nose'),
    'm': (['m', 'ː', 'ː', 'ː'], None, 'moon'), 'd': (['d', 'ə'], 0.15, 'dog'), 'g': (['ɡ', 'ə'], 0.15, 'goat'),
    'o': (['ˈ', 'ɒ', 'ː'], None, 'octopus'), 'c': (['k', 'ʰ', 'h'], 0.2, 'cake'), 'k': (['k', 'ʰ', 'h'], 0.2, 'kite'),
    'ck': (['k', 'ʰ', 'h'], 0.2, 'duck'), 'e': (['ˈ', 'ɛ', 'ː'], None, 'egg'), 'u': (['ˈ', 'ʌ', 'ː'], None, 'umbrella'),
    'r': (['ɹ', 'ː', 'ː', 'ː'], None, 'rocket'), 'h': (['h', 'ʰ', 'h'], 0.2, 'house'), 'b': (['b', 'ə'], 0.15, 'bus'),
    'f': (['f', 'ː', 'ː', 'ː'], None, 'fish'), 'l': (['l', 'ː', 'ː', 'ː'], None, 'lion'),
    'ff': (['f', 'ː', 'ː', 'ː'], None, 'cliff'), 'll': (['l', 'ː', 'ː', 'ː'], None, 'bell'), 'ss': (['s', 'ː', 'ː', 'ː'], None, 'dress'),
    'j': (['d', 'ʒ', 'ə'], 0.2, 'juice'), 'v': (['v', 'ː', 'ː', 'ː'], None, 'volcano'), 'w': (['w', 'ə'], 0.17, 'web'),
    'x': (['k', 's', 'ː'], None, 'fox'), 'y': (['j', 'ə'], 0.16, 'yellow'), 'z': (['z', 'ː', 'ː', 'ː'], None, 'zebra'),
    'zz': (['z', 'ː', 'ː', 'ː'], None, 'buzz'), 'qu': (['k', 'w', 'ə'], 0.22, 'queen'), 'ch': (['t', 'ʃ'], None, 'chick'),
    'sh': (['ʃ', 'ː', 'ː', 'ː'], None, 'ship'), 'th': (['θ', 'ː', 'ː'], None, 'think'), 'ng': (['ŋ', 'ː', 'ː'], None, 'ring'),
    'nk': (['ŋ', 'k'], None, 'wink'),
    'ai': (['ˈ', 'e', 'ɪ'], None, 'rain'), 'ee': (['ˈ', 'i', 'ː'], None, 'tree'), 'igh': (['ˈ', 'a', 'ɪ'], None, 'light'),
    'oa': (['ˈ', 'ə', 'ʊ'], None, 'boat'), 'oo_l': (['ˈ', 'u', 'ː'], None, 'boot'), 'oo_s': (['ˈ', 'ʊ', 'ː'], None, 'book'),
    'ar': (['ˈ', 'ɑ', 'ː'], None, 'car'), 'or': (['ˈ', 'ɔ', 'ː'], None, 'fork'), 'ur': (['ˈ', 'ɜ', 'ː'], None, 'turtle'),
    'ow': (['ˈ', 'a', 'ʊ'], None, 'cow'), 'oi': (['ˈ', 'ɔ', 'ɪ'], None, 'coin'), 'ear': (['ˈ', 'ɪ', 'ə'], None, 'ear'),
    'air': (['ˈ', 'e', 'ə'], None, 'chair'), 'er': (['ə', 'ː'], None, 'hammer'),
}
NUMS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
PHRASES = {
    'hi': "Hi! I'm Bob. Let's build my outpost together!",
    'find': 'Can you find this one?',
    'which': 'Which one says',
    'like': 'like',
    'yes1': 'Yes!', 'yes2': 'Brilliant!', 'yes3': 'Well done!', 'yes4': 'Super!',
    'thatone': 'That one says',
    'letsfind': "Let's find",
    'numfind': 'Find the number',
    'thats': "That's",
    'canyou': 'Can you find',
    'count': "Let's count!",
    'collect': 'Collect',
    'gems': 'gems!',
    'gemsdone': 'gems! Brilliant counting!',
    'defend': 'Oh no! The Nibblers want to nibble the outpost! Press the big sneeze button, to blow them away!',
    'safe': 'Hooray! The outpost is safe!',
    'p1': 'The floor is down!', 'p2': 'Up go the walls!', 'p3': 'Now a door and some windows!', 'p4': 'A big red roof!',
    'p5': 'Up goes the tower!', 'p6': "Here is Bob's flag!", 'p7': 'Twinkly lights!', 'p8': "Hooray! The outpost is finished! Brilliant building!",
    'again': "Let's build again!",
    'place': 'Now tap the glowing shape, to build!',
    'wrong': 'Oops! Try another one.',
}
for i, w in enumerate(NUMS):
    PHRASES[f'n{i + 1}'] = w + '!'

def trim(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0:
        return a
    return a[max(0, idx[0] - int(0.04 * SR)): idx[-1] + int(0.12 * SR)]

def fade(a, ms_in=8, ms_out=40):
    a = a.copy()
    ni, no = int(SR * ms_in / 1000), int(SR * ms_out / 1000)
    if len(a) > ni + no:
        a[:ni] *= np.linspace(0, 1, ni)
        a[-no:] *= np.linspace(1, 0, no)
    return a

def to_mp3(a, peak=0.8):
    a = np.clip(a / (np.abs(a).max() + 1e-6) * peak, -1, 1)
    pcm = (a * 32767).astype('<i2').tobytes()
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-af', 'highshelf=f=6500:g=-4,afade=t=in:d=0.005', '-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', '-'],
                       input=pcm, capture_output=True, check=True)
    return p.stdout

def say_text(t, ls=1.08):
    cfg = SynthesisConfig(length_scale=ls, noise_scale=0.55, noise_w_scale=0.7)
    chunks = [np.asarray(c.audio_float_array) for c in v.synthesize(t, cfg)]
    return np.concatenate(chunks)

def say_ph(ph, ls=1.6):
    cfg = SynthesisConfig(length_scale=ls, noise_scale=0.5, noise_w_scale=0.6)
    return np.asarray(v.phoneme_ids_to_audio(v.phonemes_to_ids(ph), cfg), dtype=np.float32)

out, info = {}, {}
from scipy.signal import butter, sosfilt
KIND = {}
for g in 's ss sh f ff th h'.split(): KIND[g] = 'fric'
for g in 'm n l ll r ng'.split(): KIND[g] = 'hum'
for g in 'z zz v'.split(): KIND[g] = 'vfric'
for g in 't p c k ck x ch'.split(): KIND[g] = 'ustop'
for g in 'b d g j w y qu'.split(): KIND[g] = 'vstop'
FRIC = {'s': (4200, 9800, 0.62, 0.32), 'ss': (4200, 9800, 0.62, 0.32), 'sh': (1700, 5200, 0.62, 0.4),
        'f': (1300, 9000, 0.55, 0.24), 'ff': (1300, 9000, 0.55, 0.24), 'th': (900, 7000, 0.5, 0.22), 'h': (400, 3200, 0.32, 0.22)}
rng = np.random.default_rng(4)
def fricative(g):
    lo, hi, dur, pk = FRIC[g]
    n = int(dur * SR)
    x = sosfilt(butter(4, [lo, hi], btype='band', fs=SR, output='sos'), rng.normal(0, 1, n))
    env = np.minimum(1, np.minimum(np.arange(n) / (0.07 * SR), (n - np.arange(n)) / (0.12 * SR)))
    return (x * env).astype(np.float32), pk
def frames(a, n=220):
    out = []
    for i in range(0, len(a) - n, n):
        f = np.abs(np.fft.rfft(a[i:i + n] * np.hanning(n))) ** 2
        fr = np.fft.rfftfreq(n, 1 / SR)
        tot = f.sum() + 1e-12
        out.append((np.sqrt(tot), f[(fr > 80) & (fr < 900)].sum() / tot))
    return out, n
def voicing_onset(a, after=0):
    fr, n = frames(a)
    mx = max(e for e, _ in fr) or 1
    for i, (e, r) in enumerate(fr):
        if i * n >= after and r > 0.6 and e > 0.25 * mx:
            return i * n
    return len(a)
def stretch(a, f):
    pcm = (np.clip(a, -1, 1) * 32767).astype('<i2').tobytes()
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', f'atempo={f}', '-f', 's16le', '-'], input=pcm, capture_output=True, check=True)
    return np.frombuffer(p.stdout, '<i2').astype(np.float32) / 32768
for gid, (ph, cut, word) in G.items():
    kind = KIND.get(gid, 'vowel')
    peak = 0.8
    if kind == 'fric':
        a, peak = fricative(gid)
    else:
        a = trim(say_ph(ph, 1.5 if cut else 2.5))
        if kind == 'ustop':
            a = a[:max(int(0.06 * SR), voicing_onset(a))]
            a = fade(a, 3, 30)
            peak = 0.6
        elif kind == 'vstop':
            on = voicing_onset(a)
            a = fade(a[:min(len(a), on + int(0.07 * SR))], 3, 45)
        elif kind == 'vfric':
            on = voicing_onset(a, int(0.05 * SR))
            a = a[:max(int(0.12 * SR), on)]
            a = fade(stretch(a, 0.55), 10, 90)
            peak = 0.6
        elif kind == 'hum':
            fr, n = frames(a)
            start = next((i for i, (e, r) in enumerate(fr) if r > 0.95), 0)
            end = next((i for i in range(start + 6, len(fr)) if fr[i][1] < 0.95), len(fr))
            a = a[start * n:end * n]
            a = fade(stretch(a, 0.6), 15, 100)
        else:
            a = fade(a, 10, 80)
    out['s_' + gid] = base64.b64encode(to_mp3(a, peak)).decode()
    info['s_' + gid] = round(len(a) / SR, 2)
    w = fade(trim(say_text('like ' + word + '!', 1.1)), 10, 60)
    out['w_' + gid] = base64.b64encode(to_mp3(w)).decode()
    info['w_' + gid] = round(len(w) / SR, 2)
for k, t in PHRASES.items():
    a = fade(trim(say_text(t)))
    out[k] = base64.b64encode(to_mp3(a)).decode()
    info[k] = round(len(a) / SR, 2)
json.dump(out, open(VOICE_JSON, 'w'), separators=(',', ':'))
print('clips', len(out), 'json KB', len(json.dumps(out)) // 1024)
print({k: info[k] for k in list(info)[:20]})
short = {k: d for k, d in info.items() if d < 0.08}
print('suspiciously short', short)
