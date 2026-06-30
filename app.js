'use strict';

// ── Data ─────────────────────────────────────────────────────────────────────
//
// All option lists live here. To add entries to any selector, append strings
// to the relevant array. New selectors: copy the pattern below and add a
// matching <select> in index.html + a clause in compilePrompt().

// Fallback model list — used when no API key is set.
// IDs here are best-guess; the live list from /models?type=video overrides these.
// Modes: 't2v' = Text to Video, 'i2v' = Image to Video, 'v2v' = Video to Video
const MODELS = [
  // ── Text to Video ─────────────────────────────────────────────
  { id: 'seedance-2-0-enhanced',           label: 'Seedance 2.0 Enhanced (T2V)',    modes: ['t2v'] },
  { id: 'wan-2-7-uncensored',              label: 'Wan 2.7 Uncensored (T2V)',       modes: ['t2v'] },
  { id: 'seedance-2-0',                    label: 'Seedance 2.0',                   modes: ['t2v', 'i2v'] },
  { id: 'wan-2-7',                         label: 'Wan 2.7',                        modes: ['t2v', 'i2v'] },
  { id: 'kling-o3-pro',                    label: 'Kling O3 Pro',                   modes: ['t2v', 'i2v'] },
  { id: 'seedance-2-0-mini',               label: 'Seedance 2.0 Mini',              modes: ['t2v', 'i2v'] },
  // ── Image to Video ────────────────────────────────────────────
  { id: 'seedance-2-0-enhanced-i2v',       label: 'Seedance 2.0 Enhanced (I2V)',    modes: ['i2v'] },
  { id: 'wan-2-7-reference',               label: 'Wan 2.7 Reference',              modes: ['i2v'] },
  { id: 'seedance-2-0-r2v',               label: 'Seedance 2.0 R2V',               modes: ['i2v'] },
  { id: 'seedance-2-0-mini-r2v',          label: 'Seedance 2.0 Mini R2V',          modes: ['i2v'] },
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
  'Compound move',
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
  'Artificial lighting',
  'Firelight',
  'Fluorescent lighting',
  'Mixed lighting',
  'Top lighting',
  'Underlighting',
  'Edge lighting',
  'Low-contrast lighting',
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

const SHOT_SIZES = [
  'Extreme close-up',
  'Close-up',
  'Medium close-up',
  'Medium shot',
  'Medium wide shot',
  'Wide shot',
  // extend here
];

const COMPOSITIONS = [
  'Center composition',
  'Balanced composition',
  'Left/right weighted composition',
  'Symmetrical composition',
  'Short-side composition',
  // extend here
];

const CAMERA_ANGLES = [
  'Eye level',
  'Over-the-shoulder',
  'High angle',
  'Low angle',
  'Dutch angle',
  'Aerial shot',
  // extend here
];

const LENSES = [
  'Medium lens',
  'Wide lens',
  'Long-focus lens',
  'Telephoto lens',
  'Fisheye lens',
  // extend here
];

const COLOR_TONES = [
  'Warm colors',
  'Cool colors',
  'Saturated colors',
  'Desaturated colors',
  // extend here
];

const CHARACTER_EMOTIONS = [
  'Happy',
  'Sad',
  'Angry',
  'Fearful',
  'Surprised',
  'Nervous',
  'Shy',
  'Confident',
  'Relaxed',
  // extend here
];

const TIMES_OF_DAY = [
  'Dawn',
  'Sunrise',
  'Daytime',
  'Dusk',
  'Sunset',
  'Night',
  // extend here
];

// Text model used for script assistance — update if Venice bumps the version
const ASSIST_MODEL = 'venice-uncensored-1-2';

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

let timelineEvents  = [];  // { id, ts, event, dialogue }
let nextEventId     = 1;
let debugVisible    = false;
let liveApiModels   = null; // set after key validation

let characters      = [];  // { id, name, desc, prompt, tags[] }
let selectedCharIds = new Set();
let editingCharId   = null;

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
const elShotSize      = $('shot-size-select');
const elComposition   = $('composition-select');
const elCameraAngle   = $('camera-angle-select');
const elLens          = $('lens-select');
const elColorTone     = $('color-tone-select');
const elCharEmotion   = $('char-emotion-select');
const elTimeOfDay     = $('time-of-day-select');
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

// ── Character library ─────────────────────────────────────────────────────────

const CHAR_STORE = 'vps_characters_v1';

function loadCharacters() {
  try { return JSON.parse(localStorage.getItem(CHAR_STORE)) || []; }
  catch { return []; }
}

function saveCharacters() {
  localStorage.setItem(CHAR_STORE, JSON.stringify(characters));
}

function renderCharacterList() {
  const grid = $('char-grid');
  const info = $('char-selection-info');
  grid.innerHTML = '';

  if (!characters.length) {
    grid.innerHTML = '<div class="char-empty">No characters yet — click + New to add one.</div>';
    info.textContent = '';
    return;
  }

  characters.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'char-card' + (selectedCharIds.has(ch.id) ? ' selected' : '');
    card.dataset.id = ch.id;

    const tagsHtml = ch.tags.length
      ? ch.tags.map(t => `<span class="char-tag">${escapeHtml(t)}</span>`).join('')
      : '';

    card.innerHTML = `
      <div class="char-name">${escapeHtml(ch.name)}</div>
      ${ch.desc ? `<div class="char-desc">${escapeHtml(ch.desc)}</div>` : ''}
      ${tagsHtml ? `<div class="char-tags">${tagsHtml}</div>` : ''}
      <button class="char-edit-btn" title="Edit character">✎</button>
    `;

    card.addEventListener('click', e => {
      if (e.target.classList.contains('char-edit-btn')) return;
      toggleCharacter(ch.id);
    });
    card.querySelector('.char-edit-btn').addEventListener('click', () => openCharEditor(ch.id));

    grid.appendChild(card);
  });

  const n = selectedCharIds.size;
  info.textContent = n ? `${n} character${n > 1 ? 's' : ''} selected` : '';
}

