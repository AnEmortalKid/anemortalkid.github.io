/**
 * merge_infobox_into_items.js
 *
 * Merges caption/description from data/infobox.json into items.js entries.
 * Output: items_updated.js
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const vm = require('vm');

// ---- CONFIG — tweak as needed ----
const ITEMS_JS_PATH = path.resolve('items.js');              // input JS with const ITEMS = { ... }
const INFOBOX_JSON_PATH = path.resolve('datafetch/data/infobox.json'); // scraper output
const OUTPUT_JS_PATH = path.resolve('items_updated.js');     // merged output

// Which fields to merge from infobox.json -> items.*
// (json keys are Title/Caption/Description/Image; we only add these two)
const FIELDS = {
  caption: (src) => src.Caption || null,
  description: (src) => src.Description || null,
};

// ---- helpers ----

// Load items.js even if it doesn't export — capture its global "ITEMS" via VM
async function loadItemsFromJs(filePath) {
  const code = await fsp.readFile(filePath, 'utf8');

  // Create a sandbox with a place for ITEMS
  const sandbox = { ITEMS: undefined, console };
  vm.createContext(sandbox);

  // Run code; it defines const ITEMS = { ... };
  // To expose it, re-evaluate with an appended line exporting to sandbox.
  const wrapped =
    code +
    `\n/* injected by merge script */\n;this.ITEMS = typeof ITEMS !== 'undefined' ? ITEMS : this.ITEMS;`;

  vm.runInContext(wrapped, sandbox, { filename: path.basename(filePath) });

  if (!sandbox.ITEMS || typeof sandbox.ITEMS !== 'object') {
    throw new Error(`Could not read ITEMS from ${filePath}`);
  }
  return sandbox.ITEMS;
}

// Nicely stringify JS with stable keys and single quotes
// Pretty-print JS objects, leaving safe identifiers unquoted
function jsStringify(value, indent = 2) {
  const seen = new WeakSet();
  function stringify(val, level) {
    if (val === null) return 'null';
    if (typeof val !== 'object') return JSON.stringify(val);
    if (seen.has(val)) return '"[Circular]"';
    seen.add(val);

    const sp = ' '.repeat(level * indent);
    const nl = '\n';
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      return (
        '[' +
        nl +
        val.map((v) => sp + ' '.repeat(indent) + stringify(v, level + 1)).join(',' + nl) +
        nl +
        sp +
        ']'
      );
    } else {
      const keys = Object.keys(val);
      if (keys.length === 0) return '{}';
      return (
        '{' +
        nl +
        keys
          .map((k) => {
            const isIdent = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k);
            const keyStr = isIdent ? k : JSON.stringify(k);
            return sp + ' '.repeat(indent) + keyStr + ': ' + stringify(val[k], level + 1);
          })
          .join(',' + nl) +
        nl +
        sp +
        '}'
      );
    }
  }
  return stringify(value, 0);
}

// Generate file contents like the original: const ITEMS = { ... };
function buildItemsJs(itemsObj) {
  const header = `// items_updated.js (generated) — do not edit by hand
const ITEMS = `;

  const footer = `;

if (typeof module !== 'undefined') {
  module.exports = { ITEMS };
}
`;

  // Keep category order if present
  const ordered = {};
  for (const key of ['common', 'uncommon', 'legendary', 'boss', 'void']) {
    if (itemsObj[key]) ordered[key] = itemsObj[key];
  }
  for (const k of Object.keys(itemsObj)) {
    if (!(k in ordered)) ordered[k] = itemsObj[k];
  }

  return header + jsStringify(ordered, 2) + footer;
}

// ---- main ----
(async () => {
  try {
    const items = await loadItemsFromJs(ITEMS_JS_PATH);
    const infoboxMap = JSON.parse(await fsp.readFile(INFOBOX_JSON_PATH, 'utf8'));

    // Merge per category & item
    for (const category of Object.keys(items)) {
      const arr = items[category];
      if (!Array.isArray(arr)) continue;

      items[category] = arr.map((item) => {
        const info = infoboxMap[item.id];
        if (!info) return item;

        const merged = { ...item };
        for (const [targetKey, pick] of Object.entries(FIELDS)) {
          const v = pick(info);
          if (v && typeof v === 'string' && v.trim()) {
            merged[targetKey] = v.trim();
          }
        }
        return merged;
      });
    }

    const outJs = buildItemsJs(items);
    await fsp.writeFile(OUTPUT_JS_PATH, outJs, 'utf8');
    console.log('✅ Merged and wrote ->', OUTPUT_JS_PATH);
  } catch (err) {
    console.error('❌ Merge failed:', err.message);
    process.exit(1);
  }
})();
