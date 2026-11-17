/**
 * Interactive signal waveform and career chapter controller for petarpetrov.org.
 */

/**
 * Signal waveform parameters for each of the four career chapters.
 * @type {Array<{signalText: string, freq: number, amp: number}>}
 */
const CHAPTER_SIGNALS = [
  {
    signalText: "BIOSENSOR SIGNAL // SAVA.HEALTH WEARABLE TELEMETRY (2023-PRESENT)",
    freq: 0.028,
    amp: 16
  },
  {
    signalText: "VENTURE SIGNAL // PRODUCT & MEDTECH SYSTEMS (2013-2026)",
    freq: 0.042,
    amp: 14
  },
  {
    signalText: "RESEARCH SIGNAL // DIGITAL PRESERVATION & FORMAT LONGEVITY (2009-2013)",
    freq: 0.018,
    amp: 12
  },
  {
    signalText: "FOUNDATION SIGNAL // DISTRIBUTED SYSTEMS & COMPUTER SCIENCE (2005-2012)",
    freq: 0.012,
    amp: 10
  }
];

/**
 * Tracks whether the user has manually overridden the OS color scheme during this session.
 * @type {boolean}
 */
let manualThemeOverride = false;

/**
 * Target and interpolated waveform parameters for smooth chapter transitions.
 * @type {number}
 */
let targetFreq = CHAPTER_SIGNALS[0].freq;
let currentFreq = CHAPTER_SIGNALS[0].freq;
let targetAmp = CHAPTER_SIGNALS[0].amp;
let currentAmp = CHAPTER_SIGNALS[0].amp;

/**
 * Initializes system theme synchronization (`prefers-color-scheme`) and manual toggle binding.
 */
function initThemeController() {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
  if (mediaQuery.matches) {
    document.body.classList.add("light");
  }

  mediaQuery.addEventListener("change", event => {
    if (!manualThemeOverride) {
      document.body.classList.toggle("light", event.matches);
    }
  });

  const toggleButton = document.getElementById("theme-toggle-btn");
  if (toggleButton) {
    toggleButton.addEventListener("click", toggleTheme);
  }
}

/**
 * Toggles between Light Mode (Graphite Ink on Sand) and Dark Mode (Danube Teal).
 */
function toggleTheme() {
  manualThemeOverride = true;
  document.body.classList.toggle("light");
}

/**
 * Activates the selected career chapter tab and panel, updating the signal waveform target.
 *
 * @param {number} chapterIndex - Zero-based index of the chapter to display (0 to 3).
 */
function selectChapter(chapterIndex) {
  const tabs = document.querySelectorAll(".chapter-tab");
  const panels = document.querySelectorAll(".chapter-panel");

  tabs.forEach((tab, idx) => {
    const isSelected = idx === chapterIndex;
    tab.classList.toggle("active", isSelected);
    tab.setAttribute("aria-selected", String(isSelected));
  });

  panels.forEach((panel, idx) => {
    const isSelected = idx === chapterIndex;
    panel.classList.toggle("active", isSelected);
    panel.hidden = !isSelected;
  });

  const config = CHAPTER_SIGNALS[chapterIndex];
  if (config) {
    const labelEl = document.getElementById("signal-label");
    if (labelEl) {
      labelEl.textContent = config.signalText;
    }
    targetFreq = config.freq;
    targetAmp = config.amp;
  }
}

/**
 * Initializes the chapter navigation tabs and binds click listeners.
 */
function initChapterNavigation() {
  const tabs = document.querySelectorAll(".chapter-tab");
  tabs.forEach((tab, idx) => {
    tab.addEventListener("click", () => selectChapter(idx));
  });
}

/**
 * Computes the vertical Y coordinate of the modulated signal waveform at horizontal coordinate `x`.
 *
 * @param {number} x - Horizontal pixel coordinate on the canvas.
 * @param {number} canvasWidth - Total width of the canvas in pixels.
 * @param {number} canvasHeight - Total height of the canvas in pixels.
 * @param {number} freq - Spatial frequency of the carrier wave.
 * @param {number} amp - Base vertical amplitude in pixels.
 * @param {number} phase - Current temporal animation phase in radians.
 * @param {number} hoverStrength - Normalized [0, 1] cursor hover intensity.
 * @param {number} mouseX - Interpolated horizontal cursor coordinate on the canvas.
 * @param {number} harmonicOffset - Phase offset in radians for secondary harmonic traces.
 * @returns {number} Computed vertical Y coordinate in pixels.
 */
