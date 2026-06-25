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

// ── API — refs ────────────────────────────────────────────────────────────────

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
    const res = await veniceGet('/models');
    if (!res.ok) {
      setKeyStatus('error', `Invalid key (${res.status})`);
      updateKeyIndicator(false);
      return;
    }
    const data = await res.json();
    const all  = data.data ?? data.models ?? [];
    const videoModels = all.filter(m =>
      m.type === 'video' ||
      m.model_type === 'video' ||
      (typeof m.id === 'string' && /seedance|wan|kling|video|r2v/i.test(m.id))
    );
    const count = videoModels.length;
    setKeyStatus('ok', `Key valid — ${count} video model${count !== 1 ? 's' : ''} found`);
    updateKeyIndicator(true);
    if (count) injectLiveModels(videoModels);
  } catch (err) {
    setKeyStatus('error', `Network error: ${err.message}`);
    updateKeyIndicator(false);
  }
}

function injectLiveModels(apiModels) {
  elModel.innerHTML = '';
  apiModels.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name ?? m.id;
    elModel.appendChild(opt);
  });
  // Rebuild mode constraints from live data — infer i2v from model id heuristic
  // syncModelMode will fall back gracefully if model not in MODELS array
  syncModelModeLive(apiModels);
}

function syncModelModeLive(apiModels) {
  const modelId  = elModel.value;
  const modelDef = apiModels.find(m => m.id === modelId);
  if (!modelDef) return;
  // Heuristic: if model id contains r2v/i2v/image-to-video → i2v only
  const isI2VOnly = /r2v|i2v|image.to.video/i.test(modelId);
  const isT2VOnly = !isI2VOnly && !/r2v|i2v/i.test(modelId);
  const modeOpts  = elMode.querySelectorAll('option');
  modeOpts.forEach(opt => {
    if (isI2VOnly) opt.disabled = opt.value !== 'i2v';
    else           opt.disabled = false;
  });
  if (isI2VOnly && elMode.value !== 'i2v') elMode.value = 'i2v';
  applyModeClass();
  update();
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
      model: 'venice-uncensored',
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
    if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`);

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
  populateSelect(elCamera,   CAMERA_MOVES);
  populateSelect(elLighting, LIGHTING);
  populateSelect(elStyle,    STYLES);

  // Prompt form listeners
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
  elPresetName.addEventListener('keydown', e => { if (e.key === 'Enter') savePreset(); });

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

  // Generation
  elQuoteBtn.addEventListener('click', getQuote);
  elGenerateBtn.addEventListener('click', generateVideo);

  // Restore state
  refreshPresetList();
  syncModelMode();
  renderTimeline();
  update();

  // Validate stored key on load
  if (getApiKey()) validateKey();
}

document.addEventListener('DOMContentLoaded', init);
