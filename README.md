# Bunzai Burger

Responsive React, TypeScript and Vite website. Preserves the existing navy
`#050b2e`, blue `#07144a`, yellow `#ffd21c`, logo and local brand fonts.

## Run

```sh
npm ci
npm run dev
npm run typecheck
npm run build
npm run preview
```

Open the URL printed by Vite. Static hosting publishes **dist/**, not the source
folder. Entries: index.html, bunzai-burger.html, bunzai-menu/menu.html, our-story.html.

## Animation pipeline

User-approved source: `burger herol.mp4`, 1024 × 576, 24 FPS, 121 source frames,
5.04 seconds, H.264 yuv420p, AAC audio. Its studio background is not alpha.
The video is not embedded or autoplayed. Audio is not used.

The opening clips the burger. Native frames 56–120, reversed then forward, form
ONE 129-frame assembled/separated/assembled timeline. Source indices are recorded
in the manifest. Both scroll directions use that same timeline. Maximum separation
holds over 48–64% of the scroll range. No missing rotation is invented.

```sh
python -m pip install pillow numpy opencv-python-headless imageio-ffmpeg
python scripts/prepare-burger-animation.py --input "/path/to/burger herol.mp4"
```

The script validates metadata with FFmpeg, extracts native frames, removes the
neutral backdrop/table, stabilizes scale, and writes transparent WebP, poster,
exploded still and manifest to `public/animations/burger`. Thresholds and the
clean frame range are calibrated to this source; inspect them for other videos.
The original MP4 is not required at runtime.

Desktop frames: 760 × 920; mobile: 456 × 552. Three concurrent decodes, progressive
loading around the current frame, and bounded decoded caches (40 desktop / 24
mobile). One DPR-aware canvas redraws only when needed. Failed frames retry once
and fall back to the nearest loaded frame. Loading pauses outside the region.
Reduced motion uses a static poster.

## Content and limitations

- Menu names, descriptions and prices come from the previous Bunzai menu.
- The burger photo is illustrative; distinct product photos were not supplied.
- Address, hours and ordering details are explicitly pending. No checkout or
  booking backend is connected. Add confirmed business details before launch.
- No full rotation exists in the source. `TurntableViewer.tsx` accepts a future
  ordered 360-degree frame set; the current viewer presents layers.
- Image detail is limited by the supplied video and camera zoom. A higher-resolution
  alpha source would improve food texture and edge fidelity.
- Unused Three.js helper files remain; the previous 3D model was removed.

## Verification

`scripts/verify-browser.cjs` tests real Chrome via Playwright: desktop/tablet/mobile,
forward/reverse frames, hold, overflow, menu selection, layer controls, reduced
motion, routes and browser errors. `PREVIEW_URL` selects a production preview.
The script resolves Playwright from this workstation's bundled runtime; update
that require path for another machine.

Build commands do not push to GitHub or deploy publicly.
