"""Adds or re-records individual lines in voice/jenny.json (keeps all other clips), then checks every new
clip with speech recognition (faster-whisper) so unclear ones can be reworded. Edit NEW below."""
import base64, json, subprocess
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

import os
HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, 'models') + os.sep           # put en_GB-jenny_dioco-medium.onnx(.json) here as jenny.onnx(.json)
VOICE_JSON = os.path.join(HERE, '..', '..', 'voice', 'jenny.json')
v = PiperVoice.load(D + 'jenny.onnx')
SR = v.config.sample_rate

NEW = {
    'go_1': ("Let's find the pieces for the hilltop hut!", 1.08),
    'nib_henry': ('Oh no, Nibblers! Do a big trump, to blow them away!', 1.08),
    'done': ("Hooray! It's finished! Brilliant building!", 1.08),
    'pc_walls': ('the big walls!', 1.2),
    'pc_doorwin': ('the door and the windows!', 1.08),
    'pc_hut': ('the little house!', 1.08),
    'pc_door': ('the front door!', 1.08),
    'pc_gate': ('the castle gate!', 1.08),
    'pc_towers': ('the two towers!', 1.08),
}

def trim(a, thr=0.004):
    idx = np.where(np.abs(a) > thr)[0]
    return a if len(idx) == 0 else a[max(0, idx[0] - int(0.04 * SR)): idx[-1] + int(0.12 * SR)]

def fade(a, i=10, o=60):
    a = a.copy(); ni, no = int(SR * i / 1000), int(SR * o / 1000)
    if len(a) > ni + no:
        a[:ni] *= np.linspace(0, 1, ni); a[-no:] *= np.linspace(1, 0, no)
    return a

def to_mp3(a, peak=0.8):
    a = np.clip(a / (np.abs(a).max() + 1e-6) * peak, -1, 1)
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-af', 'highshelf=f=6500:g=-4,afade=t=in:d=0.005', '-c:a', 'libmp3lame', '-b:a', '48k', '-f', 'mp3', '-'],
                       input=(a * 32767).astype('<i2').tobytes(), capture_output=True, check=True)
    return p.stdout

out = json.load(open(VOICE_JSON))
for k, (t, ls) in NEW.items():
    cfg = SynthesisConfig(length_scale=ls, noise_scale=0.55, noise_w_scale=0.7)
    a = np.concatenate([np.asarray(c.audio_float_array) for c in v.synthesize(t, cfg)])
    out[k] = base64.b64encode(to_mp3(fade(trim(a)))).decode()
json.dump(out, open(VOICE_JSON, 'w'), separators=(',', ':'))
print('total clips', len(out))

from faster_whisper import WhisperModel
m = WhisperModel('small.en', device='cpu', compute_type='int8')
for k in NEW:
    pcm = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', '-', '-f', 's16le', '-ar', '16000', '-ac', '1', '-'],
                         input=base64.b64decode(out[k]), capture_output=True).stdout
    a = np.concatenate([np.zeros(4000, np.float32), np.frombuffer(pcm, '<i2').astype(np.float32) / 32768, np.zeros(4000, np.float32)])
    segs, _ = m.transcribe(a, beam_size=3)
    print(k, '->', ' '.join(s.text.strip() for s in segs))
