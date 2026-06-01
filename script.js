const $ = (id) => document.getElementById(id);

const state = {
  scenes: [],
  selectedSceneId: null,
  currentTime: 0,
  isPlaying: false,
  previewAudio: null,
  deferredInstallPrompt: null,
  audio: {
    url: null,
    fileName: '',
    duration: 0,
    start: 0,
    end: 0,
    buffer: null,
  },
};

const stage = $('stage');
const ctx = stage.getContext('2d');
const waveform = $('waveform');
const waveCtx = waveform.getContext('2d');

const refs = {
  imageInput: $('imageInput'),
  videoInput: $('videoInput'),
  audioInput: $('audioInput'),
  formatSelect: $('formatSelect'),
  defaultDuration: $('defaultDuration'),
  fadeDuration: $('fadeDuration'),
  fpsSelect: $('fpsSelect'),
  audioInfo: $('audioInfo'),
  audioStart: $('audioStart'),
  audioEnd: $('audioEnd'),
  audioVolume: $('audioVolume'),
  musicFadeSelect: $('musicFadeSelect'),
  previewAudioBtn: $('previewAudioBtn'),
  stopAudioBtn: $('stopAudioBtn'),
  fitPhotosBtn: $('fitPhotosBtn'),
  videoAudioCheck: $('videoAudioCheck'),
  bulkText: $('bulkText'),
  applyTextBtn: $('applyTextBtn'),
  watermarkCheck: $('watermarkCheck'),
  statusText: $('statusText'),
  previewBtn: $('previewBtn'),
  stopPreviewBtn: $('stopPreviewBtn'),
  exportBtn: $('exportBtn'),
  resetBtn: $('resetBtn'),
  installBtn: $('installBtn'),
  scrubRange: $('scrubRange'),
  currentTimeLabel: $('currentTimeLabel'),
  totalTimeLabel: $('totalTimeLabel'),
  progressBar: $('progressBar'),
  downloadBox: $('downloadBox'),
  downloadLink: $('downloadLink'),
  timelineEditor: $('timelineEditor'),
  durationBadge: $('durationBadge'),
  audioDurationBadge: $('audioDurationBadge'),
  inspector: $('inspector'),
  selectedInfo: $('selectedInfo'),
};

function setStatus(message) {
  refs.statusText.textContent = message;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${min}:${sec}`;
}

function formatLong(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function totalDuration() {
  return state.scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
}

function audioTrimDuration() {
  if (!state.audio.url) return 0;
  return Math.max(0, Number(state.audio.end || 0) - Number(state.audio.start || 0));
}

function updateCanvasSize() {
  const [w, h] = refs.formatSelect.value.split('x').map(Number);
  stage.width = w;
  stage.height = h;
  drawFrame(state.currentTime);
}

function updateDurationUi() {
  const total = totalDuration();
  const audioTotal = audioTrimDuration();
  state.currentTime = clamp(state.currentTime, 0, Math.max(0, total));
  refs.durationBadge.textContent = `Video ${formatLong(total)}`;
  refs.audioDurationBadge.textContent = `Audio ${formatLong(audioTotal)}`;
  refs.scrubRange.max = total.toFixed(2);
  refs.scrubRange.value = state.currentTime.toFixed(2);
  refs.currentTimeLabel.textContent = formatSeconds(state.currentTime);
  refs.totalTimeLabel.textContent = formatSeconds(total);
  refs.progressBar.style.width = total ? `${Math.min(100, (state.currentTime / total) * 100)}%` : '0%';
  updatePlayhead();
}

function drawEmpty() {
  const w = stage.width;
  const h = stage.height;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#0f172a');
  gradient.addColorStop(1, '#111827');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(w * 0.055)}px system-ui, sans-serif`;
  ctx.fillText('VideoMaker Timeline', w / 2, h / 2 - 44);
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `500 ${Math.round(w * 0.026)}px system-ui, sans-serif`;
  ctx.fillText('Aggiungi foto, video, audio e testi', w / 2, h / 2 + 34);
}

function objectFitCoverDimensions(mediaWidth, mediaHeight, boxWidth, boxHeight, zoom = 1) {
  const safeW = Math.max(1, mediaWidth || boxWidth);
  const safeH = Math.max(1, mediaHeight || boxHeight);
  const scale = Math.max(boxWidth / safeW, boxHeight / safeH) * zoom;
  const width = safeW * scale;
  const height = safeH * scale;
  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height,
  };
}

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function wrapText(text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 6);
}