function toggleCharacter(id) {
  if (selectedCharIds.has(id)) selectedCharIds.delete(id);
  else selectedCharIds.add(id);
  renderCharacterList();
  update();
}

function openCharEditor(id) {
  const modal     = $('char-modal');
  const titleEl   = $('char-modal-title');
  const nameIn    = $('char-name-input');
  const descIn    = $('char-desc-input');
  const promptIn  = $('char-prompt-input');
  const tagsIn    = $('char-tags-input');
  const deleteBtn = $('char-delete-btn');

  if (id) {
    const ch = characters.find(c => c.id === id);
    if (!ch) return;
    editingCharId = id;
    titleEl.textContent = 'Edit Character';
    nameIn.value   = ch.name;
    descIn.value   = ch.desc;
    promptIn.value = ch.prompt;
    tagsIn.value   = ch.tags.join(', ');
    deleteBtn.classList.remove('hidden');
  } else {
    editingCharId = null;
    titleEl.textContent = 'Add Character';
    nameIn.value   = '';
    descIn.value   = '';
    promptIn.value = '';
    tagsIn.value   = '';
    deleteBtn.classList.add('hidden');
  }

  modal.classList.add('open');
  nameIn.focus();
}

function closeCharModal() {
  $('char-modal').classList.remove('open');
  editingCharId = null;
}

function saveCharEditor() {
  const name = $('char-name-input').value.trim();
  if (!name) { $('char-name-input').focus(); return; }

  const entry = {
    id:     editingCharId ?? `ch_${Date.now()}`,
    name,
    desc:   $('char-desc-input').value.trim(),
    prompt: $('char-prompt-input').value.trim(),
    tags:   $('char-tags-input').value.split(',').map(t => t.trim()).filter(Boolean),
  };

  if (editingCharId) {
    const idx = characters.findIndex(c => c.id === editingCharId);
    if (idx !== -1) characters[idx] = entry;
  } else {
    characters.push(entry);
  }

  saveCharacters();
  closeCharModal();
  renderCharacterList();
  update();
}

function deleteCharacter() {
  if (!editingCharId) return;
  if (!confirm(`Delete character "${characters.find(c => c.id === editingCharId)?.name}"?`)) return;
  characters = characters.filter(c => c.id !== editingCharId);
  selectedCharIds.delete(editingCharId);
  saveCharacters();
  closeCharModal();
  renderCharacterList();
  update();
}

