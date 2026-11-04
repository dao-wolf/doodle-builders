"""Builds voice/jenny.json: every clip the game speaks, made with the free Piper text-to-speech voice
"Jenny (Dioco)" (British English). It has no letter sounds: text-to-speech cannot say them properly, so they
play only from the player's own recordings.
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

# id: example word
WORDS = {
    's': 'sun', 'a': 'ant', 't': 'tiger', 'p': 'pig', 'i': 'insect', 'n': 'nose', 'm': 'moon', 'd': 'dog',
    'g': 'goat', 'o': 'octopus', 'c': 'cake', 'k': 'kite', 'ck': 'duck', 'e': 'egg', 'u': 'umbrella', 'r': 'rocket',
    'h': 'house', 'b': 'bus', 'f': 'fish', 'l': 'lion', 'ff': 'cliff', 'll': 'bell', 'ss': 'dress', 'j': 'juice',
    'v': 'volcano', 'w': 'web', 'x': 'fox', 'y': 'yellow', 'z': 'zebra', 'zz': 'buzz', 'qu': 'queen', 'ch': 'chick',
    'sh': 'ship', 'th': 'think', 'ng': 'ring', 'nk': 'wink', 'ai': 'rain', 'ee': 'tree', 'igh': 'light', 'oa': 'boat',
    'oo_l': 'boot', 'oo_s': 'book', 'ar': 'car', 'or': 'fork', 'ur': 'turtle', 'ow': 'cow', 'oi': 'coin', 'ear': 'ear',
    'air': 'chair', 'er': 'hammer',
}
NUMS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
PHRASES = {
    'hi': "Hi! I'm Bob. Let's build my outpost together!",
    'like': 'like',
    'yes1': 'Yes!', 'yes2': 'Brilliant!', 'yes3': 'Well done!', 'yes4': 'Super!',
    'thats': "That's",
    'count': "Let's count!",
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

out, info = {}, {}
for gid, word in WORDS.items():
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