function drawTextOverlay(scene) {
  const text = scene.text?.trim();
  if (!text) return;
  const w = stage.width;
  const h = stage.height;
  const fontSize = Math.max(26, Math.round((Number(scene.fontSize) || 54) * (w / 1080)));
  const lineHeight = fontSize * 1.18;
  const maxWidth = w * 0.84;
  ctx.save();
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(text, maxWidth);
  const blockHeight = lines.length * lineHeight;
  const yCenter = h * clamp(scene.textY ?? 78, 5, 95) / 100;
  const yStart = yCenter - blockHeight / 2;
  const padX = Math.round(w * 0.03);
  const padY = Math.round(fontSize * 0.58);
  ctx.fillStyle = 'rgba(0,0,0,0.50)';
  roundRect(ctx, w / 2 - maxWidth / 2 - padX, yStart - padY, maxWidth + padX * 2, blockHeight + padY * 2, 30);
  ctx.fill();

  lines.forEach((line, index) => {
    const y = yStart + index * lineHeight + lineHeight / 2;
    ctx.lineWidth = Math.max(6, fontSize * 0.1);
    ctx.strokeStyle = 'rgba(0,0,0,0.78)';
    ctx.strokeText(line, w / 2, y);
    ctx.fillStyle = scene.textColor || '#ffffff';
    ctx.fillText(line, w / 2, y);
  });
  ctx.restore();
}

function drawWatermark() {
  if (!refs.watermarkCheck.checked) return;
  const w = stage.width;
  const h = stage.height;
  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  roundRect(ctx, w - 390, h - 82, 330, 46, 23);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(w * 0.018)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Creato con VideoMaker', w - 225, h - 59);
  ctx.restore();
}

function sceneAt(time) {
  let cursor = 0;
  for (const scene of state.scenes) {
    const duration = Number(scene.duration || 0);
    if (time >= cursor && time < cursor + duration) {
      return { scene, localTime: time - cursor, start: cursor, end: cursor + duration };
    }
    cursor += duration;
  }
  const last = state.scenes[state.scenes.length - 1];
  if (!last) return null;
  return { scene: last, localTime: Number(last.duration || 0), start: totalDuration() - Number(last.duration || 0), end: totalDuration() };
}

