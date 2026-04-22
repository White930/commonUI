#!/usr/bin/env node
/**
 * build.js — Assembles slot-control.html from modular source files.
 *
 * Source files:
 *   HTML:  slot-control-base.html  +  panel-{settings,hyperspin,auto}.html
 *   CSS:   slot-control.css        +  panel-{settings,hyperspin,auto}.css
 *   JS:    slot-control.js         +  panel-{auto,hyperspin,settings}.js
 *          + slot-control-init.js
 *
 * Output: slot-control.html  (single deployable file — do not edit directly)
 * Sync:   cp slot-control.html ../client-21/21fruit/slot-control.html
 */
const fs   = require('fs');
const path = require('path');
const dir  = __dirname;

function read(f) { return fs.readFileSync(path.join(dir, f), 'utf8'); }

/* ── CSS: base + panels ── */
const css = [
  'slot-control.css',
  'panel-settings.css',
  'panel-hyperspin.css',
  'panel-auto.css',
].map(read).join('\n\n');

/* ── JS: core → panels → init (order matters — IIFE split across files) ── */
const js = [
  'slot-control.js',       // opens main IIFE
  'panel-auto.js',
  'panel-hyperspin.js',
  'panel-settings.js',
  'slot-control-init.js',  // closes main IIFE
].map(read).join('\n\n');

/* ── HTML: base template with panel includes resolved ── */
let html = read('slot-control-base.html');
html = html
  .replace('<!-- @include:panel-settings.html -->',  read('panel-settings.html'))
  .replace('<!-- @include:panel-hyperspin.html -->', read('panel-hyperspin.html'))
  .replace('<!-- @include:panel-auto.html -->',      read('panel-auto.html'));

/* ── Inline CSS and JS ── */
const result = html
  .replace('<link rel="stylesheet" href="slot-control.css">',
           '<style>\n' + css + '\n</style>')
  .replace('<script src="slot-control.js"></script>',
           '<script>\n' + js + '\n</script>');

fs.writeFileSync(path.join(dir, 'slot-control.html'), result);
console.log('✓ slot-control.html built (' + result.split('\n').length + ' lines)');
