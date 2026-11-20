// properties.js - Floating Properties Card Controller for Locked Objects
export class PropertiesManager {
  constructor(roomManager, catalogManager) {
    this.roomManager = roomManager;
    this.catalogManager = catalogManager;
    this.activeItem = null;

    this.cardEl = document.getElementById('properties-card');
    this.nameEl = document.getElementById('prop-object-name');
    this.unlockBtn = document.getElementById('prop-unlock-btn');
    this.closeBtn = document.getElementById('prop-close-btn');

    this.rotateBtn = document.getElementById('prop-rotate-btn');
    this.scaleUpBtn = document.getElementById('prop-scale-up-btn');
    this.scaleDownBtn = document.getElementById('prop-scale-down-btn');
    this.duplicateBtn = document.getElementById('prop-duplicate-btn');
    this.deleteBtn = document.getElementById('prop-delete-btn');
    this.colorListEl = document.getElementById('prop-color-list');

    this.setupListeners();

    // Hook into RoomManager selection
    this.roomManager.onSelectionChanged = itemEntry => {
      this.handleSelectionChanged(itemEntry);
    };
  }

  setupListeners() {
    // 🔓 Unlock button: enters placing mode in detail view
    if (this.unlockBtn) {
      this.unlockBtn.addEventListener('click', () => {
        if (!this.activeItem) return;
        const item = this.activeItem;
        this.hide();
        this.catalogManager.openDetailForExisting(item);
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.roomManager.deselectLockedItem();
      });
    }

    // Quick tools
    if (this.rotateBtn) {
      this.rotateBtn.addEventListener('click', () => {
        this.roomManager.rotateActive(45);
      });
    }

    if (this.scaleUpBtn) {
      this.scaleUpBtn.addEventListener('click', () => {
        this.roomManager.scaleActive(1.1);
      });
    }

    if (this.scaleDownBtn) {
      this.scaleDownBtn.addEventListener('click', () => {
        this.roomManager.scaleActive(0.9);
      });
    }

    if (this.duplicateBtn) {
      this.duplicateBtn.addEventListener('click', async () => {
        if (!this.activeItem) return;
        const item = this.activeItem;
        this.hide();
        const clone = await this.roomManager.duplicateItem(item);
        if (clone) {
          this.catalogManager.populateDetailView(clone, true);
          this.catalogManager.showDetailView();
        }
      });
    }

    if (this.deleteBtn) {
      this.deleteBtn.addEventListener('click', () => {
        if (!this.activeItem) return;
        const item = this.activeItem;
        this.hide();
        this.roomManager.deleteItem(item);
      });
    }
  }

  handleSelectionChanged(itemEntry) {
    this.activeItem = itemEntry;
    if (!itemEntry) {
      this.hide();
      return;
    }

    if (this.nameEl) {
      this.nameEl.textContent = itemEntry.catalogName || itemEntry.catalogItem.name;
    }

    if (this.colorListEl && this.catalogManager) {
      this.catalogManager.renderColorRows(itemEntry, this.colorListEl);
    }

    this.show();
  }

  show() {
    if (this.cardEl) this.cardEl.classList.remove('hidden');
  }

  hide() {
    if (this.cardEl) this.cardEl.classList.add('hidden');
    this.activeItem = null;
  }
}
