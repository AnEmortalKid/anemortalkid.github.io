/* app.js — Risk of Rain 2 Draft Builder
   ---------------------------------------------------------
   This script powers:
   - Pool filtering by rarity + search
   - Drag from pool → draft (copies), drag within draft → reorder
   - Per-rarity limits (Requirements), editable in the UI and saved locally
   - PNG export (html2canvas)
   Assumptions:
   - items.js defines a global ITEMS object grouped by buckets:
       ITEMS.common, ITEMS.uncommon, ITEMS.legendary, ITEMS.boss, ITEMS.void
   - Images are served from your site (same-origin) like: items/common/Warbanner.png
   --------------------------------------------------------- */

"use strict";


/**
 * @typedef {Object} Item
 * @property {string} id - Machine-friendly identifier (e.g. "benthic-bloom").
 * @property {string} name - Display name of the item (e.g. "Benthic Bloom").
 * @property {string} wiki - URL to the wiki page.
 * @property {string} img - Relative or absolute path to the item image.
 * @property {string} caption - Short caption for quick info / tooltip.
 * @property {string} description - Full description of the item’s effect.
 */

/**
 * Defines an item that is rendered with just the minimal set of info attached to a node
 * @typedef {Object} RenderedItem
 * @property {string} id - Machine-friendly identifier (e.g. "benthic-bloom").
 * @property {string} rarity - Rarity for the item (white,green,uprple,red,yellow).
 * @property {string} name - Display name of the item (e.g. "Benthic Bloom").
 */


/* ------------------------------- Constants ------------------------------- */

// Map ITEMS buckets → canonical rarity keys used throughout the UI.
const BUCKET_TO_RARITY = {
  common: "white",
  uncommon: "green",
  legendary: "red",
  boss: "yellow",
  void: "purple",
};

// Order matters for counts, loops, and display.
const RARITIES = ["white", "green", "red", "yellow", "purple"];

// Defaults for the per-rarity max counts. These persist into localStorage.
const REQUIREMENTS = { white: 7, green: 3, red: 3, yellow: 0, purple: 0 };
const REQS_STORAGE_KEY = "ror2-draft-reqs-v1";

const SETTINGS = { rerollCorrupted: false };
const SETTINGS_STORAGE_KEY = "ror2-draft-settings-v1";


// From void to items it corrupts
const VOID_CORRUPTS = {
  "lost-seers-lenses": ["lens-makers-glasses"],
  "lysate-cell": ["fuel-cell"],
  "needletick": ["tri-tip-dagger"],
  "plasma-shrimp": ["atg-missile-mk1"],
  "polylute": ["ukelele"],
  "safer-spaces": ["tougher-times"],
  "singularity-band": ["runalds-band", "kjaros-band"],
  "weeping-fungus": ["bustling-fungi"],
  "tentabauble": ["chronobauble"],
  "voidsent-flame": ["will-o-the-wisp"],
  "benthic-bloom": ["57-leaf-clover"]
};

/* --------------------------- DOM helper utilities ------------------------ */

const q = (sel, root = document) => root.querySelector(sel);
const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** createElement sugar with attributes, dataset, and children */
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    node.append(child?.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

/* ----------------------------- Data / Flatten ---------------------------- */

/**
 * Flatten ITEMS.* buckets into a single array and inject the canonical rarity.
 * We do this once at boot so all filters are simple array operations afterward.
 */
function buildAllItems() {
  if (typeof ITEMS !== "object" || !ITEMS) {
    console.error("items.js is missing or ITEMS is not defined.");
    return [];
  }
  const out = [];
  for (const [bucket, list] of Object.entries(ITEMS)) {
    const rarity = BUCKET_TO_RARITY[bucket];
    if (!rarity || !Array.isArray(list)) continue;
    for (const it of list) {
      out.push({ ...it, rarity });
    }
  }
  return out;
}

const ALL_ITEMS = buildAllItems();

// Build a quick lookup by id (for tooltip name fallback, etc.)
const itemsById = {};
ALL_ITEMS.forEach(it => { itemsById[it.id] = it; });

// export it so usable
window.ITEM_INFO = itemsById;


/* --------------------------------- State --------------------------------- */

const state = {
  rarity: "white",               // current pool tab
  filter: "",                    // lowercase search term
  poolEl: null,                  // #pool
  dropzoneEl: null,              // #dropzone
  counts: {                      // live counts in the draft
    white: 0, green: 0, red: 0, yellow: 0, purple: 0
  },
  imagesCache: new Map(),        // id -> dataURL (helps export be CORS-clean),
  // track what we have drafted
  drafted: new Set()
};


/* --------------------------- Requirements (UI) --------------------------- */
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") Object.assign(SETTINGS, saved);
  } catch (_) { /* ignore */ }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(SETTINGS));
}