function exportCharacters() {
  if (!characters.length) { showFlash('No characters to export.'); return; }
  const blob = new Blob([JSON.stringify(characters, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: 'vps-characters.json' });
  a.click();
  URL.revokeObjectURL(url);
}

function importCharacters() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error('Expected a JSON array');
        const merged = [...characters];
        let added = 0;
        imported.forEach(ch => {
          if (!ch.id || !ch.name) return;
          if (!merged.find(c => c.id === ch.id)) { merged.push(ch); added++; }
        });
        characters = merged;
        saveCharacters();
        renderCharacterList();
        showFlash(`Imported ${added} character${added !== 1 ? 's' : ''}.`);
      } catch (err) {
        showFlash(`Import error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  });
  input.click();
}

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
  const charPrompts = characters
    .filter(c => selectedCharIds.has(c.id) && c.prompt)
    .map(c => cleanPart(c.prompt))
    .join(' ');
  const context  = [charPrompts, cleanPart(elContext.value)].filter(Boolean).join(' ');
  const camera      = elCamera.value;
  const lighting    = elLighting.value;
  const style       = elStyle.value;
  const shotSize    = elShotSize.value;
  const composition = elComposition.value;
  const cameraAngle = elCameraAngle.value;
  const lens        = elLens.value;
  const colorTone   = elColorTone.value;
  const charEmotion = elCharEmotion.value;
  const timeOfDay    = elTimeOfDay.value;
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

  // Camera angle (both modes)
  clauses.push({ key: 'Camera angle', value: cameraAngle ? `Camera angle: ${cameraAngle}.` : '' });

  // Character emotion (both modes)
  clauses.push({ key: 'Character emotion', value: charEmotion ? `Emotion: ${charEmotion}.` : '' });

  // Lighting (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Lighting', value: lighting ? `Lighting: ${lighting}.` : '' });
  }

  // Style (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Style', value: style ? `Visual style: ${style}.` : '' });
  }

  // Shot size (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Shot size', value: shotSize ? `Shot size: ${shotSize}.` : '' });
  }

  // Composition (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Composition', value: composition ? `Composition: ${composition}.` : '' });
  }

  // Lens (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Lens', value: lens ? `Lens: ${lens}.` : '' });
  }

  // Color tone (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Color tone', value: colorTone ? `Color tone: ${colorTone}.` : '' });
  }

  // Time of day (T2V only)
  if (!isI2V) {
    clauses.push({ key: 'Time of day', value: timeOfDay ? `Time of day: ${timeOfDay}.` : '' });
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
  const modelId  = elModel.value;
  const modelDef = MODELS.find(m => m.id === modelId);

  if (modelDef) {
    // Static MODELS definition — authoritative mode list
    const modeOpts = elMode.querySelectorAll('option');
    let modeChanged = false;
    modeOpts.forEach(opt => {
      const allowed = modelDef.modes.includes(opt.value);
      opt.disabled = !allowed;
      if (!allowed && opt.selected) modeChanged = true;
    });
    if (modeChanged || !modelDef.modes.includes(elMode.value)) {
      elMode.value = modelDef.modes[0];
    }
  } else if (liveApiModels) {
    // Live API model — infer mode from ID heuristic
    const isI2VOnly = /r2v|i2v|image.to.video/i.test(modelId);
    elMode.querySelectorAll('option').forEach(opt => {
      opt.disabled = isI2VOnly && opt.value !== 'i2v';
    });
    if (isI2VOnly && elMode.value !== 'i2v') elMode.value = 'i2v';
  }

  applyModeClass();
  updateSegControl();
  update();
}

function applyModeClass() {
  document.body.classList.toggle('mode-i2v', elMode.value === 'i2v');
}

// ── Test / Final toggle ───────────────────────────────────────────────────────

function setModelByRole(role) {
  const options = Array.from(elModel.options);
  let target;
  if (role === 'test') {
    // Prefer WAN uncensored, fall back to any WAN
    target = options.find(o => /wan/i.test(o.value) && /uncensored/i.test(o.value))
          ?? options.find(o => /wan/i.test(o.value));
  } else {
    // Prefer Seedance R2V, fall back to any Seedance
    target = options.find(o => /seedance/i.test(o.value) && /r2v/i.test(o.value))
          ?? options.find(o => /seedance/i.test(o.value));
  }
  if (target) { elModel.value = target.value; syncModelMode(); }
}

function updateSegControl() {
  const val     = elModel.value.toLowerCase();
  const isTest  = /wan/.test(val);
  const isFinal = /seedance/.test(val);
  elTestModeBtn.classList.toggle('active', isTest);
  elFinalModeBtn.classList.toggle('active', isFinal);
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
    shotSize:    elShotSize.value,
    composition: elComposition.value,
    cameraAngle: elCameraAngle.value,
    lens:        elLens.value,
    colorTone:   elColorTone.value,
    charEmotion: elCharEmotion.value,
    timeOfDay:   elTimeOfDay.value,
    noCuts:      elNoCuts.checked,
    directives:  elDirectives.value,
    timeline:     JSON.parse(JSON.stringify(timelineEvents)),
    nextId:       nextEventId,
    selectedChars: [...selectedCharIds],
  };
}

function applyFormState(state) {
  if (state.model)    elModel.value    = state.model;
  if (state.mode)     elMode.value     = state.mode;
  if (state.duration) elDuration.value = state.duration;
  elShot.value     = state.shot     ?? '';
  elContext.value  = state.context  ?? '';
  if (state.camera)      elCamera.value      = state.camera;
  if (state.lighting)    elLighting.value    = state.lighting;
  if (state.style)       elStyle.value       = state.style;
  if (state.shotSize)    elShotSize.value    = state.shotSize;
  if (state.composition) elComposition.value = state.composition;
  if (state.cameraAngle) elCameraAngle.value = state.cameraAngle;
  if (state.lens)        elLens.value        = state.lens;
  if (state.colorTone)   elColorTone.value   = state.colorTone;
  if (state.charEmotion) elCharEmotion.value = state.charEmotion;
  if (state.timeOfDay)   elTimeOfDay.value   = state.timeOfDay;
  elNoCuts.checked      = state.noCuts ?? false;
  elDirectives.value    = state.directives ?? '';

  timelineEvents = state.timeline ?? [];
  nextEventId    = state.nextId   ?? (timelineEvents.length + 1);
  selectedCharIds = new Set(state.selectedChars ?? []);

  syncModelMode();
  renderTimeline();
  renderCharacterList();
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

// ── Shot setup presets ────────────────────────────────────────────────────────

const SHOT_PRESET_KEY = 'vps_shot_presets_v1';

function loadShotPresets() {
  try { return JSON.parse(localStorage.getItem(SHOT_PRESET_KEY)) || {}; }
  catch { return {}; }
}

function saveShotPresets(presets) {
  localStorage.setItem(SHOT_PRESET_KEY, JSON.stringify(presets));
}

function refreshShotPresetList() {
  const sel   = $('shot-preset-select');
  const names = Object.keys(loadShotPresets()).sort();
  sel.innerHTML = '<option value="">— shot presets —</option>' +
    names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
}

function saveShotPreset() {
  const name = $('shot-preset-name').value.trim();
  if (!name) { $('shot-preset-name').focus(); return; }
  const presets = loadShotPresets();
  presets[name] = elShot.value;
  saveShotPresets(presets);
  refreshShotPresetList();
  $('shot-preset-select').value = name;
  $('shot-preset-name').value = '';
  showFlash(`Shot preset "${name}" saved.`);
}

function loadShotPreset() {
  const name = $('shot-preset-select').value;
  if (!name) return;
  const text = loadShotPresets()[name];
  if (text === undefined) return;
  elShot.value = text;
  update();
  showFlash(`Shot preset "${name}" loaded.`);
}

function deleteShotPreset() {
  const name = $('shot-preset-select').value;
  if (!name) return;
  const presets = loadShotPresets();
  delete presets[name];
  saveShotPresets(presets);
  refreshShotPresetList();
  showFlash(`Shot preset "${name}" deleted.`);
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

// ── API — refs ────────────────────────────────────────────────────────────────

const elTestModeBtn    = $('test-mode-btn');
const elFinalModeBtn   = $('final-mode-btn');
const elSettingsBtn    = $('settings-btn');
const elSettingsModal  = $('settings-modal');
const elCloseSettings  = $('close-settings-btn');
const elApiKeyInput    = $('api-key-input');
const elSaveKeyBtn     = $('save-key-btn');
const elClearKeyBtn    = $('clear-key-btn');
const elKeyDot         = $('key-dot');
const elKeyStatusText  = $('key-status-text');
const elKeyIndicator   = $('key-indicator');
const elImageUrl       = $('image-url-input');
const elImagePreviewC  = $('image-preview-container');
const elImagePreview   = $('image-preview');
const elImageDesc      = $('image-desc-textarea');
const elSuggestBtn     = $('suggest-btn');
const elSuggestStatus  = $('suggest-status');
const elRefineBtn         = $('refine-btn');
const elRefineModal       = $('refine-modal');
const elRefineModalClose  = $('refine-modal-close');
const elRefineTargetLabel = $('refine-target-label');
const elRefineInstruction = $('refine-instruction');
const elRefineCurrent     = $('refine-current');
const elRefineSuggested   = $('refine-suggested');
const elRefineStatus      = $('refine-status');
const elRefineCancelBtn   = $('refine-cancel-btn');
const elRefineGenerateBtn = $('refine-generate-btn');
const elRefineAcceptBtn   = $('refine-accept-btn');
const elNegativePrompt = $('negative-prompt');
const elAspectRatio    = $('aspect-ratio-select');
const elResolution     = $('resolution-select');
const elQuoteBtn       = $('quote-btn');
const elQuoteDisplay   = $('quote-display');
const elGenerateBtn    = $('generate-btn');
const elGenStatus      = $('gen-status');
const elGenVideo       = $('gen-video');

// ── API — helpers ─────────────────────────────────────────────────────────────

const API_KEY_STORE = 'vps_api_key_v1';
const VENICE_BASE   = 'https://api.venice.ai/api/v1';

function getApiKey()      { return localStorage.getItem(API_KEY_STORE) ?? ''; }
function storeApiKey(key) {
  if (key) localStorage.setItem(API_KEY_STORE, key);
  else     localStorage.removeItem(API_KEY_STORE);
}

function apiHeaders() {
  return {
    'Authorization': `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

async function venicePost(path, body) {
  return fetch(`${VENICE_BASE}${path}`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  });
}

async function veniceGet(path) {
  return fetch(`${VENICE_BASE}${path}`, { headers: apiHeaders() });
}

// ── API — settings modal ──────────────────────────────────────────────────────

function openSettings() {
  const stored = getApiKey();
  elApiKeyInput.value = stored ? '••••••••••••••••' : '';
  elApiKeyInput.dataset.masked = stored ? 'true' : 'false';
  elSettingsModal.classList.add('open');
  if (!stored) elApiKeyInput.focus();
}

function closeSettings() {
  elSettingsModal.classList.remove('open');
}

async function handleSaveKey() {
  let val = elApiKeyInput.value.trim();
  if (!val || val === '••••••••••••••••') return;
  storeApiKey(val);
  elApiKeyInput.value = '••••••••••••••••';
  elApiKeyInput.dataset.masked = 'true';
  setKeyStatus('busy', 'Validating…');
  await validateKey();
}

function handleClearKey() {
  storeApiKey('');
  elApiKeyInput.value = '';
  elApiKeyInput.dataset.masked = 'false';
  setKeyStatus('none', 'No key stored');
  updateKeyIndicator(false);
}

function setKeyStatus(state, msg) {
  elKeyDot.className = `key-dot ${state === 'ok' ? 'ok' : state === 'error' ? 'error' : state === 'busy' ? 'busy' : ''}`;
  elKeyStatusText.textContent = msg;
}

function updateKeyIndicator(ok) {
  elKeyIndicator.textContent = ok ? '● API key active' : 'No API key';
  elKeyIndicator.classList.toggle('ok', ok);
}

// ── API — key validation + model fetch ────────────────────────────────────────

async function validateKey() {
  const key = getApiKey();
  if (!key) { setKeyStatus('none', 'No key stored'); updateKeyIndicator(false); return; }
  try {
    // Validate key with a cheap text models fetch first
    const checkRes = await veniceGet('/models?type=text&limit=1');
    if (!checkRes.ok) {
      setKeyStatus('error', `Invalid key (${checkRes.status})`);
      updateKeyIndicator(false);
      return;
    }

    // Fetch video models specifically
    const res  = await veniceGet('/models?type=video');
    const data = await res.json();
    const videoModels = data.data ?? data.models ?? [];

    const count = videoModels.length;
    setKeyStatus('ok', `Key valid — ${count} video model${count !== 1 ? 's' : ''} available`);
    updateKeyIndicator(true);
    if (count) injectLiveModels(videoModels);
  } catch (err) {
    setKeyStatus('error', `Network error: ${err.message}`);
    updateKeyIndicator(false);
  }
}

function injectLiveModels(apiModels) {
  liveApiModels = apiModels;
  console.log('[VPS] Video models loaded:', apiModels.map(m => `${m.id} — ${m.model_spec?.name ?? m.name ?? '?'}`));
  elModel.innerHTML = '';
  apiModels.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.model_spec?.name ?? m.name ?? m.id;
    elModel.appendChild(opt);
  });
  syncModelMode();
}

