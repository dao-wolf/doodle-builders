// Shared canvas setup, constants and small helpers.
'use strict';

const cv = document.getElementById('game');
const mainCtx = cv.getContext('2d');
let ctx = mainCtx;
const $ = id => document.getElementById(id);
const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
let DPR = 1, SC = 1, W = 640, H = 480, GY = 360, OX = 490;
const PSX = 100;          // hero's screen x while travelling and building
const WALK = 115;         // walking speed
const BS = 22;            // outpost block size

function seeded(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = (i, k = 0) => { const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return s - Math.floor(s); };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutBack = t => { t = clamp(t, 0, 1) - 1; return t * t * (2.7 * t + 1.7) + 1; };
const easeInOut = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const rgb = (c, f = 1, a = 1) => `rgba(${Math.min(255, c[0] * f) | 0},${Math.min(255, c[1] * f) | 0},${Math.min(255, c[2] * f) | 0},${a})`;

function tex(w, h, base, cell = 4, vari = 14, seed = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); const r = seeded(seed);
  for (let y = 0; y < h; y += cell) for (let x = 0; x < w; x += cell) {
    const n = (r() * 2 - 1) * vari;
    g.fillStyle = `rgb(${clamp(base[0] + n, 0, 255) | 0},${clamp(base[1] + n, 0, 255) | 0},${clamp(base[2] + n, 0, 255) | 0})`;
    g.fillRect(x, y, cell, cell);
  }
  return c;
}
