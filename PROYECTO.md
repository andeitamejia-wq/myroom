# MYROOM - Project Specification

## Overview
**MYROOM** is an interactive 3D web application where users design, furnish, and decorate their own cozy isometric diorama rooms from scratch or from curated templates. The platform is dedicated entirely to interior creativity, building, and spatial customization—with no characters, avatars, or background music.

---

## 1. What the App Does
- **Interactive 3D Room Builder**: Users start either with an empty room (initial default size: 6m × 6m, freely resizable) or with one of three pre-built example rooms based on curated design aesthetics.
- **Full Architectural Customization**: Users can modify room dimensions and structure, add or remove partition walls, adjust wall heights and thicknesses, customize floors and ceilings, and insert windows and doors.
- **Deep Object Customization**: Every catalog item placed in the room can be selected, moved, rotated, scaled, replaced by aesthetic variants, or edited in detail (surface colors, materials, textures, and component parts such as bed headboards or table legs).
- **Interactive Guidance**: Features a built-in, collapsible contextual help system that guides users step-by-step through controls, tools, and best design practices.

---

## 2. Who Uses It
- **Target Audience**: Young adults, design enthusiasts, casual creators, and hobbyists who appreciate interior design, cozy spaces, and miniature/diorama 3D aesthetics.
- **Zero Technical Barrier**: No prior knowledge of 3D modeling, Blender, or CAD is required.
- **Cross-Platform Accessibility**: Fully functional on both desktop (mouse/keyboard shortcuts) and mobile/tablet devices (touch gestures, tap, and drag-and-drop).

---

## 3. 3D Elements, Styles, and Aesthetic Guidelines

### 3.1 Visual Style & Camera
- **Isometric Diorama View**: A cutaway room displayed like an open architectural cube (two visible walls, one open front/side view, floor, and optional ceiling/facade).
- **Perspective Camera**: Configured at an isometric diagonal viewing angle (yielding volume, tactile depth, and cinematic perspective while maintaining the iconic diorama charm).
- **Geometry & Shapes**: Soft, chunky, rounded beveled edges, low-to-mid polygon count. Stylized, clean surfaces without noisy or hyper-realistic textures.
- **Color Palettes**: Warm, cozy, and pastel tones (warm terracottas, sage greens, butter yellows, soft creams, warm woods, and gentle pastel accents). Every object supports real-time color re-theming in code.
- **Materials**: Matte clay/plaster finishes, natural wood grains, tactile woven fabrics, smooth metals (brass, brushed chrome), and semi-translucent glass blocks / fluted glass.

### 3.2 Design Themes & Style Groups
Catalog assets and templates are grouped into distinct aesthetic collections:
1. **Cozy / Warm Cartoon** (Inspired by Reference A):
   - Warm wood tones, checkered textiles, sage green cabinetry, glowing sunlit windows, brass fixtures, potted plants, and intimate decorative elements.
2. **Modern & Elegant** (Inspired by Reference C):
   - Curved architectural walls, luminous glass-block partitions, vertical fluted wood panels, mushroom and fluted pendant lighting, upholstered platform beds, and minimalist art.
3. **Pastel Clay / Kawaii** (Inspired by Reference B):
   - Ultra-soft rounded clay contours, pillowy sofas and armchairs, smooth organic arches, lime/mint and butter-cream hues, and ceramic tabletop decor.
4. **Vintage / Retro**:
   - Classic mid-century furniture silhouettes, nostalgic nightstands, warm brass lighting, and patterned wallpapers.

### 3.3 3D Asset Catalog (Blender Models exported as `.glb`)
All assets are modeled once in Blender, optimized, and saved with standardized material slots for dynamic runtime manipulation:

- **Furniture**:
  - *Beds*: At least 3 primary styles (Vintage wooden frame with checkered blanket, Modern low-profile platform bed with fluted headboard, Soft rounded clay/upholstered bed) with swappable headboard variants.
  - *Seating*: Ergonomic armchairs, 2-seater and 3-seater sofas, poufs, footstools, and desk chairs.
  - *Tables & Desks*: Coffee tables (round, pill-shaped, wooden), study/work desks, low floor tea tables.
  - *Storage & Surfaces*: Nightstands, dressers, tall open bookshelves, floating wall shelves, modular cabinets.
  - *Mirrors*: Arched full-length mirrors, round vanity mirrors, wall-mounted mirrors.
- **Windows & Doors**:
  - *Windows*: Standard square casement, arched window, round porthole window, glass-block light wall.
  - *Doors*: Contemporary flush interior door, classic paneled door, sliding glass/wood door.
- **Walls & Partitions**:
  - Plain plaster/drywall, vertical wood slat wall, translucent glass-block wall, patterned wallpaper panels, curved feature walls, and free-standing room dividers.