// ── API — image preview ───────────────────────────────────────────────────────

function handleImageUrlChange() {
  const url = elImageUrl.value.trim();
  if (!url) { elImagePreviewC.classList.remove('visible'); return; }
  elImagePreview.src = url;
  elImagePreview.onload  = () => elImagePreviewC.classList.add('visible');
  elImagePreview.onerror = () => elImagePreviewC.classList.remove('visible');
}

// ── API — script suggestion ───────────────────────────────────────────────────

const SUGGEST_SYSTEM = `You are a video director's assistant for Venice.ai. Given a description of a still image, suggest a compelling short video script that brings it to life with motion and atmosphere.

Respond ONLY with a valid JSON object in this exact format, no markdown fences, no commentary:
{
  "shot": "one sentence describing the opening shot composition and environment",
  "context": "one or two sentences on subjects and their starting state/emotion",
  "camera": "exactly one of: Static|Slow push-in|Slow pull-back|Arc left|Arc right|Crane up|Crane down|Dutch tilt|Handheld|Pan left|Pan right|Tilt up|Tilt down|Dolly zoom (Vertigo)|Tracking shot|Overhead drone descent",
  "timeline": [
    { "ts": "00:02", "event": "what physically happens", "dialogue": "" }
  ]
}

Rules: 2 to 4 timeline events. Focus on motion and what changes in the scene. Leave dialogue as empty string unless a character clearly speaks. Timestamps in MM:SS format.`;

