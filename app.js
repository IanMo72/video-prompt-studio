'use strict';

// ── Data ─────────────────────────────────────────────────────────────────────
//
// All option lists live here. To add entries to any selector, append strings
// to the relevant array. New selectors: copy the pattern below and add a
// matching <select> in index.html + a clause in compilePrompt().

const MODELS = [
  { id: 'seedance-2-enhanced',     label: 'Seedance 2.0 Enhanced',     modes: ['t2v'] },
  { id: 'seedance-2-enhanced-r2v', label: 'Seedance 2.0 Enhanced R2V', modes: ['i2v'] },
  { id: 'wan-2.7',                 label: 'WAN 2.7',                   modes: ['t2v', 'i2v'] },
  // extend here — { id: 'model-id', label: 'Display name', modes: ['t2v'] }
];

const DURATIONS = ['5s', '10s', '15s'];

const CAMERA_MOVES = [
  'Static',
  'Slow push-in',
  'Slow pull-back',
  'Arc left',
  'Arc right',
  'Crane up',
  'Crane down',
  'Dutch tilt',
  'Handheld',
  'Pan left',
  'Pan right',
  'Tilt up',
  'Tilt down',
  'Dolly zoom (Vertigo)',
  'Tracking shot',
  'Overhead drone descent',
  // extend here
];

const LIGHTING = [
  'Natural daylight',
  'Golden hour',
  'Blue hour / dusk',
  'Overcast soft light',
  'Studio three-point',
  'High-contrast noir',
  'Soft diffused',
  'Neon-lit',
  'Candlelight',
  'Backlit silhouette',
  'Moonlight',
  'Practical lamps only',
  // extend here
];

const STYLES = [
  'Cinematic realism',
  'Documentary handheld',
  'Film noir',
  'Anime cel-shaded',
  'Oil painting motion',
  'Watercolour wash',
  'Cyberpunk neon',
  'Lo-fi VHS tape',
  '8mm film grain',
  'Hyperrealistic CGI',
  'Impressionist brushwork',
  'Gritty neo-noir',
  // extend here
];

// User-defined selector lists. Each entry becomes an option in the
// corresponding <select> in index.html. Add a matching clause in
// compilePrompt() if you add a new list here.
//
// Example for a new "Wardrobe" selector:
//   const WARDROBE = ['Formal suit', 'Casual', /* extend here */];
//   Then in index.html add a <select id="wardrobe-select"> section,
//   and in compilePrompt() add:
//     clauses.push({ key: 'Wardrobe', value: elWardrobe.value ? `Wardrobe: ${elWardrobe.value}.` : '' });

// ── State ─────────────────────────────────────────────────────────────────────

let timelineEvents = [];   // { id, ts, event, dialogue }
let nextEventId = 1;
let debugVisible = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

const elModel         = $('model-select');
const elMode          = $('mode-select');
const elDuration      = $('duration-select');
const elShot          = $('shot-textarea');
const elContext       = $('context-textarea');
const elCamera        = $('camera-select');
const elLighting      = $('lighting-select');
const elStyle         = $('style-select');
const elNoCuts        = $('no-cuts-toggle');
const elTimelineList  = $('timeline-list');
const elAddEvent      = $('add-event-btn');
const elOutput        = $('output-prompt');
const elCopyBtn       = $('copy-btn');
const elDebugBtn      = $('debug-btn');
const elDebugPanel    = $('debug-panel');
const elDebugList     = $('debug-list');
const elCharCount     = $('char-count');
const elWordCount     = $('word-count');
const elPresetSelect  = $('preset-select');
const elPresetName    = $('preset-name');
const elSavePreset    = $('save-preset-btn');
const elLoadPreset    = $('load-preset-btn');
const elDeletePreset  = $('delete-preset-btn');
const elDirectives    = $('directives-textarea');
const elCopyFlash     = $('copy-flash');

// ── Pure text helpers ─────────────────────────────────────────────────────────

function cleanPart(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().replace(/\s+/g, ' ').replace(/\.+$/, '');
}

function joinLines(...parts) {
  return parts
    .map(cleanPart)
    .filter(Boolean)
    .join('. ') + (parts.some(p => cleanPart(p)) ? '.' : '');
}

function compileTimeline(events) {
  if (!events.length) return '';
  return events
    .map(ev => {
      const ts   = cleanPart(ev.ts);
      const text = cleanPart(ev.event);
      const dial = cleanPart(ev.dialogue);
      if (!text) return '';
      const parts = [];
      if (ts) parts.push(`[${ts}]`);
      parts.push(text);
      if (dial) parts.push(`"${dial}"`);
      return parts.join(' ');
    })
    .filter(Boolean)
    .join(' / ');
}

