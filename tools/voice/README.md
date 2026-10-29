# Voice tools

These scripts made `voice/jenny.json`, the built-in voice. You only need them to change or add lines; to use your own voice, use the in-game Voice studio instead (see the main README).

```bash
pip install -r tools/voice/requirements.txt
mkdir -p tools/voice/models
curl -L -o tools/voice/models/jenny.onnx      https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx
curl -L -o tools/voice/models/jenny.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium.onnx.json
python tools/voice/generate_jenny.py   # sounds, words, numbers and the original lines
python tools/voice/add_lines.py        # later lines; edit NEW in the script to add or re-record lines
```

`add_lines.py` checks each new clip with speech recognition and prints what it heard. Short phrases sometimes come out unclear (for example "the walls" heard as "the wolves"); reword them and run it again. Each clip key must match a key in `TEXT` in `js/content.js`.

Needs `ffmpeg` on your PATH.