function setupRerollToggle() {
  loadSettings(); // load once here (or in init() before UI wiring)

  const cb = q("#toggleReroll");
  if (!cb) return;

  // reflect saved state
  cb.checked = !!SETTINGS.rerollCorrupted;

  // keep state + storage in sync
  cb.addEventListener("change", () => {
    SETTINGS.rerollCorrupted = cb.checked;
    saveSettings();
    // recolor disabled
    refreshPoolDisabled();
  });
}

/** load saved limits, wire inputs, and sync the header counters */
function setupRequirements() {
  // 1) Load saved requirements from localStorage (if present)
  try {
    const saved = JSON.parse(localStorage.getItem(REQS_STORAGE_KEY) || "null");
    if (saved && typeof saved === "object") Object.assign(REQUIREMENTS, saved);
  } catch (_) { /* ignore parse errors */ }

  // 2) Prefill inputs at the top “Requirements” panel
  RARITIES.forEach(r => {
    const input = q(`#req-${r}`);
    if (!input) return;
    input.value = REQUIREMENTS[r] ?? 0;
  });

  // 3) Save button → persist + refresh header targets
  const saveBtn = q("#saveReqs");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      RARITIES.forEach(r => {
        const n = parseInt(q(`#req-${r}`)?.value ?? "0", 10);
        REQUIREMENTS[r] = Number.isFinite(n) ? Math.max(0, n) : 0;
      });
      localStorage.setItem(REQS_STORAGE_KEY, JSON.stringify(REQUIREMENTS));
      updateCounts();
      // Tiny inline “Saved ✓” feedback
      const tag = q("#reqSaved");
      if (tag) {
        tag.style.display = "inline";
        setTimeout(() => (tag.style.display = "none"), 1000);
      }
    });
  }

  // 4) Initial header reflect
  updateCounts();
}

/* ------------------------------- Rendering ------------------------------- */

function updateCounts() {
  // Update the live counts
  q("#whiteCount").textContent = state.counts.white;
  q("#greenCount").textContent = state.counts.green;
  q("#redCount").textContent = state.counts.red;
  q("#yellowCount").textContent = state.counts.yellow;
  q("#purpleCount").textContent = state.counts.purple;

  // Update the targets (requirements)
  q("#whiteReq").textContent = REQUIREMENTS.white;
  q("#greenReq").textContent = REQUIREMENTS.green;
  q("#redReq").textContent = REQUIREMENTS.red;
  q("#yellowReq").textContent = REQUIREMENTS.yellow;
  q("#purpleReq").textContent = REQUIREMENTS.purple;
}

/** quick text filter + rarity tab filter */
function matchesFilters(item) {
  if (item.rarity !== state.rarity) return false;
  if (!state.filter) return true;
  return item.name.toLowerCase().includes(state.filter);
}

function isDrafted(id) { return state.drafted.has(id); }

// After rendering the pool, call this to gray out & disable drafted ones
function refreshPoolDisabled() {

  const ownedVoidIds = getOwnedVoids();

  qa('.pool .item').forEach(btn => {
    const id = btn.dataset.id;
    const drafted = isDrafted(id);
    btn.classList.toggle('disabled', drafted);
    btn.setAttribute('draggable', drafted ? 'false' : 'true');
    btn.setAttribute('aria-disabled', drafted ? 'true' : 'false');
    // clean up
    btn.classList.remove('corrupted-item');

    const itemCheck = {
      id: btn.dataset.id,
      rarity: btn.dataset.rarity
    }

    if(SETTINGS.rerollCorrupted) {
      if(isBlockedByOwnedVoid(itemCheck, ownedVoidIds))
      {
        btn.classList.toggle('corrupted-item');
      }
    }
  });
}

function renderPool() {
  state.poolEl.innerHTML = '';
  ALL_ITEMS.filter(matchesFilters).forEach(item => state.poolEl.append(renderPoolItem(item)));
  refreshPoolDisabled();  // <-- keep pool in sync with drafted set
  refreshTooltips();
}