function compilePrompt() {
  const model    = elModel.value;
  const mode     = elMode.value;
  const duration = elDuration.value;
  const shot     = cleanPart(elShot.value);
  const context  = cleanPart(elContext.value);
  const camera   = elCamera.value;
  const lighting = elLighting.value;
  const style    = elStyle.value;
  const noCuts   = elNoCuts.checked;
  const timeline = compileTimeline(timelineEvents);
  const isI2V    = mode === 'i2v';

  const clauses = [];

  // Preamble
  const modelLabel = MODELS.find(m => m.id === model)?.label ?? model;
  const modeLabel  = isI2V ? 'image-to-video' : 'text-to-video';
  clauses.push({ key: 'Preamble', value: `${modeLabel.charAt(0).toUpperCase() + modeLabel.slice(1)} prompt — ${modelLabel}, ${duration}.` });

  // Shot setup
  clauses.push({ key: 'Shot setup', value: shot });

  // Character / context
  clauses.push({ key: 'Character / context', value: context });

  // Timeline
  clauses.push({ key: 'Timeline', value: timeline });

  // Camera
  clauses.push({ key: 'Camera', value: camera ? `Camera: ${camera}.` : '' });

  // Lighting (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Lighting', value: lighting ? `Lighting: ${lighting}.` : '' });
  }

  // Style (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Style', value: style ? `Visual style: ${style}.` : '' });
  }

  // No cuts
  if (noCuts) {
    clauses.push({ key: 'Continuity', value: 'Single continuous shot. No cuts.' });
  }

  // Additional directives — emitted verbatim, no transformation applied
  const directives = elDirectives.value.trim();
  clauses.push({ key: 'Additional directives', value: directives });

  // Assemble
  const prompt = clauses
    .filter(c => c.value)
    .map(c => c.value)
    .join(' ');

  return { prompt, clauses };
}

// ── UI update ─────────────────────────────────────────────────────────────────

function update() {
  const { prompt, clauses } = compilePrompt();
  elOutput.value = prompt;

  const chars = prompt.length;
  const words = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  elCharCount.textContent = `${chars} chars`;
  elWordCount.textContent = `${words} words`;

  renderDebug(clauses);
}

function renderDebug(clauses) {
  elDebugList.innerHTML = '';
  for (const { key, value } of clauses) {
    const row = document.createElement('div');
    const active = Boolean(value);
    row.className = `debug-clause ${active ? 'active' : 'empty'}`;
    row.innerHTML = `
      <span class="debug-key">${key}</span>
      ${active
        ? `<span class="debug-value">${escapeHtml(value)}</span>`
        : `<span class="debug-empty">— omitted —</span>`}
    `;
    elDebugList.appendChild(row);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Model / mode sync ─────────────────────────────────────────────────────────

function syncModelMode() {
  const modelDef = MODELS.find(m => m.id === elModel.value);
  if (!modelDef) return;

  const modeOpts = elMode.querySelectorAll('option');
  let modeChanged = false;
  modeOpts.forEach(opt => {
    const allowed = modelDef.modes.includes(opt.value);
    opt.disabled = !allowed;
    if (!allowed && opt.selected) modeChanged = true;
  });

  // If current mode is now invalid, pick first valid one
  if (modeChanged || !modelDef.modes.includes(elMode.value)) {
    elMode.value = modelDef.modes[0];
  }

  applyModeClass();
  update();
}

function applyModeClass() {
  document.body.classList.toggle('mode-i2v', elMode.value === 'i2v');
}

// ── Timeline editor ───────────────────────────────────────────────────────────

function renderTimeline() {
  elTimelineList.innerHTML = '';
  timelineEvents.forEach(ev => {
    const row = document.createElement('div');
    row.className = 'timeline-event';
    row.dataset.id = ev.id;

    row.innerHTML = `
      <input class="timeline-ts" type="text" placeholder="00:00" value="${escapeHtml(ev.ts)}" maxlength="8" title="Timestamp (e.g. 00:03)">
      <input type="text" placeholder="Event description…" value="${escapeHtml(ev.event)}">
      <input type="text" placeholder='Dialogue (optional)…' value="${escapeHtml(ev.dialogue)}">
      <button class="btn-danger del-btn" title="Remove">✕</button>
    `;

    const [tsIn, eventIn, dialIn] = row.querySelectorAll('input');
    const delBtn = row.querySelector('.del-btn');

    tsIn.addEventListener('input',   () => { ev.ts       = tsIn.value;   update(); });
    eventIn.addEventListener('input',() => { ev.event    = eventIn.value; update(); });
    dialIn.addEventListener('input', () => { ev.dialogue = dialIn.value; update(); });
    delBtn.addEventListener('click', () => {
      timelineEvents = timelineEvents.filter(e => e.id !== ev.id);
      renderTimeline();
      update();
    });

    elTimelineList.appendChild(row);
  });
}

function addTimelineEvent() {
  timelineEvents.push({ id: nextEventId++, ts: '', event: '', dialogue: '' });
  renderTimeline();
  // Focus the new event input
  const rows = elTimelineList.querySelectorAll('.timeline-event');
  if (rows.length) {
    const inputs = rows[rows.length - 1].querySelectorAll('input');
    if (inputs[0]) inputs[0].focus();
  }
}

// ── Copy ──────────────────────────────────────────────────────────────────────

async function copyPrompt() {
  const text = elOutput.value;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    elOutput.select();
    document.execCommand('copy');
  }
  showCopyFlash();
}

function showCopyFlash() {
  elCopyFlash.classList.add('show');
  setTimeout(() => elCopyFlash.classList.remove('show'), 2000);
}

// ── Debug panel ───────────────────────────────────────────────────────────────

function toggleDebug() {
  debugVisible = !debugVisible;
  elDebugPanel.classList.toggle('visible', debugVisible);
  elDebugBtn.textContent = debugVisible ? '🔎 Hide debug' : '🔎 Debug clauses';
}

// ── Presets ───────────────────────────────────────────────────────────────────

const PRESET_KEY = 'vps_presets_v1';

function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || {}; }
  catch { return {}; }
}