async function suggestScript() {
  const key  = getApiKey();
  const desc = elImageDesc.value.trim();
  if (!key)  { showSuggestStatus('error', 'Set your Venice API key first (⚙ API settings).'); return; }
  if (!desc) { showSuggestStatus('error', 'Describe the image first.'); return; }

  elSuggestBtn.disabled = true;
  showSuggestStatus('', '<span class="spinner"></span> Asking venice-uncensored…');

  try {
    const res = await venicePost('/chat/completions', {
      model: ASSIST_MODEL,
      messages: [
        { role: 'system', content: SUGGEST_SYSTEM },
        { role: 'user',   content: `Image description: ${desc}` },
      ],
      temperature: 0.7,
      max_tokens: 600,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message ?? `HTTP ${res.status}`);
    }

    const data    = await res.json();
    const raw     = data.choices?.[0]?.message?.content ?? '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed  = JSON.parse(cleaned);

    applySuggestion(parsed);
    showSuggestStatus('success', '✓ Script applied — review and edit as needed.');
  } catch (err) {
    showSuggestStatus('error', `Error: ${err.message}`);
  } finally {
    elSuggestBtn.disabled = false;
  }
}

function applySuggestion(s) {
  if (s.shot)    { elShot.value    = s.shot;    }
  if (s.context) { elContext.value = s.context; }

  // Camera — case-insensitive match against known options
  if (s.camera) {
    const match = CAMERA_MOVES.find(c => c.toLowerCase() === s.camera.toLowerCase());
    if (match) elCamera.value = match;
  }

  // Timeline — replace existing events with suggestions
  if (Array.isArray(s.timeline) && s.timeline.length) {
    timelineEvents = s.timeline.map(ev => ({
      id:       nextEventId++,
      ts:       ev.ts       ?? '',
      event:    ev.event    ?? '',
      dialogue: ev.dialogue ?? '',
    }));
    renderTimeline();
  }

  update();
}