- **Floors & Ceilings**:
  - *Floors*: Parquet wood, wide timber planks, ceramic grid tiles, smooth terrazzo/linoleum.
  - *Ceilings*: Smooth flat ceiling, exposed wooden beams, recessed tray ceiling.
- **Rugs & Curtains**:
  - Rugs: Circular woven jute rugs, rectangular plush rugs, organic/wavy accent mats.
  - Curtains: Draped sheer curtains, modern blackout roller blinds, gathered side drapes.
- **Lighting**:
  - Floor lamps (fluted columnar lamps, arched reading lamps).
  - Table & bedside lamps (ceramic mushroom lamps, candle holders).
  - Ceiling & pendant fixtures (dome pendants, paper lanterns, spotlights/reflectors).
  - Wall sconces and soft directional window sunlight.
- **Decor & Props**:
  - Indoor plants (monsteras, potted succulents, ficus).
  - Wall art & frames (abstract modern prints, botanical sketches).
  - Cushions, throw pillows, folded blankets, open/stacked books, ceramic mugs, and tea sets.
- **Exterior & Facades**:
  - Outer wall cladding styles (rough plaster, exterior brick, warm timber facade, clean white diorama base trim).

### 3.4 Curated Example Rooms
1. **The Cozy Attic Bedroom**: Warm wooden tones, sage green dresser, checkered duvet, reading corner, and golden window sunlight.
2. **The Modern Glass & Wood Suite**: Curved white accent wall, glass-block partition, fluted oak paneling, designer mushroom lamp, and platform bed.
3. **The Soft Pastel Living Room**: Sculpted clay walls with arched cutout, mint-green rounded sofa, organic coffee table, and lush pastel ceramics.

---

## 4. What the User Sees on Screen (UI / UX Layout)

- **Central Viewport**:
  - 3D isometric perspective diorama scene.
  - Smooth orbit controls with constrained vertical angles and clamped zoom to preserve the diorama framing.
  - Interactive transform gizmo and visual floor grid (0.5m grid increments).
- **Right Sidebar - Asset & Style Catalog**:
  - Categorized tab navigation: *Furniture, Windows & Doors, Walls, Floors, Ceilings, Rugs & Curtains, Lighting, Decor, Facades*.
  - Style filter pills (*All, Cozy, Modern, Pastel Clay, Vintage*).
  - Visual thumbnail grid for all items; clicking or dragging instantly spawns items into the scene.
- **Left Sidebar - Collapsible Help & Instructions**:
  - Clean step-by-step guides with intuitive iconography:
    - How to add and position items.
    - How to rotate, scale, and snap to the floor and walls.
    - How to paint walls, swap floor textures, and adjust lights.
    - How to duplicate, replace, or delete items.
  - **Contextual Inspector**: Automatically displays contextual shortcuts and editing tips whenever a specific object is selected.
  - Can be toggled or collapsed to maximize screen real estate.
- **Floating Properties Inspector (on object selection)**:
  - Color picker (presets + hex palette).
  - Material selector (Matte Clay, Wood, Fabric, Polished Metal, Glass).
  - Transform sliders / numeric inputs (Scale X/Y/Z, Rotation).
  - Quick action buttons: *Replace Variant, Duplicate, Snap to Wall, Delete*.
- **Top Application Bar**:
  - Project Title ("My Cozy Room").
  - Action buttons: *Undo*, *Redo*, *Reset Room*, *Capture Screenshot (PNG)*, *Save*, and *Share Link*.
- **Start Modal / Template Picker**:
  - Prompt on initial load: "Start with an Empty 6×6 Room" or choose one of the "3 Curated Example Rooms".

---

## 5. What the User Can Do (Interactions & Features)

- **Add & Place**: Click or drag items from the catalog into the 3D room.
- **Manipulate**: Move, rotate (with 45°/90° quick snap or free rotation), scale, duplicate, and delete objects.
- **Smart Snapping**: Objects snap to the 0.5m floor grid; wall decor and windows/doors snap directly to vertical wall surfaces.
- **Multi-Selection**: Box-select or Shift-click multiple objects to translate or rotate them together.
- **Variant Swapping**: Swap an existing placed asset with an alternate variant (e.g., swapping a standard window for an arched or glass-block window) while preserving position.
- **Deep Material & Part Editing**: Change individual material properties and customize sub-parts (e.g., bed frames, blankets, pillows, lamp shades).
- **Architectural Modification**: Resize room boundaries (from default 6m × 6m to smaller or larger layouts), add interior divider walls, change floor finishes, wall colors, and ceiling beams.
- **Atmospheric Lighting Control**:
  - Presets: *Bright Day, Cozy Sunset, Moody Night, Cool Minimalist*.
  - Toggle individual lamps, ceiling lights, and window glow on/off with adjustable intensity.