function applyFadeToFrame(scene, localTime) {
  const fade = Math.min(Number(refs.fadeDuration.value || 0), Number(scene.duration || 0) / 2);
  if (fade <= 0) return;
  let alpha = 0;
  if (localTime < fade) alpha = 1 - localTime / fade;
  if (scene.duration - localTime < fade) alpha = Math.max(alpha, 1 - (scene.duration - localTime) / fade);
  if (alpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(1, alpha)})`;
    ctx.fillRect(0, 0, stage.width, stage.height);
  }
}

function drawFrame(time) {
  if (!state.scenes.length) {
    drawEmpty();
    return;
  }

  const current = sceneAt(time);
  if (!current) return;
  const { scene, localTime } = current;
  const w = stage.width;
  const h = stage.height;
  ctx.fillStyle = '#050816';
  ctx.fillRect(0, 0, w, h);

  const zoom = Number(scene.zoom || 1);
  if (scene.type === 'image' && scene.media?.complete) {
    const progress = Math.min(1, localTime / Math.max(0.01, scene.duration));
    const fit = objectFitCoverDimensions(scene.media.naturalWidth, scene.media.naturalHeight, w, h, zoom + progress * 0.035);
    ctx.drawImage(scene.media, fit.x, fit.y, fit.width, fit.height);
  }

  if (scene.type === 'video' && scene.media?.readyState >= 2) {
    const fit = objectFitCoverDimensions(scene.media.videoWidth || w, scene.media.videoHeight || h, w, h, zoom);
    ctx.drawImage(scene.media, fit.x, fit.y, fit.width, fit.height);
  }

  applyFadeToFrame(scene, localTime);
  drawTextOverlay(scene);
  drawWatermark();
}

function makeBaseScene(type, file, url, media) {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    type,
    file,
    url,
    media,
    name: file.name,
    duration: Number(refs.defaultDuration.value || 4),
    text: '',
    fontSize: 54,
    textY: 78,
    textColor: '#ffffff',
    zoom: 1,
    sourceStart: 0,
    sourceEnd: 0,
  };
}

async function addImageFiles(files) {
  for (const file of [...files]) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {});
    const scene = makeBaseScene('image', file, url, image);
    scene.duration = Math.max(0.5, Number(refs.defaultDuration.value || 4));
    state.scenes.push(scene);
    if (!state.selectedSceneId) state.selectedSceneId = scene.id;
  }
  refreshAll('Foto aggiunte alla timeline.');
}

async function addVideoFiles(files) {
  for (const file of [...files]) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
      video.onerror = resolve;
      setTimeout(resolve, 1800);
    });
    const scene = makeBaseScene('video', file, url, video);
    const videoDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 6;
    scene.sourceStart = 0;
    scene.sourceEnd = Math.min(videoDuration, 10);
    scene.duration = Number((scene.sourceEnd - scene.sourceStart).toFixed(2));
    state.scenes.push(scene);
    if (!state.selectedSceneId) state.selectedSceneId = scene.id;
  }
  refreshAll('Video aggiunti alla timeline.');
}

async function setAudioFile(file) {
  stopStandaloneAudio();
  if (state.audio.url) URL.revokeObjectURL(state.audio.url);
  state.audio.url = URL.createObjectURL(file);
  state.audio.fileName = file.name;
  state.audio.buffer = null;

  const audio = new Audio(state.audio.url);
  audio.preload = 'metadata';
  await new Promise((resolve) => {
    audio.onloadedmetadata = resolve;
    audio.onerror = resolve;
    setTimeout(resolve, 1800);
  });
  state.audio.duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  state.audio.start = 0;
  state.audio.end = state.audio.duration;

  refs.audioStart.max = state.audio.duration.toFixed(2);
  refs.audioEnd.max = state.audio.duration.toFixed(2);
  refs.audioStart.value = '0';
  refs.audioEnd.value = state.audio.duration.toFixed(1);
  refs.audioInfo.textContent = `${file.name} • durata ${formatSeconds(state.audio.duration)}`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.audio.buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    await audioCtx.close();
  } catch {
    state.audio.buffer = null;
  }

  drawWaveform();
  refreshAll(`Audio caricato: ${file.name}`);
}

function drawWaveform() {
  const width = waveform.width;
  const height = waveform.height;
  waveCtx.clearRect(0, 0, width, height);
  waveCtx.fillStyle = '#07111f';
  waveCtx.fillRect(0, 0, width, height);

  if (!state.audio.url || !state.audio.buffer) {
    waveCtx.fillStyle = 'rgba(255,255,255,0.56)';
    waveCtx.font = '700 20px system-ui, sans-serif';
    waveCtx.textAlign = 'center';
    waveCtx.fillText(state.audio.url ? 'Audio caricato' : 'Carica una traccia audio', width / 2, height / 2 + 8);
    return;
  }

  const data = state.audio.buffer.getChannelData(0);
  const step = Math.ceil(data.length / width);
  const amp = height / 2.2;
  waveCtx.strokeStyle = 'rgba(56,189,248,0.85)';
  waveCtx.lineWidth = 1;
  waveCtx.beginPath();
  for (let x = 0; x < width; x += 1) {
    let min = 1;
    let max = -1;
    const start = x * step;
    for (let i = 0; i < step; i += 1) {
      const datum = data[start + i] || 0;
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    waveCtx.moveTo(x, (1 + min) * amp);
    waveCtx.lineTo(x, (1 + max) * amp);
  }
  waveCtx.stroke();

  const duration = state.audio.duration || 1;
  const startX = (state.audio.start / duration) * width;
  const endX = (state.audio.end / duration) * width;
  waveCtx.fillStyle = 'rgba(0,0,0,0.48)';
  waveCtx.fillRect(0, 0, startX, height);
  waveCtx.fillRect(endX, 0, width - endX, height);
  waveCtx.strokeStyle = 'rgba(52,211,153,0.95)';
  waveCtx.lineWidth = 3;
  waveCtx.beginPath();
  waveCtx.moveTo(startX, 0);
  waveCtx.lineTo(startX, height);
  waveCtx.moveTo(endX, 0);
  waveCtx.lineTo(endX, height);
  waveCtx.stroke();

  waveCtx.fillStyle = 'rgba(255,255,255,0.9)';
  waveCtx.font = '700 13px system-ui, sans-serif';
  waveCtx.textAlign = 'left';
  waveCtx.fillText(`taglio: ${formatSeconds(state.audio.start)} → ${formatSeconds(state.audio.end)}`, 14, 22);
}

function pixelsPerSecond() {
  const total = Math.max(totalDuration(), audioTrimDuration(), 10);
  if (total <= 20) return 42;
  if (total <= 60) return 28;
  if (total <= 160) return 18;
  return 12;
}

function renderTimeline() {
  updateDurationUi();
  if (!state.scenes.length) {
    refs.timelineEditor.className = 'timeline-editor empty';
    refs.timelineEditor.innerHTML = '<p>Aggiungi foto o video per iniziare il montaggio.</p>';
    return;
  }

  const pps = pixelsPerSecond();
  const total = totalDuration();
  const audioTotal = audioTrimDuration();
  const width = Math.max(760, Math.ceil(Math.max(total, audioTotal, 10) * pps + 30));
  const tickEvery = total > 160 ? 20 : total > 60 ? 10 : total > 24 ? 5 : 1;
  let rulerHtml = '';
  for (let t = 0; t <= Math.max(total, audioTotal, 10); t += tickEvery) {
    rulerHtml += `<span class="tick" style="left:${t * pps}px">${formatSeconds(t)}</span>`;
  }

  let cursor = 0;
  const clips = state.scenes.map((scene, index) => {
    const left = cursor * pps;
    const widthPx = Math.max(74, scene.duration * pps);
    cursor += scene.duration;
    return `
      <button class="clip ${scene.id === state.selectedSceneId ? 'selected' : ''}" data-id="${scene.id}" style="left:${left}px;width:${widthPx}px" title="${escapeHtml(scene.name)}">
        ${scene.type === 'image'
          ? `<img src="${scene.url}" alt="" />`
          : `<video src="${scene.url}" muted playsinline></video>`}
        <span>${index + 1}. ${scene.type === 'image' ? 'Foto' : 'Video'}</span>
        <small>${formatSeconds(scene.duration)}</small>
      </button>
    `;
  }).join('');

  const audioClip = state.audio.url
    ? `<div class="audio-clip" style="left:0;width:${Math.max(80, audioTotal * pps)}px">🎵 ${escapeHtml(state.audio.fileName)} • ${formatSeconds(audioTotal)}</div>`
    : '<div class="audio-clip" style="left:0;width:180px;opacity:.45">Nessun audio</div>';

  refs.timelineEditor.className = 'timeline-editor';
  refs.timelineEditor.innerHTML = `
    <div class="timeline-scroller" style="width:${width + 110}px">
      <div class="ruler" style="width:${width}px">${rulerHtml}</div>
      <div class="track">
        <div class="track-label">Scene</div>
        <div class="clip-row" style="width:${width}px">${clips}<div class="playhead" style="left:${state.currentTime * pps}px"></div></div>
      </div>
      <div class="track">
        <div class="track-label">Audio</div>
        <div class="audio-row" style="width:${width}px">${audioClip}<div class="playhead" style="left:${state.currentTime * pps}px"></div></div>
      </div>
    </div>
  `;
}

function updatePlayhead() {
  const pps = pixelsPerSecond();
  document.querySelectorAll('.playhead').forEach((playhead) => {
    playhead.style.left = `${state.currentTime * pps}px`;
  });
}

function selectedScene() {
  return state.scenes.find((scene) => scene.id === state.selectedSceneId) || null;
}

function renderInspector() {
  const scene = selectedScene();
  if (!scene) {
    refs.selectedInfo.textContent = 'Nessuna scena selezionata.';
    refs.inspector.className = 'inspector-empty';
    refs.inspector.innerHTML = '<p>Seleziona una scena nella timeline per modificarla.</p>';
    return;
  }

  const index = state.scenes.findIndex((item) => item.id === scene.id) + 1;
  refs.selectedInfo.textContent = `${index}. ${scene.type === 'image' ? 'Foto' : 'Video'} • ${scene.name}`;
  refs.inspector.className = '';
  const mediaPreview = scene.type === 'image'
    ? `<img src="${scene.url}" alt="Anteprima scena" />`
    : `<video src="${scene.url}" muted playsinline></video>`;
  const videoMax = scene.type === 'video' ? (scene.media.duration || scene.sourceEnd || scene.duration || 1) : 0;

  refs.inspector.innerHTML = `
    <div class="scene-mini-preview">
      ${mediaPreview}
      <div>
        <h3>${escapeHtml(scene.name)}</h3>
        <p>Modifica la durata, il testo e la posizione del testo. Per i video puoi scegliere anche il punto di inizio e fine.</p>
      </div>
    </div>

    <div class="inspector-grid">
      <label>
        Durata scena
        <input data-field="duration" type="number" min="0.5" max="300" step="0.1" value="${Number(scene.duration).toFixed(1)}" />
      </label>
      <label>
        Zoom immagine/video
        <input data-field="zoom" type="number" min="1" max="2" step="0.05" value="${Number(scene.zoom || 1).toFixed(2)}" />
      </label>
      <label>
        Dimensione testo
        <input data-field="fontSize" type="number" min="24" max="110" step="1" value="${Number(scene.fontSize || 54)}" />
      </label>
      <label>
        Posizione testo %
        <input data-field="textY" type="number" min="5" max="95" step="1" value="${Number(scene.textY || 78)}" />
      </label>
      <label class="wide">
        Testo sovrapposto
        <input data-field="text" type="text" value="${escapeHtml(scene.text)}" placeholder="Scrivi il testo di questa scena" />
      </label>
      <label>
        Colore testo
        <input data-field="textColor" type="color" value="${scene.textColor || '#ffffff'}" />
      </label>
      ${scene.type === 'video' ? `
        <label>
          Inizio video
          <input data-field="sourceStart" type="number" min="0" max="${videoMax.toFixed(2)}" step="0.1" value="${Number(scene.sourceStart || 0).toFixed(1)}" />
        </label>
        <label>
          Fine video
          <input data-field="sourceEnd" type="number" min="0" max="${videoMax.toFixed(2)}" step="0.1" value="${Number(scene.sourceEnd || scene.duration).toFixed(1)}" />
        </label>
      ` : ''}
    </div>

    <div class="scene-tools">
      <button class="secondary" data-scene-action="shorter">-0,5s</button>
      <button class="secondary" data-scene-action="longer">+0,5s</button>
      <button class="ghost" data-scene-action="duplicate">Duplica scena</button>
      <button class="ghost" data-scene-action="up">↑ Sposta su</button>
      <button class="ghost" data-scene-action="down">↓ Sposta giù</button>
      <button class="danger" data-scene-action="delete">Elimina</button>
    </div>
  `;
}

function refreshAll(message) {
  updateDurationUi();
  renderTimeline();
  renderInspector();
  drawFrame(state.currentTime);
  if (message) setStatus(message);
}

function selectScene(id) {
  state.selectedSceneId = id;
  renderTimeline();
  renderInspector();
}

function moveScene(sceneId, direction) {
  const index = state.scenes.findIndex((scene) => scene.id === sceneId);
  const newIndex = index + direction;
  if (index < 0 || newIndex < 0 || newIndex >= state.scenes.length) return;
  const [scene] = state.scenes.splice(index, 1);
  state.scenes.splice(newIndex, 0, scene);
  refreshAll('Ordine scene aggiornato.');
}

function duplicateScene(sceneId) {
  const index = state.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) return;
  const original = state.scenes[index];
  const copy = { ...original, id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}` };
  if (original.type === 'image') {
    const image = new Image();
    image.src = original.url;
    copy.media = image;
  } else {
    const video = document.createElement('video');
    video.src = original.url;
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    copy.media = video;
  }
  state.scenes.splice(index + 1, 0, copy);
  state.selectedSceneId = copy.id;
  refreshAll('Scena duplicata.');
}