/** a tile in the pool (click → wiki, drag → copy into draft) */
function renderPoolItem(item) {
  // remove default tooltip
  const card = el('button', { class: 'item', draggable: 'true', 'data-id': item.id, 'data-rarity':item.rarity, 'data-name':item.name,'aria-label': item.name });
  const img = el('img', { alt: item.name });
  const label = el('div', { class: 'label' }, item.name);

  setItemImage(img, item);
  card.append(img, label);

  // Drag (copy) from pool — ignore if already drafted
  card.addEventListener('dragstart', (e) => {
    if (isDrafted(item.id)) { e.preventDefault(); return; }
    e.dataTransfer.setData('text/plain', JSON.stringify({ from: 'pool', id: item.id }));
    e.dataTransfer.effectAllowed = 'copy';
  });

  // Click opens wiki unless disabled
  card.addEventListener('click', () => {
    if (isDrafted(item.id)) return;
    window.open(item.wiki, '_blank', 'noopener');
  });

  return card;
}


/** a tile in the draft (right-click to remove, drag to reorder) */
function renderDraftItem(item) {
  const card = el("div", {
    class: "item",
    draggable: "true",
    "data-id": item.id,
    "data-rarity": item.rarity,
    "aria-label": item.name,
    role: "button",         // helps SRs; div behaves like a button in your UI
    tabIndex: 0             // keyboard focusable
  });
  const img = el("img", { alt: item.name });
  setItemImage(img, item);
  const label = el("div", { class: "label" }, item.name);
  card.append(img, label);

  // Right-click remove
  card.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    removeDraftItem(card);
  });

  // Click → wiki (same as pool)
  card.addEventListener("click", () => window.open(item.wiki, "_blank", "noopener"));

  // Start a “move” drag from inside the draft
  card.addEventListener("dragstart", (e) => {
    const index = [...state.dropzoneEl.children].indexOf(card);
    e.dataTransfer.setData("text/plain", JSON.stringify({ from: "draft", index }));
    e.dataTransfer.effectAllowed = "move";
  });

  return card;
}

/* --------------------------- Draft add/remove ---------------------------- */

function removeDraftItem(node) {
  const rarity = node.dataset.rarity;
  const id = node.dataset.id;
  node.remove();
  state.counts[rarity] = Math.max(0, (state.counts[rarity] || 0) - 1);
  state.drafted.delete(id);        // <-- free it up again
  updateCounts();
  toggleEmptyHint();
  refreshPoolDisabled();           // <-- un-gray in pool
  sortDropzoneItems(state.dropzoneEl);
  refreshTooltips();
}
/** guard: only allow adding if we haven't hit the per-rarity cap */
function canAdd(item) {
  // no duplicates + respect per-rarity cap
  if (isDrafted(item.id)) { return false; }

  // prevent adding white/green already porped up
  if (SETTINGS.rerollCorrupted) {
    if (isBlockedByOwnedVoid(item, getOwnedVoids())) {
      return false;
    }
  }

  return (REQUIREMENTS[item.rarity] ?? 0) > (state.counts[item.rarity] ?? 0);
}

/** add a tile to the draft (optionally at a specific index) */
function addToDraft(item, insertIndex = null) {
  if (!canAdd(item)) return false;

  const card = renderDraftItem(item);
  const children = [...state.dropzoneEl.children];
  if (insertIndex === null || insertIndex < 0 || insertIndex >= children.length)
    state.dropzoneEl.append(card);
  else
    state.dropzoneEl.insertBefore(card, children[insertIndex]);

  state.counts[item.rarity] = (state.counts[item.rarity] || 0) + 1;
  state.drafted.add(item.id);      // <-- mark as used
  updateCounts();
  toggleEmptyHint();
  refreshPoolDisabled();           // <-- gray out in pool
  sortDropzoneItems(state.dropzoneEl);
  refreshTooltips();
  return true;
}

function toggleEmptyHint() {
  if (state.dropzoneEl.children.length === 0) state.dropzoneEl.classList.add("empty");
  else state.dropzoneEl.classList.remove("empty");
}

function getDraftedItems() {
  // Map DOM -> item objects (using itemsById you already build)
  return [...state.dropzoneEl.children]
    .map(el => itemsById[el.dataset.id])
    .filter(Boolean);
}

/**
 * 
 * @returns {Item[]}
 */
function getOwnedVoids() {
  return new Set(
    getDraftedItems()
      .filter(i => i.rarity === 'purple') // your "void" rarity key
      .map(i => i.id)
  );
}