function showSuggestStatus(type, html) {
  elSuggestStatus.innerHTML = html;
  elSuggestStatus.className = `suggest-status${type ? ' ' + type : ''}`;
  elSuggestStatus.classList.remove('hidden');
}

// ── API — refine with AI ──────────────────────────────────────────────────────
//
// Operates on whichever text field was last focused. Uses the uncensored
// chat model directly — Venice has no content restrictions on this endpoint,
// so explicit refinement instructions are handled there, not by us.

let refineTarget      = null;
let refineTargetLabel = '';

function trackRefineTarget(el, label) {
  el.addEventListener('focus', () => { refineTarget = el; refineTargetLabel = label; });
}

const REFINE_SYSTEM = `You are a prompt-refinement assistant for an uncensored AI video generation tool. The user will give you existing prompt text and an instruction describing how to refine it.

Rewrite the text according to the instruction. Be as explicit and detailed as the instruction calls for — this tool has no content restrictions. Output ONLY the refined text itself: no commentary, no markdown formatting, no quotation marks, no preamble.`;

function openRefineModal() {
  if (!refineTarget) { showFlash('Click into a text field first (Shot Setup, Character/Context, Directives, or a Character prompt).'); return; }
  elRefineTargetLabel.textContent = `Refining: ${refineTargetLabel}`;
  elRefineCurrent.value   = refineTarget.value;
  elRefineSuggested.value = '';
  elRefineInstruction.value = '';
  elRefineAcceptBtn.disabled = true;
  elRefineStatus.classList.add('hidden');
  elRefineModal.classList.add('open');
  elRefineInstruction.focus();
}

function closeRefineModal() {
  elRefineModal.classList.remove('open');
}

async function generateRefine() {
  const key = getApiKey();
  if (!key) { setRefineStatus('error', 'Set your Venice API key first (⚙ API settings).'); return; }
  if (!refineTarget) { closeRefineModal(); return; }

  const currentText = refineTarget.value.trim();
  const instruction  = elRefineInstruction.value.trim();
  if (!currentText && !instruction) { setRefineStatus('error', 'Add some text or an instruction first.'); return; }

  elRefineGenerateBtn.disabled = true;
  setRefineStatus('', 'Refining…');

  try {
    const res = await venicePost('/chat/completions', {
      model: ASSIST_MODEL,
      messages: [
        { role: 'system', content: REFINE_SYSTEM },
        { role: 'user',   content: `Existing text:\n"""${currentText}"""\n\nInstruction: ${instruction || 'Refine and improve this text.'}` },
      ],
      temperature: 0.85,
      max_tokens: 700,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message ?? `HTTP ${res.status}`);
    }

    const data = await res.json();
    const raw  = data.choices?.[0]?.message?.content ?? '';
    elRefineSuggested.value = raw.trim();
    elRefineAcceptBtn.disabled = false;
    setRefineStatus('success', '✓ Refined — review and accept, or adjust the instruction and try again.');
  } catch (err) {
    setRefineStatus('error', `Error: ${err.message}`);
  } finally {
    elRefineGenerateBtn.disabled = false;
  }
}

function acceptRefine() {
  if (!refineTarget || !elRefineSuggested.value) return;
  refineTarget.value = elRefineSuggested.value;
  refineTarget.dispatchEvent(new Event('input', { bubbles: true }));
  closeRefineModal();
  showFlash('Refined text applied.');
}

function setRefineStatus(type, msg) {
  elRefineStatus.textContent = msg;
  elRefineStatus.className = `refine-status${type ? ' ' + type : ''}`;
  elRefineStatus.classList.remove('hidden');
}