function deleteScene(sceneId) {
  const index = state.scenes.findIndex((scene) => scene.id === sceneId);
  if (index < 0) return;
  const [scene] = state.scenes.splice(index, 1);
  URL.revokeObjectURL(scene.url);
  state.selectedSceneId = state.scenes[index]?.id || state.scenes[index - 1]?.id || null;
  refreshAll('Scena eliminata.');
}

function setSceneDuration(scene, duration) {
  const next = Math.max(0.5, Number(duration) || 0.5);
  if (scene.type === 'video') {
    const maxEnd = scene.media.duration || scene.sourceEnd || next;
    scene.sourceEnd = Math.min(maxEnd, Number(scene.sourceStart || 0) + next);
    scene.duration = Math.max(0.5, scene.sourceEnd - scene.sourceStart);
  } else {
    scene.duration = next;
  }
}

function updateSceneField(scene, field, value) {
  if (!scene) return;
  if (field === 'duration') setSceneDuration(scene, value);
  if (field === 'zoom') scene.zoom = clamp(value, 1, 2);
  if (field === 'fontSize') scene.fontSize = clamp(value, 24, 110);
  if (field === 'textY') scene.textY = clamp(value, 5, 95);
  if (field === 'text') scene.text = value;
  if (field === 'textColor') scene.textColor = value;
  if (field === 'sourceStart' && scene.type === 'video') {
    const max = scene.media.duration || scene.sourceEnd || scene.duration;
    scene.sourceStart = clamp(value, 0, Math.max(0, max - 0.2));
    if (scene.sourceEnd <= scene.sourceStart) scene.sourceEnd = Math.min(max, scene.sourceStart + 0.5);
    scene.duration = Math.max(0.5, scene.sourceEnd - scene.sourceStart);
  }
  if (field === 'sourceEnd' && scene.type === 'video') {
    const max = scene.media.duration || scene.sourceEnd || scene.duration;
    scene.sourceEnd = clamp(value, scene.sourceStart + 0.5, max);
    scene.duration = Math.max(0.5, scene.sourceEnd - scene.sourceStart);
  }
  updateDurationUi();
  renderTimeline();
  drawFrame(state.currentTime);
}

