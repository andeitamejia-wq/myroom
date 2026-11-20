# MYROOM

**🌐 Ver la web: https://myroom-6wyk.onrender.com**

(Al abrirla por primera vez puede tardar ~1 minuto en cargar, porque el servidor gratuito se duerme.)

App web para decorar una habitación 3D (Node.js + Express + Three.js).

- Catálogo de objetos (Muebles / Decoración) en estilos pastel, moderno y vintage.
- Luz cálida, neutra o fresca, editor de colores y 3 habitaciones de ejemplo.
- Los modelos se hacen en Blender y se exportan como `.glb` a `public/assets/`.

## Ejecutar en local

```bash
npm install
npm start
```

Abrir http://localhost:3000 (comprobación: `/api/health` → `{"ok":true}`).

## Publicación

Alojada en Render (Web Service, plan Free): build `npm install`, start `npm start`.
El plan gratuito se duerme tras ~15 min sin uso y tarda ~1 min en despertar.
Los diseños se guardan en el navegador o en el enlace, no en el servidor.
