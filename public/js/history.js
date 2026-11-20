// history.js - Undo / Redo Manager
export class HistoryManager {
  constructor(roomManager, catalogMap) {
    this.roomManager = roomManager;
    this.catalogMap = catalogMap;

    this.undoStack = [];
    this.redoStack = [];
    this.maxHistory = 30;
    this.isRestoring = false;

    this.undoBtn = document.getElementById('undo-btn');
    this.redoBtn = document.getElementById('redo-btn');

    this.setupListeners();
    this.updateButtons();
  }

  setupListeners() {
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => this.undo());
    }
    if (this.redoBtn) {
      this.redoBtn.addEventListener('click', () => this.redo());
    }

    // Keyboard shortcuts: Ctrl+Z / Cmd+Z and Ctrl+Y / Cmd+Y
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (mod && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault();
          this.redo();
        } else {
          e.preventDefault();
          this.undo();
        }
      } else if (mod && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.redo();
      }
    });

    // Listen to room manager state changes
    this.roomManager.onStateChanged = state => {
      this.pushState(state);
    };
  }

  pushState(state) {
    if (this.isRestoring) return;

    // Serialize state snapshot
    const snapshot = JSON.stringify(state);

    // Skip duplicate sequential states
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
      return;
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo on new action
    this.updateButtons();
  }

  async undo() {
    if (this.undoStack.length <= 1) return; // Keep initial state

    const currentState = this.undoStack.pop();
    this.redoStack.push(currentState);

    const prevState = JSON.parse(this.undoStack[this.undoStack.length - 1]);

    this.isRestoring = true;
    try {
      await this.roomManager.restoreState(prevState, this.catalogMap);
    } finally {
      this.isRestoring = false;
      this.updateButtons();
    }
  }

  async redo() {
    if (this.redoStack.length === 0) return;

    const nextStateStr = this.redoStack.pop();
    this.undoStack.push(nextStateStr);

    const nextState = JSON.parse(nextStateStr);

    this.isRestoring = true;
    try {
      await this.roomManager.restoreState(nextState, this.catalogMap);
    } finally {
      this.isRestoring = false;
      this.updateButtons();
    }
  }

  reset(initialState) {
    this.undoStack = [];
    this.redoStack = [];
    if (initialState) {
      this.undoStack.push(JSON.stringify(initialState));
    }
    this.updateButtons();
  }

  updateButtons() {
    if (this.undoBtn) {
      this.undoBtn.disabled = this.undoStack.length <= 1;
    }
    if (this.redoBtn) {
      this.redoBtn.disabled = this.redoStack.length === 0;
    }
  }
}