function fitPhotosToAudio() {
  if (!state.audio.url || audioTrimDuration() <= 0) {
    setStatus('Carica prima una traccia audio.');
    return;
  }
  const photos = state.scenes.filter((scene) => scene.type === 'image');
  if (!photos.length) {
    setStatus('Non ci sono foto da adattare alla musica.');
    return;
  }
  const videoDuration = state.scenes
    .filter((scene) => scene.type === 'video')
    .reduce((sum, scene) => sum + scene.duration, 0);
  const available = Math.max(photos.length * 0.5, audioTrimDuration() - videoDuration);
  const perPhoto = Math.max(0.5, available / photos.length);
  photos.forEach((scene) => { scene.duration = Number(perPhoto.toFixed(2)); });
  state.currentTime = 0;
  refreshAll(`Durata foto adattata alla musica: ${formatLong(audioTrimDuration())}.`);
}

async function resetVideosForPlayback() {
  for (const scene of state.scenes) {
    if (scene.type !== 'video') continue;
    scene.media.pause();
    scene.media.muted = true;
    const target = Number(scene.sourceStart || 0);
    try { scene.media.currentTime = target; } catch {}
  }
}

async function syncVideos(globalTime, includeAudio = false) {
  const current = sceneAt(globalTime);
  for (const scene of state.scenes) {
    if (scene.type !== 'video') continue;
    const video = scene.media;
    if (current?.scene?.id === scene.id) {
      const localTime = Math.min(Math.max(0, current.localTime), Math.max(0, scene.duration) - 0.05);
      const sourceTime = Math.min(Number(scene.sourceEnd || scene.sourceStart + scene.duration) - 0.05, Number(scene.sourceStart || 0) + localTime);
      if (Number.isFinite(sourceTime) && Math.abs((video.currentTime || 0) - sourceTime) > 0.25) {
        try { video.currentTime = sourceTime; } catch {}
      }
      video.muted = !includeAudio;
      if (video.paused) await video.play().catch(() => {});
    } else {
      video.pause();
    }
  }
}