function removeDraftItemAt(index) {
  const node = [...state.dropzoneEl.children][index];
  if (!node) return false;
  removeDraftItem(node);
  return true;
}

function replaceDraftItemAt(index, newItem) {
  // Remove first so canAdd() won't be blocked by duplicate guard
  if (!removeDraftItemAt(index)) {
    return false;
  }

  return addToDraft(newItem, index);
}

/* ---------------------------- Drag & Drop grid --------------------------- */

/**
 * Draft grid DnD:
 * - dragover: allow drop
 * - drop: either copy from pool, or move inside draft
 * - getDropIndex: find the insertion point based on pointer position
 */
function setupDnD() {
  state.dropzoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();                 // required to receive drop events
    e.dataTransfer.dropEffect = "copy"; // UX: shows copy icon from pool
  });

  state.dropzoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
    const afterIndex = getDropIndex(e);
    if (payload.from === "pool") {
      const item = ALL_ITEMS.find((i) => i.id === payload.id);
      if (item) addToDraft(item, afterIndex);
    } else if (payload.from === "draft") {
      // Reordering: move the dragged node to the drop index
      const children = [...state.dropzoneEl.children];
      const node = children[payload.index];
      if (!node) return;
      const ref = children[afterIndex];
      if (!ref) state.dropzoneEl.append(node);
      else state.dropzoneEl.insertBefore(node, ref);
    }
  });
}

/** compute the index where a drop should insert inside the draft grid */
function getDropIndex(e) {
  const children = [...state.dropzoneEl.children];
  for (let i = 0; i < children.length; i++) {
    const r = children[i].getBoundingClientRect();
    if (e.clientY < r.top + r.height / 2) return i; // before halfway point
  }
  return children.length; // append at the end
}

/* ----------------------------- Image handling ---------------------------- */

/**
 * Load item image, cache as dataURL for clean export (avoids CORS taint).
 * If conversion fails (e.g., file:// testing), we fall back to a direct src.
 */
async function setItemImage(imgEl, item) {
  if (state.imagesCache.has(item.id)) {
    imgEl.src = state.imagesCache.get(item.id);
    return;
  }
  try {
    const dataURL = await toDataURL(item.img);
    state.imagesCache.set(item.id, dataURL);
    imgEl.src = dataURL;
  } catch {
    imgEl.src = item.img; // fallback
  }
}

/** fetch image → draw to canvas → get PNG dataURL */
function toDataURL(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // helpful when served over http://localhost
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        resolve(c.toDataURL("image/png"));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    // simple cache-bust query to avoid stale browser cache during dev
    img.src = url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now();
  });
}

/* --------------------------------- Export -------------------------------- */

/**
 * Build a clean, image-only version of the draft grid and pass it to html2canvas,
 * then show a preview dialog and allow the user to download the PNG.
 */
// helper: blob -> data URL (no canvas; no taint)
function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.readAsDataURL(blob);
  });
}

// helper: get data URL for an image src using fetch (same-origin)
async function urlToDataURL(src) {
  // if already a data URL, keep it
  if (typeof src === 'string' && src.startsWith('data:')) return src;
  // fetch same-origin asset; convert to data URL
  const res = await fetch(src, { cache: 'no-store' });
  const blob = await res.blob();
  return blobToDataURL(blob);
}

/**
 * Build a clean, export-ready clone of the draft grid.
 * Returns { container, scratch, cleanup } where:
 *  - container: the styled clone we’ll snapshot
 *  - scratch: off-screen mount
 *  - cleanup(): removes scratch from the DOM
 */
