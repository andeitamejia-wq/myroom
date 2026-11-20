// help.js - Floating Help Card Controller
export class HelpManager {
  constructor() {
    this.cardEl = document.getElementById('help-card');
    this.toggleBtn = document.getElementById('help-btn');
    this.closeBtn = document.getElementById('help-close-btn');

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }
  }

  toggle() {
    if (!this.cardEl) return;
    this.cardEl.classList.toggle('hidden');
  }

  open() {
    if (this.cardEl) this.cardEl.classList.remove('hidden');
  }

  close() {
    if (this.cardEl) this.cardEl.classList.add('hidden');
  }
}