// ── API — quote ───────────────────────────────────────────────────────────────

let currentQuoteUsd = null;

async function getQuote() {
  const key = getApiKey();
  if (!key) { showFlash('Set your Venice API key first.'); return; }

  elQuoteBtn.disabled = true;
  elQuoteBtn.textContent = 'Getting quote…';
  elQuoteDisplay.classList.add('hidden');

  try {
    const body = {
      model:        elModel.value,
      duration:     elDuration.value,
      aspect_ratio: elAspectRatio.value || undefined,
      resolution:   elResolution.value  || undefined,
    };
    const res  = await venicePost('/video/quote', body);
    const data = await res.json();
    if (!res.ok) {
      const hint = res.status === 404
        ? ` — model "${body.model}" not found. Save your API key (⚙) to load live model IDs.`
        : '';
      throw new Error((data.error?.message ?? `HTTP ${res.status}`) + hint);
    }

    currentQuoteUsd = data.quote;
    elQuoteDisplay.textContent = `Estimated: $${Number(currentQuoteUsd).toFixed(4)}`;
    elQuoteDisplay.classList.remove('hidden');
    elGenerateBtn.textContent = `Generate ($${Number(currentQuoteUsd).toFixed(4)})`;
  } catch (err) {
    showFlash(`Quote error: ${err.message}`);
    currentQuoteUsd = null;
  } finally {
    elQuoteBtn.disabled = false;
    elQuoteBtn.textContent = 'Get quote';
  }
}

// ── API — generate + poll ─────────────────────────────────────────────────────

let pollTimer     = null;
let currentBlobUrl = null;