function savePresets(presets) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(presets));
}

function refreshPresetList() {
  const presets = loadPresets();
  const names = Object.keys(presets).sort();
  elPresetSelect.innerHTML = '<option value="">— select preset —</option>' +
    names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

function savePreset() {
  const name = elPresetName.value.trim();
  if (!name) { elPresetName.focus(); return; }

  const presets = loadPresets();
  presets[name] = getFormState();
  savePresets(presets);
  refreshPresetList();
  elPresetSelect.value = name;
  elPresetName.value = '';
  showFlash(`Preset "${name}" saved.`);
}

function loadPreset() {
  const name = elPresetSelect.value;
  if (!name) return;
  const presets = loadPresets();
  const state = presets[name];
  if (!state) return;
  applyFormState(state);
  showFlash(`Preset "${name}" loaded.`);
}

function deletePreset() {
  const name = elPresetSelect.value;
  if (!name) return;
  const presets = loadPresets();
  delete presets[name];
  savePresets(presets);
  refreshPresetList();
  showFlash(`Preset "${name}" deleted.`);
}

function getFormState() {
  return {
    model:    elModel.value,
    mode:     elMode.value,
    duration: elDuration.value,
    shot:     elShot.value,
    context:  elContext.value,
    camera:   elCamera.value,
    lighting: elLighting.value,
    style:    elStyle.value,
    noCuts:      elNoCuts.checked,
    directives:  elDirectives.value,
    timeline: JSON.parse(JSON.stringify(timelineEvents)),
    nextId:   nextEventId,
  };
}

function applyFormState(state) {
  if (state.model)    elModel.value    = state.model;
  if (state.mode)     elMode.value     = state.mode;
  if (state.duration) elDuration.value = state.duration;
  elShot.value     = state.shot     ?? '';
  elContext.value  = state.context  ?? '';
  if (state.camera)   elCamera.value   = state.camera;
  if (state.lighting) elLighting.value = state.lighting;
  if (state.style)    elStyle.value    = state.style;
  elNoCuts.checked      = state.noCuts ?? false;
  elDirectives.value    = state.directives ?? '';

  timelineEvents = state.timeline ?? [];
  nextEventId    = state.nextId   ?? (timelineEvents.length + 1);

  syncModelMode();
  renderTimeline();
  update();
}

function showFlash(msg) {
  elCopyFlash.textContent = msg;
  elCopyFlash.classList.add('show');
  setTimeout(() => {
    elCopyFlash.classList.remove('show');
    setTimeout(() => { elCopyFlash.textContent = 'Copied!'; }, 300);
  }, 2000);
}

// ── Populate selects ──────────────────────────────────────────────────────────

function populateModels() {
  MODELS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.label;
    elModel.appendChild(opt);
  });
}

function populateSelect(el, items) {
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    el.appendChild(opt);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  populateModels();
  populateSelect(elCamera,   CAMERA_MOVES);
  populateSelect(elLighting, LIGHTING);
  populateSelect(elStyle,    STYLES);

  // Event listeners
  elModel.addEventListener('change', syncModelMode);
  elMode.addEventListener('change', () => { applyModeClass(); update(); });
  elDuration.addEventListener('change', update);
  elShot.addEventListener('input', update);
  elContext.addEventListener('input', update);
  elCamera.addEventListener('change', update);
  elLighting.addEventListener('change', update);
  elStyle.addEventListener('change', update);
  elNoCuts.addEventListener('change', update);
  elDirectives.addEventListener('input', update);

  elAddEvent.addEventListener('click', addTimelineEvent);
  elCopyBtn.addEventListener('click', copyPrompt);
  elDebugBtn.addEventListener('click', toggleDebug);

  elSavePreset.addEventListener('click', savePreset);
  elLoadPreset.addEventListener('click', loadPreset);
  elDeletePreset.addEventListener('click', deletePreset);

  // Allow saving preset with Enter in name field
  elPresetName.addEventListener('keydown', e => { if (e.key === 'Enter') savePreset(); });

  refreshPresetList();
  syncModelMode();
  renderTimeline();
  update();
}

document.addEventListener('DOMContentLoaded', init);