function stopStandaloneAudio() {
  if (state.previewAudio) {
    state.previewAudio.pause();
    state.previewAudio.src = '';
    state.previewAudio = null;
  }
}

function audioFadeFactor(timelineTime) {
  const trimDuration = audioTrimDuration();
  const fade = Math.min(Number(refs.musicFadeSelect.value || 0), trimDuration / 2);
  if (trimDuration <= 0 || timelineTime < 0 || timelineTime > trimDuration) return 0;
  if (fade <= 0) return 1;
  if (timelineTime < fade) return timelineTime / fade;
  if (trimDuration - timelineTime < fade) return Math.max(0, (trimDuration - timelineTime) / fade);
  return 1;
}

async function playStandaloneAudio() {
  if (!state.audio.url) {
    setStatus('Carica prima una traccia audio.');
    return;
  }
  stopStandaloneAudio();
  const audio = new Audio(state.audio.url);
  state.previewAudio = audio;
  audio.currentTime = state.audio.start;
  audio.volume = Number(refs.audioVolume.value || 0.85);
  await audio.play().catch(() => setStatus('Il browser ha bloccato la riproduzione audio. Premi di nuovo.'));
  const startAt = performance.now();
  const loop = () => {
    if (state.previewAudio !== audio) return;
    const elapsed = (performance.now() - startAt) / 1000;
    audio.volume = Number(refs.audioVolume.value || 0.85) * audioFadeFactor(elapsed);
    if (audio.currentTime >= state.audio.end || elapsed >= audioTrimDuration()) {
      stopStandaloneAudio();
      setStatus('Prova audio terminata.');
      return;
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  setStatus('Prova audio in riproduzione.');
}

async function startPreviewAudio(timelineTime) {
  if (!state.audio.url || timelineTime >= audioTrimDuration()) return null;
  const audio = new Audio(state.audio.url);
  audio.currentTime = state.audio.start + timelineTime;
  audio.volume = Number(refs.audioVolume.value || 0.85) * audioFadeFactor(timelineTime);
  state.previewAudio = audio;
  await audio.play().catch(() => {});
  return audio;
}

function stopPreview() {
  state.isPlaying = false;
  refs.previewBtn.disabled = false;
  refs.exportBtn.disabled = false;
  stopStandaloneAudio();
  resetVideosForPlayback();
  updateDurationUi();
}

async function playPreview() {
  if (!state.scenes.length) {
    setStatus('Aggiungi almeno una foto o un video.');
    return;
  }
  if (state.isPlaying) return;
  refs.downloadBox.classList.add('hidden');
  state.isPlaying = true;
  refs.previewBtn.disabled = true;
  refs.exportBtn.disabled = true;
  await resetVideosForPlayback();
  const total = totalDuration();
  const initialTime = clamp(state.currentTime, 0, total);
  const start = performance.now() - initialTime * 1000;
  const previewAudio = await startPreviewAudio(initialTime);
  setStatus('Anteprima in riproduzione...');

  const loop = async (now) => {
    if (!state.isPlaying) return;
    const elapsed = Math.min(total, (now - start) / 1000);
    state.currentTime = elapsed;
    if (previewAudio) {
      const audioTimelineTime = elapsed;
      previewAudio.volume = Number(refs.audioVolume.value || 0.85) * audioFadeFactor(audioTimelineTime);
      if (audioTimelineTime >= audioTrimDuration()) previewAudio.pause();
    }
    await syncVideos(elapsed, refs.videoAudioCheck.checked);
    drawFrame(elapsed);
    updateDurationUi();
    if (elapsed < total) {
      requestAnimationFrame(loop);
    } else {
      state.isPlaying = false;
      refs.previewBtn.disabled = false;
      refs.exportBtn.disabled = false;
      setStatus('Anteprima completata.');
      stopStandaloneAudio();
      await resetVideosForPlayback();
    }
  };
  requestAnimationFrame(loop);
}

function supportedMimeType() {
  const options = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

async function createAudioMixStream(audioCtx) {
  const destination = audioCtx.createMediaStreamDestination();
  const cleanup = [];
  const videoAudioMap = new Map();
  let mainAudio = null;
  let mainGain = null;

  if (state.audio.url && audioTrimDuration() > 0) {
    mainAudio = new Audio(state.audio.url);
    mainAudio.preload = 'auto';
    mainAudio.crossOrigin = 'anonymous';
    const source = audioCtx.createMediaElementSource(mainAudio);
    mainGain = audioCtx.createGain();
    const volume = Number(refs.audioVolume.value || 0.85);
    const fade = Math.min(Number(refs.musicFadeSelect.value || 0), audioTrimDuration() / 2);
    const now = audioCtx.currentTime;
    mainGain.gain.cancelScheduledValues(now);
    if (fade > 0) {
      mainGain.gain.setValueAtTime(0, now);
      mainGain.gain.linearRampToValueAtTime(volume, now + fade);
      mainGain.gain.setValueAtTime(volume, now + Math.max(fade, audioTrimDuration() - fade));
      mainGain.gain.linearRampToValueAtTime(0, now + audioTrimDuration());
    } else {
      mainGain.gain.setValueAtTime(volume, now);
    }
    source.connect(mainGain).connect(destination);
    cleanup.push(() => { mainAudio.pause(); mainAudio.src = ''; });
  }

  if (refs.videoAudioCheck.checked) {
    for (const scene of state.scenes) {
      if (scene.type !== 'video') continue;
      const videoAudio = document.createElement('video');
      videoAudio.src = scene.url;
      videoAudio.preload = 'auto';
      videoAudio.playsInline = true;
      videoAudio.muted = false;
      const source = audioCtx.createMediaElementSource(videoAudio);
      const gain = audioCtx.createGain();
      gain.gain.value = 0.9;
      source.connect(gain).connect(destination);
      videoAudioMap.set(scene.id, videoAudio);
      cleanup.push(() => { videoAudio.pause(); videoAudio.src = ''; });
    }
  }

  await audioCtx.resume();
  return { destination, cleanup, videoAudioMap, mainAudio, mainGain };
}

async function syncExportVideoAudioPlayers(globalTime, videoAudioMap) {
  if (!videoAudioMap?.size) return;
  const current = sceneAt(globalTime);
  for (const [sceneId, media] of videoAudioMap.entries()) {
    if (current?.scene?.id === sceneId) {
      const scene = current.scene;
      const sourceTime = Math.min(Number(scene.sourceEnd || scene.sourceStart + scene.duration) - 0.05, Number(scene.sourceStart || 0) + current.localTime);
      if (Number.isFinite(sourceTime) && Math.abs((media.currentTime || 0) - sourceTime) > 0.25) {
        try { media.currentTime = sourceTime; } catch {}
      }
      if (media.paused) await media.play().catch(() => {});
    } else {
      media.pause();
    }
  }
}

async function exportVideo() {
  if (!state.scenes.length) {
    setStatus('Aggiungi almeno una foto o un video.');
    return;
  }
  if (!('MediaRecorder' in window) || !stage.captureStream) {
    setStatus('Il browser non supporta la registrazione da canvas. Prova Chrome o Edge aggiornato.');
    return;
  }

  stopPreview();
  state.currentTime = 0;
  updateDurationUi();
  refs.downloadBox.classList.add('hidden');
  refs.previewBtn.disabled = true;
  refs.exportBtn.disabled = true;
  setStatus('Preparazione esportazione...');
  await resetVideosForPlayback();

  const total = totalDuration();
  const fps = Number(refs.fpsSelect.value || 30);
  const canvasStream = stage.captureStream(fps);
  const finalStream = new MediaStream(canvasStream.getVideoTracks());
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const audioMix = await createAudioMixStream(audioCtx);
  for (const track of audioMix.destination.stream.getAudioTracks()) finalStream.addTrack(track);

  const chunks = [];
  const mimeType = supportedMimeType();
  const recorder = new MediaRecorder(finalStream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);
  recorder.ondataavailable = (event) => {
    if (event.data?.size) chunks.push(event.data);
  };
  const recordingDone = new Promise((resolve) => { recorder.onstop = resolve; });
  recorder.start(250);
  setStatus('Esportazione in corso... non chiudere la pagina.');

  if (audioMix.mainAudio) {
    audioMix.mainAudio.currentTime = state.audio.start;
    await audioMix.mainAudio.play().catch(() => {});
  }

  const start = performance.now();
  await new Promise((resolve) => {
    const loop = async (now) => {
      const elapsed = Math.min(total, (now - start) / 1000);
      state.currentTime = elapsed;
      if (audioMix.mainAudio && elapsed >= audioTrimDuration()) audioMix.mainAudio.pause();
      await syncVideos(elapsed, false);
      await syncExportVideoAudioPlayers(elapsed, audioMix.videoAudioMap);
      drawFrame(elapsed);
      updateDurationUi();
      if (elapsed < total) requestAnimationFrame(loop);
      else resolve();
    };
    requestAnimationFrame(loop);
  });

  recorder.stop();
  await recordingDone;
  for (const track of finalStream.getTracks()) track.stop();
  for (const fn of audioMix.cleanup) fn();
  await audioCtx.close().catch(() => {});
  await resetVideosForPlayback();

  const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
  const url = URL.createObjectURL(blob);
  refs.downloadLink.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  refs.downloadLink.download = `videomaker-timeline-${stamp}.webm`;
  refs.downloadBox.classList.remove('hidden');
  setStatus('Video esportato correttamente.');
  refs.previewBtn.disabled = false;
  refs.exportBtn.disabled = false;
}

function updateAudioTrimFromInputs() {
  if (!state.audio.url) return;
  const duration = state.audio.duration || 0;
  let start = clamp(refs.audioStart.value, 0, duration);
  let end = clamp(refs.audioEnd.value, 0, duration);
  if (end <= start) end = Math.min(duration, start + 0.5);
  state.audio.start = start;
  state.audio.end = end;
  refs.audioStart.value = start.toFixed(1);
  refs.audioEnd.value = end.toFixed(1);
  drawWaveform();
  refreshAll('Taglio audio aggiornato.');
}

refs.imageInput.addEventListener('change', (event) => addImageFiles(event.target.files));
refs.videoInput.addEventListener('change', (event) => addVideoFiles(event.target.files));
refs.audioInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) setAudioFile(file);
});
refs.formatSelect.addEventListener('change', updateCanvasSize);
refs.fadeDuration.addEventListener('input', () => drawFrame(state.currentTime));
refs.watermarkCheck.addEventListener('change', () => drawFrame(state.currentTime));
refs.audioStart.addEventListener('change', updateAudioTrimFromInputs);
refs.audioEnd.addEventListener('change', updateAudioTrimFromInputs);
refs.musicFadeSelect.addEventListener('change', () => setStatus('Fade audio aggiornato.'));
refs.previewAudioBtn.addEventListener('click', playStandaloneAudio);
refs.stopAudioBtn.addEventListener('click', () => { stopStandaloneAudio(); setStatus('Audio fermato.'); });
refs.fitPhotosBtn.addEventListener('click', fitPhotosToAudio);
refs.applyTextBtn.addEventListener('click', () => {
  const text = refs.bulkText.value.trim();
  state.scenes.forEach((scene) => { scene.text = text; });
  refreshAll('Testo applicato a tutte le scene.');
});
refs.previewBtn.addEventListener('click', playPreview);
refs.stopPreviewBtn.addEventListener('click', () => { stopPreview(); setStatus('Anteprima fermata.'); });
refs.exportBtn.addEventListener('click', exportVideo);
refs.scrubRange.addEventListener('input', async (event) => {
  state.currentTime = Number(event.target.value || 0);
  await syncVideos(state.currentTime, false);
  drawFrame(state.currentTime);
  updateDurationUi();
});
refs.timelineEditor.addEventListener('click', (event) => {
  const clip = event.target.closest('.clip');
  if (clip?.dataset.id) selectScene(clip.dataset.id);
});
refs.inspector.addEventListener('input', (event) => {
  const field = event.target.dataset.field;
  if (!field) return;
  updateSceneField(selectedScene(), field, event.target.value);
});
refs.inspector.addEventListener('click', (event) => {
  const action = event.target.dataset.sceneAction;
  const scene = selectedScene();
  if (!action || !scene) return;
  if (action === 'shorter') setSceneDuration(scene, Number(scene.duration) - 0.5);
  if (action === 'longer') setSceneDuration(scene, Number(scene.duration) + 0.5);
  if (action === 'duplicate') duplicateScene(scene.id);
  if (action === 'up') moveScene(scene.id, -1);
  if (action === 'down') moveScene(scene.id, 1);
  if (action === 'delete') deleteScene(scene.id);
  if (['shorter', 'longer'].includes(action)) {
    refreshAll('Durata scena aggiornata.');
  }
});
refs.resetBtn.addEventListener('click', async () => {
  stopPreview();
  stopStandaloneAudio();
  for (const scene of state.scenes) URL.revokeObjectURL(scene.url);
  if (state.audio.url) URL.revokeObjectURL(state.audio.url);
  state.scenes = [];
  state.selectedSceneId = null;
  state.currentTime = 0;
  state.audio = { url: null, fileName: '', duration: 0, start: 0, end: 0, buffer: null };
  refs.bulkText.value = '';
  refs.audioStart.value = '0';
  refs.audioEnd.value = '0';
  refs.audioInfo.textContent = 'Nessun audio caricato.';
  refs.downloadBox.classList.add('hidden');
  drawWaveform();
  refreshAll('Progetto pulito.');
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  refs.installBtn.classList.remove('hidden');
});
refs.installBtn.addEventListener('click', async () => {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice;
  state.deferredInstallPrompt = null;
  refs.installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

updateCanvasSize();
drawWaveform();
refreshAll('Pronto.');
