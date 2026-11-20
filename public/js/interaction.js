// interaction.js - Safe Dragging with Grid Snapping & Object Selection
import * as THREE from 'three';

export class InteractionManager {
  constructor(roomScene, roomManager, catalogManager, propertiesManager) {
    this.roomScene = roomScene;
    this.roomManager = roomManager;
    this.catalogManager = catalogManager;
    this.propertiesManager = propertiesManager;

    this.camera = roomScene.camera;
    this.controls = roomScene.controls;
    this.domElement = roomScene.renderer.domElement;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.isDragging = false;
    this.dragOffset = new THREE.Vector3();
    this.pointerDownPos = new THREE.Vector2();
    this.hasMovedSignificantly = false;

    this.setupListeners();
  }

  setupListeners() {
    this.domElement.addEventListener('pointerdown', e => this.onPointerDown(e));
    window.addEventListener('pointermove', e => this.onPointerMove(e));
    window.addEventListener('pointerup', e => this.onPointerUp(e));

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if ((e.key === 'r' || e.key === 'R') && this.roomManager.activePlacingItem) {
        this.roomManager.rotateActive(45);
      } else if (e.key === 'Escape') {
        if (this.roomManager.activePlacingItem) {
          this.roomManager.cancelPlacing();
          if (this.catalogManager) this.catalogManager.showListView();
        } else if (this.roomManager.selectedLockedItem) {
          this.roomManager.deselectLockedItem();
        }
      }
    });
  }

  updatePointer(e) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  onPointerDown(e) {
    if (e.button !== 0) return; // Left mouse / single touch
    this.updatePointer(e);
    this.pointerDownPos.set(e.clientX, e.clientY);
    this.hasMovedSignificantly = false;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    // 1. If an object is actively in placing mode:
    if (this.roomManager.activePlacingItem) {
      const activeMeshes = [];
      this.roomManager.activePlacingItem.root.traverse(child => {
        if (child.isMesh) activeMeshes.push(child);
      });

      const hits = this.raycaster.intersectObjects(activeMeshes, false);
      if (hits.length > 0) {
        // Dragging the item currently in placing mode
        this.isDragging = true;
        this.controls.enabled = false;

        const groundHits = this.raycaster.intersectObject(this.roomScene.groundPlane, false);
        if (groundHits.length > 0) {
          this.dragOffset.copy(groundHits[0].point).sub(this.roomManager.activePlacingItem.root.position);
        }
        return;
      }
    }

    // 2. If NO object is in placing mode, check if clicking a locked object
    if (!this.roomManager.activePlacingItem) {
      const allMeshes = [];
      this.roomManager.placedObjects.forEach(item => {
        item.root.traverse(child => {
          if (child.isMesh) {
            child.userData.itemEntry = item;
            allMeshes.push(child);
          }
        });
      });

      const intersects = this.raycaster.intersectObjects(allMeshes, false);
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const clickedItem = hitMesh.userData.itemEntry;
        if (clickedItem) {
          this.roomManager.selectLockedItem(clickedItem);
          return;
        }
      } else {
        // Clicked outside on ground / empty room -> deselect locked item
        // Only if it was a click (not a camera orbit drag)
        this.potentialDeselect = true;
      }
    }
  }

  onPointerMove(e) {
    const dist = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
    if (dist > 5) {
      this.hasMovedSignificantly = true;
      this.potentialDeselect = false;
    }

    if (!this.isDragging || !this.roomManager.activePlacingItem) return;

    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const groundHits = this.raycaster.intersectObject(this.roomScene.groundPlane, false);
    if (groundHits.length > 0) {
      const point = groundHits[0].point;
      const rawX = point.x - this.dragOffset.x;
      const rawZ = point.z - this.dragOffset.z;

      // Snap to 0.2 m grid
      const gridSize = 0.2;
      const snappedX = Math.round(rawX / gridSize) * gridSize;
      const snappedZ = Math.round(rawZ / gridSize) * gridSize;

      // Clamp strictly inside 4m x 4m room floor bounds
      const clampedX = Math.max(-1.75, Math.min(1.75, snappedX));
      const clampedZ = Math.max(-1.75, Math.min(1.75, snappedZ));

      const objRoot = this.roomManager.activePlacingItem.root;
      objRoot.position.x = clampedX;
      objRoot.position.z = clampedZ;

      this.roomManager.updateSelectionBox(0x38a169);
    }
  }

  onPointerUp(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.controls.enabled = true;
    }

    if (this.potentialDeselect && !this.hasMovedSignificantly) {
      this.roomManager.deselectLockedItem();
      this.potentialDeselect = false;
    }
  }
}
