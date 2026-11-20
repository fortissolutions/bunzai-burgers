/**
 * Bunzai Burger - Craft Section Scroll Animation
 * Splits the layered Double Smash inside #craft as the section scrolls past:
 * the burger holds assembled, its .burger-layer images split apart, then rejoin,
 * while the six .anatomy-card callouts fade in with the split.
 *
 * Each layer reads data-spread (vertical offset at the peak, as a fraction of the
 * layer's height) and data-tilt (degrees of rotation at the peak).
 * The layer images are cut from assets/menu/double-smash.webp by split-burger-layers.py.
 */

const HOLD = 0.18;        // desktop holds the assembled burger for the first 18% of the scroll
const STACK_TILT = -4;    // degrees the whole stack leans at the peak

class CraftBurgerAnimation {
  constructor(section, stack) {
    this.section = section;
    this.sticky = section.querySelector('.craft-sticky');
    this.stack = stack;
    this.layers = Array.from(stack.querySelectorAll('.burger-layer')).map((el) => ({
      el,
      spread: parseFloat(el.dataset.spread) || 0,
      tilt: parseFloat(el.dataset.tilt) || 0,
    }));
    this.shadow = stack.querySelector('.burger-shadow');
    this.baseLayer = this.layers.reduce((a, b) => (b.spread > a.spread ? b : a), this.layers[0]);
    this.layerCards = Array.from(section.querySelectorAll('.anatomy-card'));
    this.rafId = null;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Current interpolation state
    this.currentFactor = 0;
    this.lastDrawnKey = '';

    this.section.dataset.anim = 'on';
    this.updateLayerCards(0);
    this.bindEvents();
  }

  scheduleUpdate() {
    if (this.rafId || document.hidden) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.update();
    });
  }

  bindEvents() {
    const schedule = () => this.scheduleUpdate();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    this.reducedMotion.addEventListener('change', schedule);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(this.rafId); this.rafId = null; }
      else schedule();
    });
    new ResizeObserver(() => {
      this.lastDrawnKey = '';
      schedule();
    }).observe(this.stack);
    schedule();
  }

  getProgress() {
    const rect = this.section.getBoundingClientRect();
    const stickyTop = parseFloat(getComputedStyle(this.sticky).top) || 0;
    const track = rect.height - this.sticky.offsetHeight;
    if (track <= 0) return 0;
    return Math.max(0, Math.min(1, (stickyTop - rect.top) / track));
  }

  update() {
    const winH = window.innerHeight;
    const rect = this.section.getBoundingClientRect();
    // Only work while the section is on or near the screen.
    if (rect.bottom < -winH || rect.top > winH * 2) return;

    let targetFactor;
    if (this.reducedMotion.matches) {
      // Show the split burger statically.
      targetFactor = 1;
      this.currentFactor = 1;
    } else {
      const progress = this.getProgress();
      const animationProgress = window.innerWidth > 768 ? Math.max(0, (progress - HOLD) / (1 - HOLD)) : progress;
      targetFactor = Math.sin(animationProgress * Math.PI);
    }
    this.updateLayerCards(targetFactor);

    // Smooth interpolation (LERP) for liquid responsiveness
    this.currentFactor += (targetFactor - this.currentFactor) * 0.25;
    this.renderLayers();

    if (Math.abs(this.currentFactor - targetFactor) > 0.001) this.scheduleUpdate();
  }

  updateLayerCards(explodeFactor) {
    this.layerCards.forEach((card) => {
      if (explodeFactor > 0.15) {
        const shiftY = (1 - explodeFactor) * 20;
        card.style.opacity = Math.min(1, (explodeFactor - 0.15) * 2.5);
        card.style.transform = `translateY(${shiftY}px) scale(${0.95 + explodeFactor * 0.05})`;
        card.removeAttribute('aria-hidden');
        card.removeAttribute('tabindex');
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px) scale(0.9)';
        card.setAttribute('aria-hidden', 'true');
        card.setAttribute('tabindex', '-1');
      }
    });
  }

  renderLayers() {
    const factor = this.currentFactor;
    const layerH = this.layers[0].el.offsetHeight;
    if (!layerH) return;

    // Skip style writes when nothing visible changed.
    const key = `${factor.toFixed(4)}|${layerH}`;
    if (key === this.lastDrawnKey) return;
    this.lastDrawnKey = key;

    // Ease-out so the layers pop apart quickly and settle gently.
    const split = 1 - Math.pow(1 - factor, 2);
    this.stack.style.transform = `rotate(${STACK_TILT * split}deg)`;

    // Layers only cast shadows on each other once they have separated.
    const shadowAlpha = (0.45 * split).toFixed(2);
    const filter = split > 0.01 ? `drop-shadow(0 18px 22px rgba(0, 0, 0, ${shadowAlpha}))` : 'none';
    this.layers.forEach(({ el, spread, tilt }) => {
      el.style.transform = `translateY(${(spread * split * layerH).toFixed(2)}px) rotate(${(tilt * split).toFixed(3)}deg)`;
      el.style.filter = filter;
    });

    if (this.shadow) {
      // The ground shadow follows the bottom bun and spreads out as the stack opens.
      const baseY = this.baseLayer.spread * split * layerH;
      this.shadow.style.transform = `translateY(${baseY.toFixed(2)}px) scaleX(${1 + 0.15 * split})`;
      this.shadow.style.opacity = String(1 - 0.35 * split);
    }
  }
}

function start() {
  const section = document.getElementById('craft');
  const stack = document.getElementById('anatomyBurgerStack');
  if (section && stack) new CraftBurgerAnimation(section, stack);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