- **Project Persistence & Export**:
  - Save room designs locally in the browser.
  - Export room setup as a standalone `.json` project file.
  - Export high-resolution rendered diorama screenshots without UI elements.

---

## 6. Data Sharing & Collaboration

- **Zero-Friction Architecture**: No mandatory user accounts, logins, or external databases in Version 1.
- **Local Storage**: Auto-saves current progress in the browser (`localStorage`).
- **File Portability**: Full room state export and import via `.json`.
- **URL-Encoded Share Links**:
  - The entire room scene graph (room size, wall configurations, placed asset IDs, coordinates, rotations, scales, and custom color/material overrides) is serialized into a lightweight JSON payload.
  - The payload is compressed using **LZ-String (Base64)** and appended to the URL hash (e.g., `https://myroom.app/#room=...`).
  - Anyone opening the link instantly loads the exact room replica in their browser.

---

## Technical Architecture & Implementation Rules

### 1. Technology Stack
- **Backend**: Node.js with Express.
  - Serves static assets from the `public/` directory.
  - Health endpoint at `/api/health` returning `{"ok": true}`.
  - Dynamic port binding: listens on `process.env.PORT || 3000`.
- **Frontend**: Clean Vanilla JavaScript (ES Modules), HTML5, CSS3, and **Three.js** (WebGL 3D engine) with `OrbitControls`, `GLTFLoader`, and light manipulation.
- **URL Compression**: `lz-string` library for ultra-compact URL hash generation.

### 2. 3D Asset Pipeline (Blender & Three.js)
- **Asset Creation Workflow**: All 3D assets are modeled exclusively in Blender and exported as standard `.glb` files into `public/assets/`.
- **Master Scene File**: Master scene maintained in `blender/escena.blend`.
- **Model Constraints**:
  - Size: Strictly under 1 MB per `.glb` file.
  - Polygon Budget: Under 5,000 triangles per asset.
  - Textures: Maximum 1024 × 1024 px resolution (favoring procedural vertex colors and reusable material palettes where possible).
  - Scale & Origin: 1 Blender unit = 1 real-world meter. Object origin positioned cleanly at the bottom center (base) for seamless floor/wall placement.
- **Material Slot Naming**:
  - Standardized Principled BSDF material names across all models: `Main_Color`, `Accent_Color`, `Wood`, `Fabric`, `Metal`, `Glass`, `Light_Emissive`.
  - Enables Three.js frontend code to target and modify colors, roughness, and textures at runtime without re-exporting 3D models.
- **Separation of Concerns**: The 3D models are static building blocks; all UI, layout logic, room assembly, lighting toggles, and catalog management are handled strictly in the web application code.

### 3. Project Structure
```text
pinpon/
├── .gitignore               # Ignores node_modules, .env, .DS_Store, dist
├── package.json             # Express dependencies and start script
├── server.js                # Express server with /api/health and static file serving
├── PROYECTO.md              # Project specifications and technical blueprint
├── README.md                # Documentation and setup instructions
├── blender/
│   └── escena.blend         # Master Blender project file
└── public/
    ├── index.html           # Main application interface
    ├── css/
    │   └── styles.css       # Diorama UI styling (catalog, help panel, properties)
    ├── js/
    │   ├── main.js          # App initialization and coordination
    │   ├── scene.js         # Three.js setup, perspective isometric camera, lighting
    │   ├── catalog.js       # Asset definitions, styles, and thumbnail metadata
    │   ├── room.js          # Room generation, wall/floor geometry, 6x6 grid
    │   ├── controls.js      # Selection, transformation, snapping, variant replacement
    │   ├── ui.js            # Catalog tabs, help panel, properties inspector
    │   └── share.js         # JSON export/import and LZ-String URL serialization
    └── assets/
        ├── models/          # Exported .glb 3D models (bed_cozy_01.glb, etc.)
        └── thumbnails/      # Preview icons for the catalog
```

### 4. Roadmap & Step-by-Step Delivery
1. **Step 1 - Project Blueprint**: Review and approve `PROYECTO.md` *(Current Step)*.
2. **Step 2 - Initial 3D Asset**: Model the first bed in Blender, export as `.glb`, establish material naming and scale conventions.
3. **Step 3 - Catalog Asset Production**: Model the remaining furniture, windows, doors, walls, lights, and decor elements.
4. **Step 4 - Web Application**: Build the Express server, Three.js 3D diorama engine, catalog UI, help panel, properties editor, and sharing mechanism.
5. **Step 5 - Deployment & Git**: Final testing, documentation in `README.md`, push to GitHub repository, and live deployment on Render Web Service.
