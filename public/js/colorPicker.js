// colorPicker.js - Custom Pure JS HSV Color Picker & Palette Manager
export class ColorPickerModal {
  constructor() {
    this.h = 0;   // 0 - 360
    this.s = 1;   // 0 - 1
    this.v = 1;   // 0 - 1
    this.intensity = 1.0;
    this.hasEmission = false;
    this.activeCallback = null;

    this.presetPalette = [
      '#FFFFFF', '#D9D9D9', '#222222', '#E53935', '#FF6B6B', '#FF9800',
      '#FBC02D', '#7CB342', '#2E7D32', '#00897B', '#29B6F6', '#1E3A8A',
      '#9C27B0', '#EC407A', '#FFFDD0', '#F5F5DC', '#5D4037'
    ];

    this.recentColors = this.loadRecentColors();
    this.createDom();
    this.bindEvents();
  }

  loadRecentColors() {
    try {
      const saved = localStorage.getItem('myroom_recent_colors');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveRecentColor(hex) {
    hex = hex.toUpperCase();
    this.recentColors = [hex, ...this.recentColors.filter(c => c !== hex)].slice(0, 6);
    try {
      localStorage.setItem('myroom_recent_colors', JSON.stringify(this.recentColors));
    } catch {}
  }

  createDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'color-picker-overlay hidden';
    this.overlay.innerHTML = `
      <div class="color-picker-card">
        <div class="color-picker-header">
          <span>🎨 Selector de Color</span>
          <button class="btn-picker-close" id="picker-close-btn">&times;</button>
        </div>

        <!-- Saturation/Brightness 2D Box -->
        <div class="sv-box" id="picker-sv-box">
          <div class="sv-white"></div>
          <div class="sv-black"></div>
          <div class="sv-cursor" id="picker-sv-cursor"></div>
        </div>

        <!-- Hue Slider -->
        <div class="hue-slider-track" id="picker-hue-track">
          <div class="hue-thumb" id="picker-hue-thumb"></div>
        </div>

        <!-- Preview & Hex Input -->
        <div class="color-preview-row">
          <div class="color-preview-circle" id="picker-preview-circle"></div>
          <div class="hex-input-wrap">
            <span class="hex-prefix">#</span>
            <input type="text" id="picker-hex-input" maxlength="7" spellcheck="false" value="FF0000">
          </div>
        </div>

        <!-- Brightness & Saturation Sliders -->
        <div class="picker-sliders">
          <div class="slider-row">
            <span class="slider-label">Brillo</span>
            <input type="range" id="picker-bright-slider" min="0" max="100" value="100">
            <span class="slider-val" id="picker-bright-val">100%</span>
          </div>
          <div class="slider-row">
            <span class="slider-label">Saturación</span>
            <input type="range" id="picker-sat-slider" min="0" max="100" value="100">
            <span class="slider-val" id="picker-sat-val">100%</span>
          </div>
          <div class="slider-row hidden" id="picker-emission-row">
            <span class="slider-label">Luz (Glow)</span>
            <input type="range" id="picker-emission-slider" min="0" max="50" value="10">
            <span class="slider-val" id="picker-emission-val">1.0</span>
          </div>
        </div>

        <button class="btn-picker-confirm" id="picker-done-btn">Listo ✓</button>
      </div>
    `;
    document.body.appendChild(this.overlay);

    // Cache elements
    this.svBox = this.overlay.querySelector('#picker-sv-box');
    this.svCursor = this.overlay.querySelector('#picker-sv-cursor');
    this.hueTrack = this.overlay.querySelector('#picker-hue-track');
    this.hueThumb = this.overlay.querySelector('#picker-hue-thumb');
    this.previewCircle = this.overlay.querySelector('#picker-preview-circle');
    this.hexInput = this.overlay.querySelector('#picker-hex-input');
    this.brightSlider = this.overlay.querySelector('#picker-bright-slider');
    this.brightVal = this.overlay.querySelector('#picker-bright-val');
    this.satSlider = this.overlay.querySelector('#picker-sat-slider');
    this.satVal = this.overlay.querySelector('#picker-sat-val');
    this.emissionRow = this.overlay.querySelector('#picker-emission-row');
    this.emissionSlider = this.overlay.querySelector('#picker-emission-slider');
    this.emissionVal = this.overlay.querySelector('#picker-emission-val');
  }

  bindEvents() {
    this.overlay.querySelector('#picker-close-btn').addEventListener('click', () => this.close());
    this.overlay.querySelector('#picker-done-btn').addEventListener('click', () => this.confirm());

    // Click outside card
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });

