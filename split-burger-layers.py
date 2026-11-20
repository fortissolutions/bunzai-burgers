"""Cut the Double Smash menu photo into the four layers used by the Craft section split animation.

Usage (needs opencv-python-headless and numpy):
    python split-burger-layers.py [--preview preview.png]

Reads  assets/menu/double-smash.webp
Writes assets/menu/layers/double-smash-{bun-top,cheese-patty,patty,bun-bottom}.webp

Every layer shares the same canvas (the burger's bounding box), so stacking them
with no offset rebuilds the photo; burger-overlay.js then moves them apart.
"""
import argparse
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent
SRC = ROOT / 'assets' / 'menu' / 'double-smash.webp'
OUT = ROOT / 'assets' / 'menu' / 'layers'
NAMES = ['bun-top', 'cheese-patty', 'patty', 'bun-bottom']
BURGER_RECT = (90, 375, 720, 560)  # x, y, w, h around the burger in the 900x1237 photo
OVERLAP = 8                         # px each upper layer covers the one below, hides seams and edge shading when assembled
PAD = 16


def cutout(img):
    """GrabCut the burger off the backdrop and slate; returns a 0/255 mask."""
    mask = np.zeros(img.shape[:2], np.uint8)
    bg, fg = np.zeros((1, 65)), np.zeros((1, 65))
    cv2.grabCut(img, mask, BURGER_RECT, bg, fg, 8, cv2.GC_INIT_WITH_RECT)
    m = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
    # keep the largest blob and fill its holes
    _, lab, st, _ = cv2.connectedComponentsWithStats(m)
    m = np.where(lab == 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]), 255, 0).astype(np.uint8)
    cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    m = np.zeros_like(m)
    cv2.drawContours(m, cnts, -1, 255, -1)
    return m


def seams(img, m):
    """Three smooth seam curves (y per column): under the top bun, mid patty stack, over the bottom bun."""
    V = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[..., 2].astype(np.float64), (5, 5), 0)
    h, w = m.shape
    cols = np.nonzero(m.any(0))[0]
    x0, x1 = cols[0], cols[-1]
    X = np.arange(x0, x1 + 1)

    # per-column guesses: where the bright bun dome ends, and where the dark patty starts above the base bun
    g1, g3 = [], []
    for x in X:
        ys = np.nonzero(m[:, x])[0]
        top, bot = ys[0], ys[-1]
        y = top + 40
        while y < bot and V[y, x] > 165:
            y += 1
        g1.append(y)
        y = bot
        while y > top and V[y, x] < 150:  # skip the shadowed underside
            y -= 1
        while y > top and not (V[y - 3:y, x] < 95).all():
            y -= 1
        g3.append(y)

    def fit(g, lo, hi, deg=3):
        g = np.asarray(g, float)
        keep = (X >= lo) & (X <= hi)
        for _ in range(6):
            c = np.polyfit(X[keep], g[keep], deg)
            r = np.abs(np.polyval(c, X) - g)
            keep &= r < max(6, np.percentile(r[keep], 70))
        return np.polyval(c, X)

    s1 = fit(g1, 170, 730) + 7
    s3 = fit(g3, 180, 720)
    s2 = s1 + 0.48 * (s3 - s1) + 3 * np.sin(X / 23.0)

    def full(s):
        f = np.empty(w)
        f[:x0], f[x1 + 1:], f[x0:x1 + 1] = s[0], s[-1], s
        return np.floor(f)

    return [np.full(w, -1.0), full(s1), full(s2), full(s3), np.full(w, h + 1.0)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', help='also write an exploded preview PNG here')
    args = ap.parse_args()

    img = cv2.imread(str(SRC))
    m = cutout(img)
    S = seams(img, m)
    h = m.shape[0]
    alpha = cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), 1.0)
    yy = np.arange(h, dtype=np.float32)[:, None]
    ys, xs = np.nonzero(m)
    bx0, by0, bx1, by1 = xs.min() - PAD, ys.min() - PAD, xs.max() + PAD, ys.max() + PAD

    OUT.mkdir(parents=True, exist_ok=True)
    layers = []
    for k, name in enumerate(NAMES):
        a, b = S[k][None, :], S[k + 1][None, :]
        band = ((yy >= a) & (yy < b + (OVERLAP if k < 3 else 0))).astype(np.float32)
        # darken a few px below the top cut so the exposed surface reads as one once the layers split
        d = np.where(k > 0, yy - a, 99)
        shade = 1 - 0.28 * np.clip(1 - d / 7, 0, 1)
        rgba = np.dstack([(img * shade[..., None]).astype(np.uint8), (alpha * band * 255).astype(np.uint8)])
        rgba = rgba[by0:by1 + 1, bx0:bx1 + 1]
        cv2.imwrite(str(OUT / f'double-smash-{name}.webp'), rgba, [cv2.IMWRITE_WEBP_QUALITY, 90])
        layers.append(rgba)
    print('layer canvas', rgba.shape[1], 'x', rgba.shape[0])

    if args.preview:
        H, W = layers[0].shape[:2]
        canvas = np.full((H + 300, W, 3), (23, 11, 5), np.float32)
        for L, off in zip(layers, (-120, -40, 40, 120)):
            a = L[..., 3:].astype(np.float32) / 255
            y = 150 + off
            canvas[y:y + H] = canvas[y:y + H] * (1 - a) + L[..., :3] * a
        cv2.imwrite(args.preview, canvas.astype(np.uint8))


if __name__ == '__main__':
    main()