function sampleWaveY(
  x,
  canvasWidth,
  canvasHeight,
  freq,
  amp,
  phase,
  hoverStrength,
  mouseX,
  harmonicOffset
) {
  const midY = canvasHeight / 2;
  const envelope = Math.sin((x / canvasWidth) * Math.PI);
  let localBoost = 0;

  if (hoverStrength > 0.01) {
    const distance = Math.abs(x - mouseX);
    const influenceRadius = 150;
    if (distance < influenceRadius) {
      const falloff = Math.cos((distance / influenceRadius) * (Math.PI / 2));
      localBoost = falloff * falloff * hoverStrength;
    }
  }

  const effectiveAmp = amp * (1 + localBoost * 1.15);
  const effectiveFreq = freq * (1 + localBoost * 0.35);

  return (
    midY +
    Math.sin(x * effectiveFreq + phase + harmonicOffset) *
      effectiveAmp *
      envelope *
      Math.cos(x * 0.006 - phase * 0.3)
  );
}

/**
 * Initializes and runs the 60fps interactive canvas signal loop.
 */
function initSignalCanvas() {
  const canvas = document.getElementById("signalCanvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let phase = 0;
  let targetMouseX = -1;
  let smoothMouseX = canvas.width / 2;
  let hoverStrength = 0;
  let isHovering = false;

  canvas.addEventListener("mousemove", event => {
    const rect = canvas.getBoundingClientRect();
    targetMouseX = (event.clientX - rect.left) * (canvas.width / rect.width);
    if (!isHovering) {
      smoothMouseX = targetMouseX;
      isHovering = true;
    }
  });

  canvas.addEventListener("mouseleave", () => {
    isHovering = false;
  });

  /**
   * Renders a single animation frame of the primary wave, secondary harmonic, and hover probe.
   */
  function renderFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentFreq += (targetFreq - currentFreq) * 0.08;
    currentAmp += (targetAmp - currentAmp) * 0.08;
    hoverStrength += ((isHovering ? 1 : 0) - hoverStrength) * 0.12;

    if (isHovering) {
      smoothMouseX += (targetMouseX - smoothMouseX) * 0.18;
    }

    const isLight = document.body.classList.contains("light");
    const strokeColor = isLight ? "#141413" : "#2dd4bf";

    // Secondary harmonic trace
    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.globalAlpha = 0.16 + hoverStrength * 0.22;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      const y2 = sampleWaveY(
        x,
        canvas.width,
        canvas.height,
        currentFreq * 1.25,
        currentAmp * 0.72,
        -phase * 0.8,
        hoverStrength,
        smoothMouseX,
        1.1
      );
      if (x === 0) ctx.moveTo(x, y2);
      else ctx.lineTo(x, y2);
    }
    ctx.stroke();
    ctx.restore();

    // Primary signal trace
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.85;
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x++) {
      const y = sampleWaveY(
        x,
        canvas.width,
        canvas.height,
        currentFreq,
        currentAmp,
        phase,
        hoverStrength,
        smoothMouseX,
        0
      );
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Live cursor probe indicator
    if (hoverStrength > 0.02) {
      const probeY = sampleWaveY(
        smoothMouseX,
        canvas.width,
        canvas.height,
        currentFreq,
        currentAmp,
        phase,
        hoverStrength,
        smoothMouseX,
        0
      );
      ctx.save();
      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = hoverStrength * 0.3;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(smoothMouseX, 4);
      ctx.lineTo(smoothMouseX, canvas.height - 4);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = hoverStrength;
      ctx.beginPath();
      ctx.arc(smoothMouseX, probeY, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    phase += 0.04;
    requestAnimationFrame(renderFrame);
  }

  renderFrame();
}

document.addEventListener("DOMContentLoaded", () => {
  initThemeController();
  initChapterNavigation();
  initSignalCanvas();
});