async function buildExportClone() {
  // Clone the visible dropzone so we don’t touch the UI
  const container = state.dropzoneEl.cloneNode(true);

  // Lock width to on-screen size so CSS grid doesn’t collapse to one column
  const rect = state.dropzoneEl.getBoundingClientRect();
  const px = (n) => `${Math.max(0, Math.round(n))}px`;
  Object.assign(container.style, {
    width: px(rect.width),
    maxWidth: px(rect.width),
    boxSizing: 'border-box',
    background: '#0b0e14',
    padding: '16px',
    border: '1px solid #1f2635',
    borderRadius: '12px'
  });

  // Convert each tile to compact, image-only blocks and force <img> to data URLs
  const imgPromises = [];
  container.querySelectorAll('.item').forEach((node) => {
    const origImg = node.querySelector('img');
    const mini = origImg.cloneNode(false);
    node.innerHTML = '';
    Object.assign(mini.style, { width: '96px', height: '96px' });
    node.append(mini);

    Object.assign(node.style, {
      padding: '6px',
      background: '#0e1117',
      border: '1px solid #222b3d'
    });

    // Prefer cached data URLs, otherwise fetch+convert
    const id = node.getAttribute('data-id');
    const cached = id && state.imagesCache.get(id);
    if (cached && typeof cached === 'string' && cached.startsWith('data:')) {
      mini.src = cached;
    } else {
      const src = origImg.currentSrc || origImg.src;
      imgPromises.push(
        urlToDataURL(src).then(dataURL => { mini.src = dataURL; })
          .catch(() => { mini.src = src; }) // last resort
      );
    }
  });

  // Off-screen mount: gives predictable layout/measurements for html2canvas
  const scratch = document.createElement('div');
  Object.assign(scratch.style, {
    position: 'fixed', left: '-10000px', top: '-10000px',
    pointerEvents: 'none', opacity: '0', zIndex: '-1',
    width: container.style.width
  });
  scratch.appendChild(container);
  document.body.appendChild(scratch);

  // Wait until all images in the clone are loaded
  await Promise.all(imgPromises);
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(imgs.map(img => img.complete
    ? Promise.resolve()
    : new Promise(res => { img.onload = img.onerror = res; })
  ));

  return {
    container,
    scratch,
    cleanup() { scratch.remove(); }
  };
}

let _tooltipPoolCtl = null;
let _tipDraftCtl = null;

// Re-attach tooltip listeners to current .item nodes.
// (Pool and Draft re-render dynamically, so we call this after each render/change.)
function refreshTooltips() {
  if (typeof window.enableItemHoverPopups !== 'function') return;
  if (_tooltipPoolCtl && _tooltipPoolCtl.destroy) _tooltipPoolCtl.destroy();
  if (_tipDraftCtl && _tipDraftCtl.destroy) _tipDraftCtl.destroy();

  const pool = document.querySelector("section.panel.pool");
  if (pool && window.enableItemHoverPopups) {
    _tooltipPoolCtl = window.enableItemHoverPopups({
      container: pool,
      selector: '.item[data-id]',
      getId: el => el.dataset.id,
      infoById: window.ITEM_INFO,
      itemsById,
      showDelayMs: 1000   // 
    });
  }

  const draftArea = document.querySelector('section.panel.board');
  if (draftArea && window.enableItemHoverPopups) {
    _tipDraftCtl = window.enableItemHoverPopups({
      container: dropzone,
      selector: '.item[data-id]',
      getId: el => el.dataset.id,
      infoById: window.ITEM_INFO,
      itemsById,
      showDelayMs: 0      // ← immediate here
    });
  }
}


// --- new: Copy PNG to clipboard (no preview dialog) ---
async function copyPNG() {
  // Clipboard image write requires secure context (https or http://localhost) and a user gesture
  if (!('clipboard' in navigator) || typeof ClipboardItem === 'undefined') {
    alert('Clipboard images not supported in this browser. Try Export PNG instead.');
    return;
  }

  const { container, cleanup } = await buildExportClone();

  try {
    // Render the clone to a canvas (2x for crispness)
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false
    });

    // Canvas -> Blob -> ClipboardItem
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) throw new Error('Failed to create PNG blob');

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);

    // Optional: tiny toast
    console.log('Draft image copied to clipboard ✔');
  } finally {
    cleanup();
  }
}