    // SV Box dragging
    let isDraggingSV = false;
    const handleSVMouse = e => {
      const rect = this.svBox.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left));
      const y = Math.max(0, Math.min(rect.height, (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top));
      this.s = x / rect.width;
      this.v = 1 - (y / rect.height);
      this.updateFromHsv();
    };

    this.svBox.addEventListener('pointerdown', e => {
      isDraggingSV = true;
      handleSVMouse(e);
      window.addEventListener('pointermove', handleSVMouse);
      const onUp = () => {
        isDraggingSV = false;
        window.removeEventListener('pointermove', handleSVMouse);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointerup', onUp);
    });

    // Hue Slider dragging
    const handleHue = e => {
      const rect = this.hueTrack.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left));
      this.h = (x / rect.width) * 360;
      this.updateFromHsv();
    };

    this.hueTrack.addEventListener('pointerdown', e => {
      handleHue(e);
      const onMove = e => handleHue(e);
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    // Hex input
    this.hexInput.addEventListener('input', e => {
      let val = e.target.value.replace(/[^0-9A-Fa-f]/g, '');
      if (val.length === 6) {
        const hsv = this.hexToHsv('#' + val);
        if (hsv) {
          this.h = hsv.h;
          this.s = hsv.s;
          this.v = hsv.v;
          this.updateFromHsv(false);
        }
      }
    });

    // Sliders
    this.brightSlider.addEventListener('input', e => {
      this.v = parseInt(e.target.value, 10) / 100;
      this.updateFromHsv();
    });

    this.satSlider.addEventListener('input', e => {
      this.s = parseInt(e.target.value, 10) / 100;
      this.updateFromHsv();
    });

    this.emissionSlider.addEventListener('input', e => {
      this.intensity = parseInt(e.target.value, 10) / 10;
      this.emissionVal.textContent = this.intensity.toFixed(1);
      this.notifyChange();
    });
  }

  open(initialHex = '#FFB79D', hasEmission = false, initialIntensity = 1.0, callback) {
    this.activeCallback = callback;
    this.hasEmission = hasEmission;
    this.intensity = initialIntensity;

    if (hasEmission) {
      this.emissionRow.classList.remove('hidden');
      this.emissionSlider.value = Math.round(initialIntensity * 10);
      this.emissionVal.textContent = initialIntensity.toFixed(1);
    } else {
      this.emissionRow.classList.add('hidden');
    }

    const hsv = this.hexToHsv(initialHex) || { h: 16, s: 0.38, v: 1.0 };
    this.h = hsv.h;
    this.s = hsv.s;
    this.v = hsv.v;

    this.updateFromHsv();
    this.overlay.classList.remove('hidden');
  }

  close() {
    this.overlay.classList.add('hidden');
    this.activeCallback = null;
  }

  confirm() {
    const hex = this.hsvToHex(this.h, this.s, this.v);
    this.saveRecentColor(hex);
    this.notifyChange(true);
    this.close();
  }

  notifyChange(isFinal = false) {
    const hex = this.hsvToHex(this.h, this.s, this.v);
    if (this.activeCallback) {
      this.activeCallback(hex, this.intensity, isFinal);
    }
  }

  updateFromHsv(updateHexField = true) {
    const hex = this.hsvToHex(this.h, this.s, this.v);
    const pureHueHex = this.hsvToHex(this.h, 1, 1);

    // Update SV Box background to current Hue
    this.svBox.style.backgroundColor = pureHueHex;

    // Position SV Cursor
    const cursorX = this.s * 100;
    const cursorY = (1 - this.v) * 100;
    this.svCursor.style.left = `${cursorX}%`;
    this.svCursor.style.top = `${cursorY}%`;

    // Position Hue Thumb
    const huePercent = (this.h / 360) * 100;
    this.hueThumb.style.left = `${huePercent}%`;

    // Preview Circle
    this.previewCircle.style.backgroundColor = hex;

    // Sliders
    const brightPct = Math.round(this.v * 100);
    this.brightSlider.value = brightPct;
    this.brightVal.textContent = `${brightPct}%`;

    const satPct = Math.round(this.s * 100);
    this.satSlider.value = satPct;
    this.satVal.textContent = `${satPct}%`;

    if (updateHexField) {
      this.hexInput.value = hex.replace('#', '').toUpperCase();
    }

    this.notifyChange(false);
  }

  // Color math conversions
  hsvToRgb(h, s, v) {
    let r, g, b;
    const i = Math.floor(h / 60) % 6;
    const f = (h / 60) - Math.floor(h / 60);
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  hsvToHex(h, s, v) {
    const [r, g, b] = this.hsvToRgb(h, s, v);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  hexToHsv(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length !== 6) return null;
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta > 0) {
      if (max === r) h = 60 * (((g - b) / delta) % 6);
      else if (max === g) h = 60 * (((b - r) / delta) + 2);
      else h = 60 * (((r - g) / delta) + 4);
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : delta / max;
    const v = max;
    return { h, s, v };
  }
}
