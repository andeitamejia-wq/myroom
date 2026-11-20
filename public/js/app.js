// app.js - Main Application Coordinator
import { RoomScene } from './scene.js';
import { RoomManager } from './room.js';
import { CatalogManager } from './catalog.js';
import { InteractionManager } from './interaction.js';
import { HistoryManager } from './history.js';
import { HelpManager } from './help.js';
import { ColorPickerModal } from './colorPicker.js';
import { PropertiesManager } from './properties.js';

class App {
  constructor() {
    this.viewportContainer = document.getElementById('viewport-container');
    this.startModal = document.getElementById('start-modal-backdrop');
    this.loadingIndicator = document.getElementById('loading-indicator');
    this.loadingText = document.getElementById('loading-text');

    this.lightsData = null;
    this.examplesData = null;
    this.shellsData = null;
  }

  showLoading(text = 'Cargando...') {
    if (this.loadingText) this.loadingText.textContent = text;
    if (this.loadingIndicator) this.loadingIndicator.classList.remove('hidden');
  }

  hideLoading() {
    if (this.loadingIndicator) this.loadingIndicator.classList.add('hidden');
  }

  async init() {
    this.showLoading('Iniciando MYROOM...');

    // 1. Initialize 3D Viewport Scene
    this.scene = new RoomScene(this.viewportContainer);

    // 2. Initialize Room Manager
    this.room = new RoomManager(this.scene);

    // 3. Initialize Custom HSV Color Picker Modal
    this.colorPicker = new ColorPickerModal();

    // 4. Initialize Catalog Manager
    this.catalog = new CatalogManager(this.room, this.scene, this.colorPicker);
    await this.catalog.loadCatalog();

    // 5. Initialize Properties Box Manager for Locked Objects
    this.properties = new PropertiesManager(this.room, this.catalog);

    // 6. Initialize Interaction & Selection Manager
    this.interaction = new InteractionManager(this.scene, this.room, this.catalog, this.properties);

    // 7. Initialize History (Undo / Redo)
    this.history = new HistoryManager(this.room, this.catalog.catalogMap);

    // 8. Initialize Help Panel
    this.help = new HelpManager();

    // 9. Load Data Configs (lights, examples, shells)
    await this.loadConfigs();

    // 10. Setup UI Topbar Controls & Start Modal
    this.setupStartModal();
    this.setupLightingControls();
    this.setupResetButton();
    this.setupEyeToggle();

    this.hideLoading();
  }

  async loadConfigs() {
    try {
      const [lightsRes, examplesRes, shellsRes] = await Promise.all([
        fetch('/assets/lights.json'),
        fetch('/assets/examples.json'),
        fetch('/assets/shells.json')
      ]);
      this.lightsData = await lightsRes.json();
      this.examplesData = await examplesRes.json();
      this.shellsData = await shellsRes.json();
    } catch (e) {
      console.warn('Error loading configuration files:', e);
    }
  }

  setupLightingControls() {
    const controls = document.getElementById('lighting-controls');
    if (!controls) return;

    controls.addEventListener('click', e => {
      const btn = e.target.closest('button');
      if (!btn) return;

      controls.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const presetName = btn.dataset.light;
      this.scene.applyLightPreset(presetName, this.lightsData);
    });
  }

  setLightButtonActive(presetName) {
    const controls = document.getElementById('lighting-controls');
    if (!controls) return;
    controls.querySelectorAll('button').forEach(b => {
      if (b.dataset.light === presetName) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });
  }

  setupResetButton() {
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (this.startModal) {
          this.startModal.classList.remove('hidden');
        }
      });
    }
  }

  setupEyeToggle() {
    const eyeBtn = document.getElementById('toggle-panels-btn');
    if (eyeBtn) {
      eyeBtn.addEventListener('click', () => {
        document.body.classList.toggle('hide-panels');
      });
    }
  }

  setupStartModal() {
    // 1. Empty room choice cards
    const emptyCards = document.querySelectorAll('#empty-rooms-row .choice-card');
    emptyCards.forEach(card => {
      card.addEventListener('click', async () => {
        const style = card.dataset.style;
        let shellId = 'shell_pastel';
        if (style === 'modern') shellId = 'shell_modern_v2';
        if (style === 'vintage') shellId = 'shell_vintage_v2';

        this.showLoading(`Creando habitación vacía (${style})...`);
        this.startModal.classList.add('hidden');

        await this.room.loadShell(shellId);
        this.room.clearAllItems();
        this.catalog.showListView();

        const defaultLight = style === 'vintage' ? 'warm' : (style === 'modern' ? 'neutral' : 'cool');
        this.scene.applyLightPreset(defaultLight, this.lightsData);
        this.setLightButtonActive(defaultLight);

        this.history.reset(this.room.getState());
        this.hideLoading();
      });
    });

    // 2. Example rooms cards
    const examplesRow = document.getElementById('example-rooms-row');
    if (examplesRow && this.examplesData && this.examplesData.rooms) {
      examplesRow.innerHTML = '';
      this.examplesData.rooms.forEach(ex => {
        const card = document.createElement('div');
        card.className = 'choice-card';

        let icon = '🛋️';
        if (ex.style === 'vintage') icon = '📻';
        if (ex.style === 'modern') icon = '🏢';
        if (ex.style === 'pastel') icon = '🌸';

        card.innerHTML = `
          <div class="choice-icon">${icon}</div>
          <div class="choice-name">${ex.name}</div>
          <div class="choice-desc">${ex.items.length} objetos colocados con luz ${ex.lighting || 'cálida'}.</div>
        `;

        card.addEventListener('click', async () => {
          this.showLoading(`Cargando ${ex.name}...`);
          this.startModal.classList.add('hidden');

          await this.room.loadShell(ex.shell);
          this.room.clearAllItems();
          this.catalog.showListView();

          // Place all items locked
          for (const it of ex.items) {
            const catItem = this.catalog.catalogMap.get(it.id);
            if (catItem) {
              await this.room.addConfirmedItem(
                catItem,
                it.position,
                it.rotationY || 0,
                it.scale || 1,
                it.colors || {},
                it.emissionIntensity || 1.0
              );
            }
          }

          // Apply lighting
          const lightPreset = ex.lighting || 'warm';
          this.scene.applyLightPreset(lightPreset, this.lightsData);
          this.setLightButtonActive(lightPreset);

          this.history.reset(this.room.getState());
          this.hideLoading();
        });

        examplesRow.appendChild(card);
      });
    }
  }
}

// Start application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => console.error('App init error:', err));
});
