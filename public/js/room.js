// room.js - Room Shells & Placed Objects Management
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class RoomManager {
  constructor(roomScene) {
    this.roomScene = roomScene;
    this.scene = roomScene.scene;
    this.loader = new GLTFLoader();

    this.currentShellId = null;
    this.shellObject = null;

    this.placedObjects = []; // Array of placed item objects
    this.placedObjectsGroup = new THREE.Group();
    this.scene.add(this.placedObjectsGroup);

    this.modelCache = new Map(); // Cache loaded GLTF scenes: url -> scene
    this.activePlacingItem = null;
    this.selectedLockedItem = null;

    this.selectionBox = null;
    this.createSelectionBox();

    // Event callbacks
    this.onSelectionChanged = null;
    this.onStateChanged = null;
  }

  createSelectionBox() {
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const edges = new THREE.EdgesGeometry(boxGeo);
    this.selectionBoxMaterial = new THREE.LineBasicMaterial({
      color: 0x38a169, // Soft green outline for placing mode
      linewidth: 3,
      depthTest: false,
      transparent: true,
      opacity: 0.95
    });
    this.selectionBox = new THREE.LineSegments(edges, this.selectionBoxMaterial);
    this.selectionBox.visible = false;
    this.selectionBox.renderOrder = 999;
    this.scene.add(this.selectionBox);
  }

  async loadShell(shellId) {
    if (this.currentShellId === shellId && this.shellObject) return;

    if (this.shellObject) {
      this.scene.remove(this.shellObject);
      this.shellObject = null;
    }

    let filename = `${shellId}.glb`;
    if (shellId === 'shell_modern_v2') filename = 'shell_modern.glb';
    if (shellId === 'shell_vintage_v2') filename = 'shell_vintage.glb';

    const url = `/assets/${filename}`;
    const gltf = await this.loadGltf(url);
    this.shellObject = gltf.scene.clone(true);
    this.shellObject.position.set(0, 0, 0);

    this.shellObject.traverse(child => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = true;
      }
    });

    this.scene.add(this.shellObject);
    this.currentShellId = shellId;
  }

  async loadGltf(url) {
    if (this.modelCache.has(url)) {
      return this.modelCache.get(url);
    }
    return new Promise((resolve, reject) => {
      this.loader.load(url, gltf => {
        this.modelCache.set(url, gltf);
        resolve(gltf);
      }, undefined, reject);
    });
  }

  // Create an object in "placing mode" (highlighted, ready to move/rotate/color)
  async startPlacingNewItem(catalogItem) {
    if (this.activePlacingItem && this.activePlacingItem.isNew) {
      this.cancelPlacing(this.activePlacingItem);
    }
    this.deselectLockedItem();

    const filename = catalogItem.id + '.glb';
    const url = `/assets/${filename}`;
    const gltf = await this.loadGltf(url);

    const modelInstance = gltf.scene.clone(true);

    // Deep clone materials
    modelInstance.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => m.clone());
          } else {
            child.material = child.material.clone();
          }
        }
      }
    });

    // Initial position at center with slight variation
    const offset = (this.placedObjects.length % 5) * 0.2 - 0.4;
    modelInstance.position.set(offset, 0, offset);
    modelInstance.rotation.y = 0;
    modelInstance.scale.set(1, 1, 1);

    const itemEntry = {
      uuid: THREE.MathUtils.generateUUID(),
      catalogId: catalogItem.id,
      catalogName: catalogItem.name,
      catalogItem: catalogItem,
      root: modelInstance,
      colors: {},
      emissionIntensity: 1.0,
      isLocked: false,
      isPlacing: true,
      isNew: true,
      originalSnapshot: null
    };
    modelInstance.userData = itemEntry;

    this.setPlacingVisuals(itemEntry, true);

    this.placedObjectsGroup.add(modelInstance);
    this.placedObjects.push(itemEntry);
    this.activePlacingItem = itemEntry;

    this.updateSelectionBox(0x38a169); // Green placing outline
    return itemEntry;
  }

  // Edit an existing confirmed object: enters placing mode
  startEditingItem(itemEntry) {
    if (this.activePlacingItem && this.activePlacingItem !== itemEntry) {
      this.confirmPlacing(this.activePlacingItem);
    }
    this.deselectLockedItem();

    itemEntry.isPlacing = true;
    itemEntry.isNew = false;
    itemEntry.isLocked = false;
    itemEntry.originalSnapshot = {
      position: itemEntry.root.position.clone(),
      rotationY: itemEntry.root.rotation.y,
      scale: itemEntry.root.scale.x,
      colors: { ...itemEntry.colors },
      emissionIntensity: itemEntry.emissionIntensity
    };

    this.activePlacingItem = itemEntry;
    this.setPlacingVisuals(itemEntry, true);
    this.updateSelectionBox(0x38a169);
    return itemEntry;
  }

  // Selection of a locked object (shows properties box)
  selectLockedItem(itemEntry) {
    if (this.activePlacingItem) return; // don't select locked while placing
    this.selectedLockedItem = itemEntry;
    this.updateSelectionBox(0x3182ce); // Soft blue selection outline
    if (this.onSelectionChanged) {
      this.onSelectionChanged(itemEntry);
    }
  }

  deselectLockedItem() {
    this.selectedLockedItem = null;
    if (!this.activePlacingItem) {
      this.selectionBox.visible = false;
    }
    if (this.onSelectionChanged) {
      this.onSelectionChanged(null);
    }
  }

  // Visual cues for placing mode (slight glow / translucency)
  setPlacingVisuals(itemEntry, isPlacing) {
    itemEntry.root.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          mat.transparent = isPlacing;
          mat.opacity = isPlacing ? 0.90 : 1.0;
        });
      }
    });
  }

  // CONFIRM: locks object in place, removes highlight
  confirmPlacing(itemEntry = null) {
    const item = itemEntry || this.activePlacingItem;
    if (!item) return;

    item.isPlacing = false;
    item.isLocked = true;
    item.isNew = false;
    item.originalSnapshot = null;

    this.setPlacingVisuals(item, false);

    if (this.activePlacingItem === item) {
      this.activePlacingItem = null;
    }
    this.selectionBox.visible = false;

    this.notifyStateChanged();
  }

  // CANCEL / BACK: reverts or removes pending object
  cancelPlacing(itemEntry = null) {
    const item = itemEntry || this.activePlacingItem;
    if (!item) return;

    if (item.isNew) {
      // Remove newly created item from scene
      this.placedObjectsGroup.remove(item.root);
      this.placedObjects = this.placedObjects.filter(o => o.uuid !== item.uuid);
    } else if (item.originalSnapshot) {
      // Revert edits on existing item
      item.root.position.copy(item.originalSnapshot.position);
      item.root.rotation.y = item.originalSnapshot.rotationY;
      item.root.scale.setScalar(item.originalSnapshot.scale);
      this.applyColors(item, item.originalSnapshot.colors);
      if (item.originalSnapshot.emissionIntensity !== undefined) {
        this.applyEmission(item, item.originalSnapshot.emissionIntensity);
      }
      item.isPlacing = false;
      item.isLocked = true;
      this.setPlacingVisuals(item, false);
    }

    if (this.activePlacingItem === item) {
      this.activePlacingItem = null;
    }
    this.selectionBox.visible = false;
  }

  deleteActiveItem() {
    if (!this.activePlacingItem) return;
    const item = this.activePlacingItem;
    this.placedObjectsGroup.remove(item.root);
    this.placedObjects = this.placedObjects.filter(o => o.uuid !== item.uuid);
    this.activePlacingItem = null;
    this.selectionBox.visible = false;
    this.notifyStateChanged();
  }

  deleteItem(itemEntry) {
    if (!itemEntry) return;
    this.placedObjectsGroup.remove(itemEntry.root);
    this.placedObjects = this.placedObjects.filter(o => o.uuid !== itemEntry.uuid);
    if (this.activePlacingItem === itemEntry) this.activePlacingItem = null;
    if (this.selectedLockedItem === itemEntry) this.deselectLockedItem();
    this.selectionBox.visible = false;
    this.notifyStateChanged();
  }

  rotateActive(degrees = 45) {
    const target = this.activePlacingItem || this.selectedLockedItem;
    if (!target) return;
    target.root.rotation.y += THREE.MathUtils.degToRad(degrees);
    this.updateSelectionBox();
    if (!target.isPlacing) this.notifyStateChanged();
  }

  scaleActive(factor = 1.1) {
    const target = this.activePlacingItem || this.selectedLockedItem;
    if (!target) return;
    const currentScale = target.root.scale.x;
    const newScale = Math.max(0.5, Math.min(2.2, currentScale * factor));
    target.root.scale.set(newScale, newScale, newScale);
    this.updateSelectionBox();
    if (!target.isPlacing) this.notifyStateChanged();
  }

  async duplicateItem(itemEntry) {
    if (!itemEntry) return null;
    const catItem = itemEntry.catalogItem;
    const newItem = await this.startPlacingNewItem(catItem);
    newItem.root.position.copy(itemEntry.root.position).add(new THREE.Vector3(0.2, 0, 0.2));
    newItem.root.rotation.y = itemEntry.root.rotation.y;
    newItem.root.scale.copy(itemEntry.root.scale);
    if (itemEntry.colors) {
      this.applyColors(newItem, itemEntry.colors);
    }
    if (itemEntry.emissionIntensity !== undefined) {
      this.applyEmission(newItem, itemEntry.emissionIntensity);
    }
    this.updateSelectionBox(0x38a169);
    return newItem;
  }

  updateSelectionBox(colorHex = null) {
    const target = this.activePlacingItem || this.selectedLockedItem;
    if (!target || !target.root) {
      this.selectionBox.visible = false;
      return;
    }

    if (colorHex !== null) {
      this.selectionBoxMaterial.color.setHex(colorHex);
    }

    const bbox = new THREE.Box3().setFromObject(target.root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);

    this.selectionBox.scale.set(size.x + 0.05, size.y + 0.05, size.z + 0.05);
    this.selectionBox.position.copy(center);
    this.selectionBox.visible = true;
  }

  clearAllItems() {
    if (this.activePlacingItem) {
      this.cancelPlacing(this.activePlacingItem);
    }
    this.deselectLockedItem();
    while (this.placedObjectsGroup.children.length > 0) {
      this.placedObjectsGroup.remove(this.placedObjectsGroup.children[0]);
    }
    this.placedObjects = [];
    this.activePlacingItem = null;
    this.selectionBox.visible = false;
  }

  applyColors(itemEntry, colors) {
    itemEntry.colors = { ...itemEntry.colors, ...colors };
    itemEntry.root.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          for (const [key, hex] of Object.entries(colors)) {
            if (mat.name && (mat.name.startsWith(key) || mat.name.includes(key))) {
              mat.color.set(hex);
              if (key === 'Light_Emission' && mat.emissive) {
                mat.emissive.set(hex);
              }
            }
          }
        });
      }
    });
  }

  applyEmission(itemEntry, intensity) {
    itemEntry.emissionIntensity = intensity;
    itemEntry.root.traverse(child => {
      if (child.isMesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (mat.name && (mat.name.startsWith('Light_Emission') || mat.name.includes('Light_Emission') || mat.name.includes('Emission'))) {
            if (mat.emissive) {
              mat.emissiveIntensity = intensity;
            }
          }
        });
      }
    });
  }

  // Pre-load items into room (e.g. for example rooms)
  async addConfirmedItem(catalogItem, position, rotationY = 0, scale = 1, colors = {}, emissionIntensity = 1.0) {
    const filename = catalogItem.id + '.glb';
    const url = `/assets/${filename}`;
    const gltf = await this.loadGltf(url);

    const modelInstance = gltf.scene.clone(true);
    modelInstance.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material = child.material.map(m => m.clone());
          } else {
            child.material = child.material.clone();
          }
        }
      }
    });

    modelInstance.position.set(position[0], position[1], position[2]);
    modelInstance.rotation.y = THREE.MathUtils.degToRad(rotationY);
    modelInstance.scale.set(scale, scale, scale);

    const itemEntry = {
      uuid: THREE.MathUtils.generateUUID(),
      catalogId: catalogItem.id,
      catalogName: catalogItem.name,
      catalogItem: catalogItem,
      root: modelInstance,
      colors: { ...colors },
      emissionIntensity: emissionIntensity,
      isLocked: true,
      isPlacing: false,
      isNew: false
    };
    modelInstance.userData = itemEntry;

    if (colors && Object.keys(colors).length > 0) {
      this.applyColors(itemEntry, colors);
    }
    if (emissionIntensity !== undefined) {
      this.applyEmission(itemEntry, emissionIntensity);
    }

    this.placedObjectsGroup.add(modelInstance);
    this.placedObjects.push(itemEntry);
    return itemEntry;
  }

  getState() {
    return {
      shell: this.currentShellId,
      items: this.placedObjects.map(item => ({
        id: item.catalogId,
        position: [
          Math.round(item.root.position.x * 1000) / 1000,
          Math.round(item.root.position.y * 1000) / 1000,
          Math.round(item.root.position.z * 1000) / 1000
        ],
        rotationY: Math.round(THREE.MathUtils.radToDeg(item.root.rotation.y) * 10) / 10,
        scale: Math.round(item.root.scale.x * 100) / 100,
        colors: { ...item.colors },
        emissionIntensity: item.emissionIntensity || 1.0
      }))
    };
  }

  async restoreState(state, catalogMap) {
    if (state.shell && state.shell !== this.currentShellId) {
      await this.loadShell(state.shell);
    }
    this.clearAllItems();

    if (state.items && Array.isArray(state.items)) {
      for (const it of state.items) {
        const catItem = catalogMap.get(it.id);
        if (catItem) {
          await this.addConfirmedItem(
            catItem,
            it.position,
            it.rotationY || 0,
            it.scale || 1,
            it.colors || {},
            it.emissionIntensity || 1.0
          );
        }
      }
    }
  }

  notifyStateChanged() {
    if (this.onStateChanged) {
      this.onStateChanged(this.getState());
    }
  }
}