async function generateVideo() {
  const key = getApiKey();
  if (!key) { showFlash('Set your Venice API key first.'); return; }

  const { prompt } = compilePrompt();
  if (!prompt.trim()) { showFlash('Compile a prompt first.'); return; }

  // Clear previous result
  clearPollTimer();
  if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
  elGenVideo.classList.add('hidden');
  elGenVideo.src = '';
  elGenerateBtn.disabled = true;
  elQuoteBtn.disabled    = true;

  setGenStatus('processing', '<span class="spinner"></span> Submitting to Venice…');

  try {
    const body = {
      model:           elModel.value,
      prompt,
      duration:        elDuration.value,
      aspect_ratio:    elAspectRatio.value    || undefined,
      resolution:      elResolution.value     || undefined,
      negative_prompt: elNegativePrompt.value.trim() || undefined,
      audio:           false,
    };

    // I2V — add image_url if present
    const imgUrl = elImageUrl?.value.trim();
    if (elMode.value === 'i2v' && imgUrl) body.image_url = imgUrl;

    const res  = await venicePost('/video/queue', body);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`);

    const { queue_id, model } = data;
    setGenStatus('processing', '<span class="spinner"></span> Queued — polling for result…');
    pollTimer = setTimeout(() => pollVideo(queue_id, model), 5000);
  } catch (err) {
    setGenStatus('error', `Submit error: ${err.message}`);
    resetGenButtons();
  }
}

async function pollVideo(queueId, modelId) {
  try {
    const res = await venicePost('/video/retrieve', { model: modelId, queue_id: queueId });

    const ct = res.headers.get('content-type') ?? '';

    if (ct.includes('video') || ct.includes('octet-stream')) {
      // Done — binary mp4
      const blob = await res.blob();
      currentBlobUrl = URL.createObjectURL(blob);
      elGenVideo.src = currentBlobUrl;
      elGenVideo.classList.remove('hidden');
      setGenStatus('success', '✓ Video ready — use controls to play or right-click to save.');
      resetGenButtons();
      return;
    }

    const data = await res.json();

    if (data.status === 'PROCESSING') {
      const elapsed   = Math.round((data.execution_duration   ?? 0)     / 1000);
      const estimated = Math.round((data.average_execution_time ?? 60000) / 1000);
      setGenStatus('processing',
        `<span class="spinner"></span> Processing — ${elapsed}s elapsed (est. ${estimated}s total)`);
      pollTimer = setTimeout(() => pollVideo(queueId, modelId), 5000);
      return;
    }

    // Unexpected state
    setGenStatus('error', `Unexpected response: ${JSON.stringify(data)}`);
    resetGenButtons();
  } catch (err) {
    setGenStatus('error', `Poll error: ${err.message}`);
    resetGenButtons();
  }
}

function clearPollTimer() {
  if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
}

function setGenStatus(type, html) {
  elGenStatus.innerHTML = html;
  elGenStatus.className = `gen-status ${type}`;
  elGenStatus.classList.remove('hidden');
}

function resetGenButtons() {
  elGenerateBtn.disabled = false;
  elQuoteBtn.disabled    = false;
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  populateModels();
  populateSelect(elCamera,      CAMERA_MOVES);
  populateSelect(elLighting,    LIGHTING);
  populateSelect(elStyle,       STYLES);
  populateSelect(elShotSize,    SHOT_SIZES);
  populateSelect(elComposition, COMPOSITIONS);
  populateSelect(elCameraAngle, CAMERA_ANGLES);
  populateSelect(elLens,        LENSES);
  populateSelect(elColorTone,   COLOR_TONES);
  populateSelect(elCharEmotion, CHARACTER_EMOTIONS);
  populateSelect(elTimeOfDay,   TIMES_OF_DAY);

  // Prompt form listeners
  elModel.addEventListener('change', syncModelMode);
  elMode.addEventListener('change', () => { applyModeClass(); update(); });
  elDuration.addEventListener('change', update);
  elShot.addEventListener('input', update);
  elContext.addEventListener('input', update);
  elCamera.addEventListener('change', update);
  elLighting.addEventListener('change', update);
  elStyle.addEventListener('change', update);
  elShotSize.addEventListener('change', update);
  elComposition.addEventListener('change', update);
  elCameraAngle.addEventListener('change', update);
  elLens.addEventListener('change', update);
  elColorTone.addEventListener('change', update);
  elCharEmotion.addEventListener('change', update);
  elTimeOfDay.addEventListener('change', update);
  elNoCuts.addEventListener('change', update);
  elDirectives.addEventListener('input', update);

  elAddEvent.addEventListener('click', addTimelineEvent);
  elCopyBtn.addEventListener('click', copyPrompt);
  elDebugBtn.addEventListener('click', toggleDebug);

  elSavePreset.addEventListener('click', savePreset);
  elLoadPreset.addEventListener('click', loadPreset);
  elDeletePreset.addEventListener('click', deletePreset);
  elPresetName.addEventListener('keydown', e => { if (e.key === 'Enter') savePreset(); });

  // Test / Final toggle
  elTestModeBtn.addEventListener('click',  () => setModelByRole('test'));
  elFinalModeBtn.addEventListener('click', () => setModelByRole('final'));

  // Settings modal
  elSettingsBtn.addEventListener('click', openSettings);
  elCloseSettings.addEventListener('click', closeSettings);
  elSettingsModal.addEventListener('click', e => { if (e.target === elSettingsModal) closeSettings(); });
  elSaveKeyBtn.addEventListener('click', handleSaveKey);
  elClearKeyBtn.addEventListener('click', handleClearKey);
  elApiKeyInput.addEventListener('focus', () => {
    if (elApiKeyInput.dataset.masked === 'true') elApiKeyInput.value = '';
  });
  elApiKeyInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleSaveKey(); });

  // I2V image
  elImageUrl.addEventListener('input', handleImageUrlChange);
  elSuggestBtn.addEventListener('click', suggestScript);

  // Refine with AI
  trackRefineTarget(elShot,       'Shot Setup');
  trackRefineTarget(elContext,    'Character / Context');
  trackRefineTarget(elDirectives, 'Additional Directives');
  trackRefineTarget($('char-prompt-input'), 'Character Prompt');
  elRefineBtn.addEventListener('click', openRefineModal);
  elRefineModalClose.addEventListener('click', closeRefineModal);
  elRefineCancelBtn.addEventListener('click', closeRefineModal);
  elRefineModal.addEventListener('click', e => { if (e.target === elRefineModal) closeRefineModal(); });
  elRefineGenerateBtn.addEventListener('click', generateRefine);
  elRefineAcceptBtn.addEventListener('click', acceptRefine);

  // Generation
  elQuoteBtn.addEventListener('click', getQuote);
  elGenerateBtn.addEventListener('click', generateVideo);

  // Character library
  characters = loadCharacters();
  $('char-new-btn').addEventListener('click', () => openCharEditor(null));
  $('char-export-btn').addEventListener('click', exportCharacters);
  $('char-import-btn').addEventListener('click', importCharacters);
  $('char-modal-close').addEventListener('click', closeCharModal);
  $('char-cancel-btn').addEventListener('click', closeCharModal);
  $('char-save-btn').addEventListener('click', saveCharEditor);
  $('char-delete-btn').addEventListener('click', deleteCharacter);
  $('char-modal').addEventListener('click', e => { if (e.target === $('char-modal')) closeCharModal(); });
  $('char-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') saveCharEditor(); });

  // Shot setup presets
  $('shot-preset-save-btn').addEventListener('click', saveShotPreset);
  $('shot-preset-load-btn').addEventListener('click', loadShotPreset);
  $('shot-preset-delete-btn').addEventListener('click', deleteShotPreset);
  $('shot-preset-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveShotPreset(); });

  // Restore state
  refreshPresetList();
  refreshShotPresetList();
  syncModelMode();
  renderTimeline();
  renderCharacterList();
  update();

  // Validate stored key on load
  if (getApiKey()) validateKey();
}

document.addEventListener('DOMContentLoaded', init);
