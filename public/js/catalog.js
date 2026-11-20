// catalog.js - Left Column Catalog, Resizable Drawer & Color Editor Integration
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class CatalogManager {
  constructor(roomManager, roomScene, colorPicker) {
    this.roomManager = roomManager;
    this.roomScene = roomScene;
    this.colorPicker = colorPicker;

    this.catalogData = null;
    this.catalogMap = new Map();
    this.thumbnailCache = new Map();

    this.currentCategory = 'furniture'; // Only 2 tabs: 'furniture' and 'decor'
    this.currentStyle = 'all';
    this.savedScrollTop = 0;
    this.isOpen = true;
    this.currentWidth = 300;

    // Elements
    this.drawerEl = document.getElementById('catalog-drawer');
    this.openFab = document.getElementById('catalog-open-fab');
    this.closeBtn = document.getElementById('catalog-close-btn');
    this.resizeHandle = document.getElementById('catalog-resize-handle');
    this.mobileHandle = document.getElementById('catalog-mobile-handle');

    // List view elements
    this.listViewEl = document.getElementById('catalog-list-view');
    this.gridWrapEl = document.querySelector('.catalog-grid-wrap');
    this.gridEl = document.getElementById('catalog-grid');
    this.counterEl = document.getElementById('catalog-counter');
    this.tabsContainer = document.getElementById('category-tabs');
    this.styleBar = document.getElementById('style-filter-bar');

    // Scrollbar tracks & thumbs
    this.styleScrollTrack = document.getElementById('style-scroll-track');
    this.styleScrollThumb = document.getElementById('style-scroll-thumb');
    this.tabsScrollTrack = document.getElementById('tabs-scroll-track');
    this.tabsScrollThumb = document.getElementById('tabs-scroll-thumb');

    // Detail view elements
    this.detailViewEl = document.getElementById('catalog-detail-view');
    this.detailBackBtn = document.getElementById('detail-back-btn');
    this.detailCloseBtn = document.getElementById('detail-close-btn');
    this.detailPreviewImg = document.getElementById('detail-preview-img');
    this.detailTitle = document.getElementById('detail-title');
    this.detailStyleBadge = document.getElementById('detail-style-badge');
    this.detailSizeInfo = document.getElementById('detail-size-info');
    this.detailModeBadge = document.getElementById('detail-mode-badge');
    this.detailColorList = document.getElementById('detail-color-list');

    // Detail tool buttons
    this.detailRotateBtn = document.getElementById('detail-rotate-btn');
    this.detailScaleUpBtn = document.getElementById('detail-scale-up-btn');
    this.detailScaleDownBtn = document.getElementById('detail-scale-down-btn');

    // 3 BIG ACTION BUTTONS
    this.detailConfirmBtn = document.getElementById('detail-confirm-btn');
    this.detailCancelBtn = document.getElementById('detail-cancel-btn');
    this.detailDeleteBtn = document.getElementById('detail-delete-btn');

    // Confirmation dialog
    this.confirmDialog = document.getElementById('confirm-switch-dialog');
    this.dialogConfirmBtn = document.getElementById('dialog-confirm-btn');
    this.dialogDiscardBtn = document.getElementById('dialog-discard-btn');

    // 14 Preset Colors
    this.presetColors = [
      '#FFFFFF', '#D9D9D9', '#2B2B2B', '#E53935', '#FF7043', '#FFB74D',
      '#FDD835', '#7CB342', '#2E7D32', '#00897B', '#29B6F6', '#1E3A8A',
      '#9C27B0', '#EC407A', '#FFFDD0', '#F5EBE1', '#6B4A33'
    ];

    this.initThumbnailRenderer();
    this.setupEventListeners();
    this.setupResizeHandle();
    this.setupMobileHandle();
    this.setupCustomScrollbars();
  }

  initThumbnailRenderer() {
    this.thumbSize = 128;
    this.thumbCanvas = document.createElement('canvas');
    this.thumbCanvas.width = this.thumbSize;
    this.thumbCanvas.height = this.thumbSize;

    this.thumbRenderer = new THREE.WebGLRenderer({
      canvas: this.thumbCanvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    this.thumbRenderer.setSize(this.thumbSize, this.thumbSize);
    this.thumbRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.thumbRenderer.toneMappingExposure = 1.1;

    this.thumbScene = new THREE.Scene();
    this.thumbCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 20);
    this.thumbCamera.position.set(2.2, 1.8, 2.2);
    this.thumbCamera.lookAt(0, 0.2, 0);

    const ambient = new THREE.AmbientLight(0xfff7ed, 1.4);
    this.thumbScene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 1.6);
    dir.position.set(3, 5, 3);
    this.thumbScene.add(dir);

    const dir2 = new THREE.DirectionalLight(0xffe6d5, 0.8);
    dir2.position.set(-3, 2, -2);
    this.thumbScene.add(dir2);

    this.thumbLoader = new GLTFLoader();
  }

  async loadCatalog() {
    try {
      const res = await fetch('/assets/catalog.json');
      this.catalogData = await res.json();

      this.catalogData.items.forEach(item => {
        this.catalogMap.set(item.id, item);
      });

      this.renderGrid();
    } catch (err) {
      console.error('Failed to load catalog.json:', err);
    }
  }

  setupEventListeners() {
    // Open FAB
    if (this.openFab) {
      this.openFab.addEventListener('click', () => this.openCatalog());
    }

    // Close Button (✕)
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeCatalog());
    }

    // Style chips
    if (this.styleBar) {
      this.styleBar.addEventListener('click', e => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        this.styleBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentStyle = chip.dataset.style;
        this.renderGrid();
      });
    }

    // Category tabs: Strictly TWO tabs (furniture & decor)
    if (this.tabsContainer) {
      this.tabsContainer.addEventListener('click', e => {
        const tab = e.target.closest('.tab-btn');
        if (!tab) return;
        this.tabsContainer.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.cat;
        this.renderGrid();
      });
    }

    // Save scroll position
    if (this.gridWrapEl) {
      this.gridWrapEl.addEventListener('scroll', () => {
        this.savedScrollTop = this.gridWrapEl.scrollTop;
      });
    }

    // DETAIL VIEW: 3 BIG ACTION BUTTONS
    // 1. ✓ CONFIRM (Soft Green): locks object, returns to list view
    if (this.detailConfirmBtn) {
      this.detailConfirmBtn.addEventListener('click', () => {
        this.roomManager.confirmPlacing();
        this.showListView();
      });
    }

    // 2. ← VOLVER / CANCEL (Neutral Gray-Blue): cancels placing, returns to list
    const handleCancel = () => {
      this.roomManager.cancelPlacing();
      this.showListView();
    };
    if (this.detailBackBtn) this.detailBackBtn.addEventListener('click', handleCancel);
    if (this.detailCancelBtn) this.detailCancelBtn.addEventListener('click', handleCancel);
    if (this.detailCloseBtn) this.detailCloseBtn.addEventListener('click', handleCancel);

    // 3. 🗑 DELETE (Soft Red): removes object completely
    if (this.detailDeleteBtn) {
      this.detailDeleteBtn.addEventListener('click', () => {
        this.roomManager.deleteActiveItem();
        this.showListView();
      });
    }

    // Detail view tool buttons
    if (this.detailRotateBtn) {
      this.detailRotateBtn.addEventListener('click', () => {
        this.roomManager.rotateActive(45);
      });
    }
    if (this.detailScaleUpBtn) {
      this.detailScaleUpBtn.addEventListener('click', () => {
        this.roomManager.scaleActive(1.1);
      });
    }
    if (this.detailScaleDownBtn) {
      this.detailScaleDownBtn.addEventListener('click', () => {
        this.roomManager.scaleActive(0.9);
      });
    }
  }

  // DESKTOP RESIZABLE BAR (Min 220px, Max 50vw, Default 300px)
  setupResizeHandle() {
    if (!this.resizeHandle) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 300;

    // Restore saved width
    const saved = localStorage.getItem('myroom_catalog_width');
    if (saved) {
      const w = parseInt(saved, 10);
      if (!isNaN(w) && w >= 220) {
        this.currentWidth = Math.min(Math.round(window.innerWidth * 0.5), w);
        this.drawerEl.style.width = `${this.currentWidth}px`;
      }
    }

    this.resizeHandle.addEventListener('pointerdown', e => {
      if (window.innerWidth <= 700) return;
      isResizing = true;
      startX = e.clientX;
      startWidth = this.drawerEl.offsetWidth;
      this.resizeHandle.classList.add('active');
      document.body.style.cursor = 'col-resize';
      this.resizeHandle.setPointerCapture(e.pointerId);
    });

    this.resizeHandle.addEventListener('pointermove', e => {
      if (!isResizing) return;
      const dx = e.clientX - startX;
      let newWidth = startWidth + dx;
      const minW = 220;
      const maxW = Math.round(window.innerWidth * 0.5);
      newWidth = Math.max(minW, Math.min(maxW, newWidth));

      this.currentWidth = newWidth;
      this.drawerEl.style.width = `${newWidth}px`;

      // Live camera offset update without animation
      this.roomScene.setPanelFreeAreaOffset(newWidth, true, false);

      // Re-check scrollbars
      if (this.updateStyleScroll) this.updateStyleScroll();
      if (this.updateTabsScroll) this.updateTabsScroll();
    });

    const stopResize = e => {
      if (isResizing) {
        isResizing = false;
        this.resizeHandle.classList.remove('active');
        document.body.style.cursor = '';
        try { this.resizeHandle.releasePointerCapture(e.pointerId); } catch {}
        try { localStorage.setItem('myroom_catalog_width', this.currentWidth.toString()); } catch {}
      }
    };
    this.resizeHandle.addEventListener('pointerup', stopResize);
    this.resizeHandle.addEventListener('pointercancel', stopResize);

    // Double-click to reset width to 300 px
    this.resizeHandle.addEventListener('dblclick', () => {
      this.currentWidth = 300;
      this.drawerEl.style.width = '300px';
      try { localStorage.setItem('myroom_catalog_width', '300'); } catch {}
      this.roomScene.setPanelFreeAreaOffset(300, true, true);
      if (this.updateStyleScroll) this.updateStyleScroll();
      if (this.updateTabsScroll) this.updateTabsScroll();
    });
  }

  // MOBILE BOTTOM SHEET RESIZE & DISMISS HANDLE (Height 20% to 70%)
  setupMobileHandle() {
    if (!this.mobileHandle) return;
    let startY = 0;
    let startHeight = 0;
    let isDragging = false;

    this.mobileHandle.addEventListener('pointerdown', e => {
      if (window.innerWidth > 700) return;
      isDragging = true;
      startY = e.clientY;
      startHeight = this.drawerEl.offsetHeight;
      this.mobileHandle.setPointerCapture(e.pointerId);
    });

    this.mobileHandle.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dy = e.clientY - startY; // positive when dragging down
      const minH = window.innerHeight * 0.20;
      const maxH = window.innerHeight * 0.70;
      const newH = Math.max(minH, Math.min(maxH, startHeight - dy));

      this.drawerEl.style.height = `${newH}px`;
      this.roomScene.setPanelFreeAreaOffset(newH, true, false);
    });

    const stopDrag = e => {
      if (isDragging) {
        isDragging = false;
        try { this.mobileHandle.releasePointerCapture(e.pointerId); } catch {}
        const currentH = this.drawerEl.offsetHeight;
        const minH = window.innerHeight * 0.20;
        if (currentH <= minH + 15 || (e.clientY - startY > 90)) {
          this.closeCatalog();
          this.drawerEl.style.height = '';
        }
      }
    };
    this.mobileHandle.addEventListener('pointerup', stopDrag);
    this.mobileHandle.addEventListener('pointercancel', stopDrag);
  }

  // CUSTOM HORIZONTAL SCROLLBARS (Synced with rows, placed ABOVE rows)
  setupCustomScrollbars() {
    this.updateStyleScroll = this.createHorizontalScrollSync(
      this.styleScrollTrack,
      this.styleScrollThumb,
      this.styleBar
    );
    this.updateTabsScroll = this.createHorizontalScrollSync(
      this.tabsScrollTrack,
      this.tabsScrollThumb,
      this.tabsContainer
    );
  }

  createHorizontalScrollSync(trackEl, thumbEl, contentEl) {
    if (!trackEl || !thumbEl || !contentEl) return () => {};

    const update = () => {
      const scrollWidth = contentEl.scrollWidth;
      const clientWidth = contentEl.clientWidth;
      const maxScroll = scrollWidth - clientWidth;

      if (maxScroll <= 2) {
        trackEl.classList.add('hidden');
        return;
      }
      trackEl.classList.remove('hidden');

      const trackWidth = trackEl.clientWidth;
      const thumbWidth = Math.max(24, Math.round((clientWidth / scrollWidth) * trackWidth));
      thumbEl.style.width = `${thumbWidth}px`;

      const availableTrack = trackWidth - thumbWidth;
      const scrollRatio = contentEl.scrollLeft / maxScroll;
      const thumbLeft = Math.max(0, Math.min(availableTrack, scrollRatio * availableTrack));
      thumbEl.style.transform = `translateX(${thumbLeft}px)`;
    };

    contentEl.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    let isDragging = false;
    let startX = 0;
    let startScrollLeft = 0;

    thumbEl.addEventListener('pointerdown', e => {
      e.stopPropagation();
      isDragging = true;
      startX = e.clientX;
      startScrollLeft = contentEl.scrollLeft;
      thumbEl.classList.add('active');
      thumbEl.setPointerCapture(e.pointerId);
    });

    thumbEl.addEventListener('pointermove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const trackWidth = trackEl.clientWidth;
      const thumbWidth = thumbEl.offsetWidth;
      const availableTrack = trackWidth - thumbWidth;
      const maxScroll = contentEl.scrollWidth - contentEl.clientWidth;
      if (availableTrack > 0 && maxScroll > 0) {
        const delta = (dx / availableTrack) * maxScroll;
        contentEl.scrollLeft = startScrollLeft + delta;
      }
    });

    const stop = e => {
      if (isDragging) {
        isDragging = false;
        thumbEl.classList.remove('active');
        try { thumbEl.releasePointerCapture(e.pointerId); } catch {}
      }
    };
    thumbEl.addEventListener('pointerup', stop);
    thumbEl.addEventListener('pointercancel', stop);

    trackEl.addEventListener('click', e => {
      if (e.target === thumbEl) return;
      const rect = trackEl.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const trackWidth = rect.width;
      const thumbWidth = thumbEl.offsetWidth;
      const availableTrack = trackWidth - thumbWidth;
      const maxScroll = contentEl.scrollWidth - contentEl.clientWidth;
      if (availableTrack > 0 && maxScroll > 0) {
        const ratio = Math.max(0, Math.min(1, (clickX - thumbWidth / 2) / availableTrack));
        contentEl.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
      }
    });

    setTimeout(update, 60);
    return update;
  }

  openCatalog() {
    this.isOpen = true;
    if (this.drawerEl) this.drawerEl.classList.remove('collapsed');
    if (this.openFab) this.openFab.classList.add('hidden');

    const panelSize = window.innerWidth > 700 ? (this.currentWidth || 300) : (this.drawerEl.offsetHeight || 300);
    this.roomScene.setPanelFreeAreaOffset(panelSize, true, true);

    if (this.gridWrapEl && this.savedScrollTop > 0) {
      this.gridWrapEl.scrollTop = this.savedScrollTop;
    }
    if (this.updateStyleScroll) this.updateStyleScroll();
    if (this.updateTabsScroll) this.updateTabsScroll();
  }

  closeCatalog() {
    this.isOpen = false;
    if (this.drawerEl) this.drawerEl.classList.add('collapsed');
    if (this.openFab) this.openFab.classList.remove('hidden');
    this.roomScene.setPanelFreeAreaOffset(0, false, true);
  }

  showListView() {
    if (this.detailViewEl) this.detailViewEl.classList.add('hidden');
    if (this.listViewEl) this.listViewEl.classList.remove('hidden');
    if (this.gridWrapEl && this.savedScrollTop > 0) {
      this.gridWrapEl.scrollTop = this.savedScrollTop;
    }
    if (this.updateStyleScroll) this.updateStyleScroll();
    if (this.updateTabsScroll) this.updateTabsScroll();
  }

  showDetailView() {
    if (this.listViewEl) this.listViewEl.classList.add('hidden');
    if (this.detailViewEl) this.detailViewEl.classList.remove('hidden');
  }

  // Handle item tap from catalog: check for pending unconfirmed item
  handleItemClick(catItem) {
    if (this.roomManager.activePlacingItem) {
      this.showSwitchDialog(
        () => {
          this.roomManager.confirmPlacing();
          this.openPlacingDetailForNew(catItem);
        },
        () => {
          this.roomManager.cancelPlacing();
          this.openPlacingDetailForNew(catItem);
        }
      );
    } else {
      this.openPlacingDetailForNew(catItem);
    }
  }

  showSwitchDialog(onConfirm, onDiscard) {
    if (!this.confirmDialog) {
      onConfirm();
      return;
    }

    const cleanup = () => {
      this.confirmDialog.classList.add('hidden');
      this.dialogConfirmBtn.onclick = null;
      this.dialogDiscardBtn.onclick = null;
    };

    this.dialogConfirmBtn.onclick = () => {
      cleanup();
      onConfirm();
    };

    this.dialogDiscardBtn.onclick = () => {
      cleanup();
      onDiscard();
    };

    this.confirmDialog.classList.remove('hidden');
  }

  async openPlacingDetailForNew(catalogItem) {
    if (!this.isOpen) this.openCatalog();
    const itemEntry = await this.roomManager.startPlacingNewItem(catalogItem);
    this.populateDetailView(itemEntry, true);
    this.showDetailView();
  }

  openDetailForExisting(itemEntry) {
    if (!this.isOpen) this.openCatalog();
    this.roomManager.startEditingItem(itemEntry);
    this.populateDetailView(itemEntry, false);
    this.showDetailView();
  }

  populateDetailView(itemEntry, isNew) {
    const catItem = itemEntry.catalogItem;

    if (this.detailTitle) this.detailTitle.textContent = catItem.name;

    if (this.detailModeBadge) {
      this.detailModeBadge.textContent = isNew ? 'Colocando' : 'Editando';
      this.detailModeBadge.className = isNew ? 'mode-badge-placing' : 'mode-badge-editing';
    }

    if (this.detailStyleBadge) {
      this.detailStyleBadge.textContent = catItem.style.toUpperCase();
      this.detailStyleBadge.className = `card-badge badge-${catItem.style}`;
    }

    if (this.detailSizeInfo) {
      const s = catItem.size_meters;
      this.detailSizeInfo.textContent = s ? `${s.width}m × ${s.depth}m × ${s.height}m` : '';
    }

    if (this.detailPreviewImg) {
      const cached = this.thumbnailCache.get(catItem.id);
      if (cached) {
        this.detailPreviewImg.src = cached;
      } else {
        this.detailPreviewImg.src = '';
      }
    }

    this.renderColorRows(itemEntry, this.detailColorList);
  }

  // Render Color Rows with 14 Presets, Recent Colors, and Rainbow Conic Picker Swatch
  renderColorRows(itemEntry, containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const customizableSlots = [
      { key: 'Main_Color', label: 'Color principal' },
      { key: 'Secondary_Color', label: 'Color secundario' },
      { key: 'Wood', label: 'Madera' },
      { key: 'Fabric', label: 'Tela' },
      { key: 'Light_Emission', label: 'Luz / Emisión', isEmission: true }
    ];

    const detected = new Map();
    itemEntry.root.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (!mat.name) return;
          customizableSlots.forEach(slot => {
            if (mat.name.startsWith(slot.key) || mat.name.includes(slot.key)) {
              if (!detected.has(slot.key)) {
                const hex = '#' + mat.color.getHexString();
                detected.set(slot.key, { slot, currentHex: hex, mat });
              }
            }
          });
        });
      }
    });

    if (detected.size === 0) {
      containerEl.innerHTML = `
        <div style="font-size: 0.78rem; color: #8a857e; text-align: center; padding: 6px 0;">
          Acabado estándar
        </div>
      `;
      return;
    }

    detected.forEach(({ slot, currentHex }) => {
      const row = document.createElement('div');
      row.className = 'prop-color-row';

      const header = document.createElement('div');
      header.className = 'prop-color-header';

      const label = document.createElement('span');
      label.className = 'prop-label';
      label.textContent = slot.label;

      header.appendChild(label);
      row.appendChild(header);

      const swatchesWrap = document.createElement('div');
      swatchesWrap.className = 'swatches-scroll-wrap';

      // 1. Recent custom colors from colorPicker
      const recents = this.colorPicker ? this.colorPicker.recentColors : [];
      recents.forEach(hex => {
        const sw = document.createElement('div');
        sw.className = 'swatch-circle swatch-circle-recent';
        sw.style.backgroundColor = hex;
        sw.title = `Reciente: ${hex}`;
        if (currentHex.toUpperCase() === hex.toUpperCase()) {
          sw.classList.add('active');
        }
        sw.addEventListener('click', () => {
          this.applyColor(itemEntry, slot.key, hex);
          this.renderColorRows(itemEntry, containerEl);
        });
        swatchesWrap.appendChild(sw);
      });

      // 2. 14 Preset Colors
      this.presetColors.forEach(hex => {
        const sw = document.createElement('div');
        sw.className = 'swatch-circle';
        sw.style.backgroundColor = hex;
        sw.title = hex;
        if (currentHex.toUpperCase() === hex.toUpperCase()) {
          sw.classList.add('active');
        }
        sw.addEventListener('click', () => {
          this.applyColor(itemEntry, slot.key, hex);
          this.renderColorRows(itemEntry, containerEl);
        });
        swatchesWrap.appendChild(sw);
      });

      // 3. Rainbow Conic Swatch with "+" at end
      const rainbowSw = document.createElement('div');
      rainbowSw.className = 'swatch-circle swatch-rainbow';
      rainbowSw.textContent = '+';
      rainbowSw.title = 'Personalizar color (Selector completo HSV)';
      rainbowSw.addEventListener('click', () => {
        if (!this.colorPicker) return;
        this.colorPicker.open(
          currentHex,
          slot.isEmission || false,
          itemEntry.emissionIntensity || 1.0,
          (newHex, newIntensity, isFinal) => {
            this.applyColor(itemEntry, slot.key, newHex);
            if (slot.isEmission) {
              this.applyEmission(itemEntry, newIntensity);
            }
            if (isFinal) {
              this.roomManager.notifyStateChanged();
              this.renderColorRows(itemEntry, containerEl);
            }
          }
        );
      });
      swatchesWrap.appendChild(rainbowSw);
      row.appendChild(swatchesWrap);

      // Light Emission Intensity Slider
      if (slot.isEmission) {
        const glowWrap = document.createElement('div');
        glowWrap.className = 'glow-slider-wrap';
        glowWrap.innerHTML = `
          <span>Luz</span>
          <input type="range" min="0" max="50" value="${Math.round((itemEntry.emissionIntensity || 1.0) * 10)}">
          <span class="glow-val">${(itemEntry.emissionIntensity || 1.0).toFixed(1)}</span>
        `;
        const range = glowWrap.querySelector('input');
        const valSpan = glowWrap.querySelector('.glow-val');
        range.addEventListener('input', e => {
          const val = parseInt(e.target.value, 10) / 10;
          valSpan.textContent = val.toFixed(1);
          this.applyEmission(itemEntry, val);
        });
        range.addEventListener('change', () => {
          this.roomManager.notifyStateChanged();
        });
        row.appendChild(glowWrap);
      }

      containerEl.appendChild(row);
    });
  }

  applyColor(itemEntry, partKey, hexColor) {
    const update = {};
    update[partKey] = hexColor;
    this.roomManager.applyColors(itemEntry, update);
  }

  applyEmission(itemEntry, intensity) {
    this.roomManager.applyEmission(itemEntry, intensity);
  }

  // ONLY TWO TABS: Muebles and Decoración
  filterItems() {
    if (!this.catalogData || !this.catalogData.items) return [];

    return this.catalogData.items.filter(item => {
      if (item.category === 'shell' || item.id.startsWith('shell_')) return false;

      // Style filter
      if (this.currentStyle !== 'all' && item.style !== this.currentStyle) {
        return false;
      }

      const isBedding = item.id.includes('bedspread') || item.id.includes('blanket') || item.id.includes('cushion');

      // 1. Muebles (Furniture): bed frames, sofas, chairs, tables, nightstands
      if (this.currentCategory === 'furniture') {
        const isBedFrame = (item.category === 'bed' || item.category === 'furniture' || item.id.includes('_bed_')) && !isBedding;
        return isBedFrame;
      }

      // 2. Decoración (Decor): cushions, blankets, bedspreads, lamps, rugs, paintings, decor
      if (this.currentCategory === 'decor') {
        return (
          item.category === 'decor' ||
          item.category === 'lamp' ||
          item.category === 'rug' ||
          item.id.includes('rug') ||
          isBedding
        );
      }

      return false;
    });
  }

  renderGrid() {
    if (!this.gridEl) return;
    this.gridEl.innerHTML = '';

    const items = this.filterItems();
    if (this.counterEl) {
      this.counterEl.textContent = `${items.length} objetos`;
    }

    if (items.length === 0) {
      this.gridEl.innerHTML = `
        <div class="empty-tab-msg">
          <p style="font-size: 1.8rem; margin-bottom: 6px;">✨</p>
          <p><strong>Sin objetos para este filtro</strong></p>
          <p style="font-size: 0.74rem; margin-top: 4px; opacity: 0.8;">Prueba seleccionando otro estilo o categoría.</p>
        </div>
      `;
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'catalog-card';
      card.dataset.id = item.id;

      const styleClass = `badge-${item.style}`;
      const styleName = item.style.charAt(0).toUpperCase() + item.style.slice(1);

      card.innerHTML = `
        <div class="card-thumb-box" id="thumb-${item.id}">
          <span class="placeholder-icon">🛋️</span>
        </div>
        <div class="card-title">${item.name}</div>
        <div class="card-meta">
          <span class="card-badge ${styleClass}">${styleName}</span>
          <span>${item.size_meters ? item.size_meters.width + 'm' : ''}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.handleItemClick(item);
      });

      this.gridEl.appendChild(card);
      this.generateThumbnail(item);
    });

    if (this.updateStyleScroll) this.updateStyleScroll();
    if (this.updateTabsScroll) this.updateTabsScroll();
  }

  generateThumbnail(item) {
    if (this.thumbnailCache.has(item.id)) {
      this.applyCachedThumbnail(item.id, this.thumbnailCache.get(item.id));
      return;
    }

    const filename = item.id + '.glb';
    const url = `/assets/${filename}`;

    this.thumbLoader.load(url, gltf => {
      // Clear previous models in thumb scene
      const toRemove = [];
      this.thumbScene.children.forEach(c => {
        if (c.isGroup || (c.isMesh && c !== this.thumbScene)) toRemove.push(c);
      });
      toRemove.forEach(c => this.thumbScene.remove(c));

      const model = gltf.scene;

      // Center and normalize size for thumbnail
      const bbox = new THREE.Box3().setFromObject(model);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      bbox.getCenter(center);
      bbox.getSize(size);

      model.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scale = 1.35 / maxDim;
        model.scale.set(scale, scale, scale);
      }

      this.thumbScene.add(model);
      this.thumbRenderer.render(this.thumbScene, this.thumbCamera);

      const dataUrl = this.thumbCanvas.toDataURL('image/png');
      this.thumbnailCache.set(item.id, dataUrl);
      this.applyCachedThumbnail(item.id, dataUrl);
    }, undefined, () => {
      // Keep placeholder on error
    });
  }

  applyCachedThumbnail(itemId, dataUrl) {
    const box = document.getElementById(`thumb-${itemId}`);
    if (box) {
      box.innerHTML = `<img src="${dataUrl}" alt="${itemId}" loading="lazy">`;
    }
    if (this.detailPreviewImg && this.roomManager.activePlacingItem && this.roomManager.activePlacingItem.catalogId === itemId) {
      this.detailPreviewImg.src = dataUrl;
    }
  }
}
