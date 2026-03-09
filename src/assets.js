// ============================================================
//  SOPHRON — assets.js
//  Carga ANTES que app.js en index.html
//  Todas las rutas son relativas a src/
// ============================================================

const ASSETS = {

  // ----------------------------------------------------------
  //  TEMAS — Imágenes de fondo
  // ----------------------------------------------------------
  empire: {
    background: './assets/themes/empire-bg.jpg',
  },

  rickmorty: {
    background: './assets/themes/rickmorty-bg.jpg',
  },

  // ----------------------------------------------------------
  //  🔴 EASTER EGG — Stranger Things / Upside Down
  // ----------------------------------------------------------
  strangerThings: {
    background: './assets/st.png',
    badge:      './assets/badges/badge-upside-down.png',
    theme:      './assets/st-theme.mp3',       // 🎵 pon aquí tu archivo de audio
  },

  // ----------------------------------------------------------
  //  ⚡ EASTER EGG — Rick & Morty
  // ----------------------------------------------------------
  rickMorty: {
    portal: './assets/portal.gif',
    rick:   './assets/rick.png',
    morty:  './assets/morty.png',
    badge:  './assets/badges/badge-rickmorty.png',
    theme:  './assets/rm-theme.mp3',           // 🎵 pon aquí tu archivo de audio
  },

  // ----------------------------------------------------------
  //  💾 EASTER EGG — Windows XP / Clippy
  // ----------------------------------------------------------
  xp: {
    wallpaper: './assets/xp.jpg',
    clippy:    './assets/clippy.png',
    badge:     './assets/badges/badge-xp.png',
    startup:   './assets/xp-startup.mp3',      // 🎵 pon aquí tu archivo de audio
  },

  // ----------------------------------------------------------
  //  ⭐ EASTER EGG — Star Wars / Use the Force
  //  Fuente: poner StarJedi.woff2 en ./assets/ para uso offline
  //  (en línea se carga desde fonts.cdnfonts.com automáticamente)
  // ----------------------------------------------------------
  starWars: {
    introVideo:    './assets/starwarsintro.mp4',
    // ── Audio Jedi ─────────────────────────────────────────
    vader:         './assets/sw-vader.mp3',
    // ── Audio Sith ─────────────────────────────────────────
    imperialMarch: './assets/sw-imperial-march.mp3',
    lightning:     './assets/sw-lightning.mp3',
    thunder:       './assets/sw-thunder.mp3',
    palpatine:     './assets/sw-palpatine.mp3',
    badge:         './assets/badges/badge-starwars.png',
    badgeSith:     './assets/badges/badge-sith.png',
    // ── Fuente local (opcional) ────────────────────────────
    // font:       './assets/StarJedi.woff2',
  },

  rickroll: './assets/rickroll.mp4',

  // ----------------------------------------------------------
  //  ⛏️  EASTER EGG — Minecraft
  // ----------------------------------------------------------
  minecraft: {
    overworld: './assets/mc-overworld.mp3',   // 🎵 música Overworld
    nether:    './assets/mc-nether.mp3',       // 🎵 música Nether
    end:       './assets/mc-end.mp3',          // 🎵 música End
    xp:        './assets/mc-xp.mp3',           // 🔊 sonido de XP al ganar badge
  },

  // ----------------------------------------------------------
  //  ICONOS — App general
  // ----------------------------------------------------------
  icons: {
    app:  './assets/icon.png',
    // tray: './assets/icon-tray.png',
  },

}

// Exponer globalmente para que app.js lo consuma
window.ASSETS = ASSETS