// (optional) keep your existing exportPNG but reuse the same clone helper
async function exportPNG() {
  const { container, cleanup } = await buildExportClone();
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      useCORS: true,
      allowTaint: false,
      logging: false
    });
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `ror2-draft-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    cleanup();
  }
}

/* -------------------------------- Actions -------------------------------- */

/**
 * 
 * @param {RenderedItem} candidate
 * @param {Item[]} ownedVoidIds 
 * @returns 
 */
function isBlockedByOwnedVoid(candidate, ownedVoidIds) {
  if (candidate.rarity !== "white" && candidate.rarity !== "green") return false;

  for (const voidId of ownedVoidIds) {
    const normals = VOID_CORRUPTS[voidId] || [];
    if (normals.includes(candidate.id)) return true;
  }

  return false;
}

/** Fill the draft randomly based on current requirements (duplicates allowed). */
function randomize() {
  clearDraft();
  const byRarity = r => ALL_ITEMS.filter(i => i.rarity === r && !isDrafted(i.id));
  Object.keys(REQUIREMENTS).forEach(r => {
    const need = REQUIREMENTS[r] || 0;
    if (need <= 0) return;
    const pool = byRarity(r).slice();           // shallow copy
    // pick without replacement up to "need"
    for (let i = 0; i < need && pool.length; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      const pick = pool.splice(idx, 1)[0];
      addToDraft(pick);
    }
  });

  if (SETTINGS.rerollCorrupted) {
    rerollCorruptedPicks(10);
  }
}

function rerollCorruptedPicks(maxPasses = 10) {
  // What void items do we already own in the draft?
  const ownedVoidIds = new Set(
    getDraftedItems()
      .filter(i => i.rarity === 'purple') // your "void" rarity key
      .map(i => i.id)
  );

  for (let pass = 0; pass < maxPasses; pass++) {
    let changed = false;

    // Snapshot indices so DOM mutations won't break our iteration
    const draftedNow = getDraftedItems();
    draftedNow.forEach((item, idx) => {
      // Only whites/greens are blocked; isBlocked… already encodes that
      if (isBlockedByOwnedVoid(item, ownedVoidIds)) {
        console.log('Rerolling', item);
        // Find a same-rarity candidate that isn't drafted and isn't blocked
        const candidatePool = ALL_ITEMS.filter(i =>
          i.rarity === item.rarity &&
          !isDrafted(i.id) &&
          !isBlockedByOwnedVoid(i, ownedVoidIds)
        );

        if (candidatePool.length > 0) {
          const replacement = candidatePool[Math.floor(Math.random() * candidatePool.length)];
          console.log('rerolled to', replacement);
          if (replaceDraftItemAt(idx, replacement)) {
            changed = true;
          }
        }
      }
    });

    if (!changed) break; // done early if nothing to fix this pass
  }
}

/** Remove everything from the draft and reset counts. */
function clearDraft() {
  state.dropzoneEl.innerHTML = '';
  state.counts = { white: 0, green: 0, red: 0, yellow: 0, purple: 0 };
  state.drafted.clear();           // <-- reset drafted IDs
  updateCounts();
  toggleEmptyHint();
  refreshPoolDisabled();           // <-- re-enable pool items
}

function sortDropzoneItems(dropzoneEl) {
  const rarityOrder = ['white', 'green', 'red', 'yellow', 'purple'];

  const items = Array.from(dropzoneEl.querySelectorAll('.item'));

  items.sort((a, b) => {
    const rarityA = a.getAttribute('data-rarity');
    const rarityB = b.getAttribute('data-rarity');

    const rarityDiff = rarityOrder.indexOf(rarityA) - rarityOrder.indexOf(rarityB);
    if (rarityDiff !== 0) return rarityDiff;

    const nameA = a.querySelector('.label')?.textContent.trim().toLowerCase() || '';
    const nameB = b.querySelector('.label')?.textContent.trim().toLowerCase() || '';
    return nameA.localeCompare(nameB);
  });

  // Clear and re-append sorted items
  dropzoneEl.innerHTML = '';
  items.forEach(item => dropzoneEl.appendChild(item));
}


/* ---------------------------------- Boot --------------------------------- */

function init() {
  state.poolEl = q("#pool");
  state.dropzoneEl = q("#dropzone");

  // Requirements UI (load saved, wire Save button)
  setupRequirements();
  setupRerollToggle();

  // Tabs: switch current rarity and re-render pool
  qa(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      qa(".tab").forEach((t) => (t.dataset.active = "false"));
      tab.dataset.active = "true";
      state.rarity = tab.dataset.rarity;
      renderPool();
    });
  });

  // Live search
  q("#filter").addEventListener("input", (e) => {
    state.filter = e.target.value.trim().toLowerCase();
    renderPool();
  });

  // Top buttons
  q("#exportBtn").addEventListener("click", exportPNG);
  q("#randomBtn").addEventListener("click", randomize);
  q("#clearBtn").addEventListener("click", clearDraft);
  q("#copyBtn").addEventListener("click", copyPNG);

  // Draft drag/drop
  setupDnD();

  // First render
  renderPool();
  refreshPoolDisabled();
  refreshTooltips();
}


// Ensure the DOM is ready (items.js must load before this file)
document.addEventListener("DOMContentLoaded", init);
