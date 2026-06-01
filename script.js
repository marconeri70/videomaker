const $ = (id) => document.getElementById(id);

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
  timelineScale: $('timelineScale'),
  fpsSelect: $('fpsSelect'),
  fitMediaToAudioBtn: $('fitMediaToAudioBtn'),
  compactMediaBtn: $('compactMediaBtn'),
  addTextBtn: $('addTextBtn'),
  filterPreset: $('filterPreset'),
  transitionPreset: $('transitionPreset'),
  motionPreset: $('motionPreset'),
  transitionDuration: $('transitionDuration'),
  applyFxSelectedBtn: $('applyFxSelectedBtn'),
  applyFxAllBtn: $('applyFxAllBtn'),
  audioInfo: $('audioInfo'),
  audioVolume: $('audioVolume'),
  musicFadeSelect: $('musicFadeSelect'),
  previewAudioBtn: $('previewAudioBtn'),
  stopAudioBtn: $('stopAudioBtn'),
  statusText: $('statusText'),
  previewBtn: $('previewBtn'),
  stopPreviewBtn: $('stopPreviewBtn'),
  exportBtn: $('exportBtn'),
  exportMp4Btn: $('exportMp4Btn'),
  resetBtn: $('resetBtn'),
  installBtn: $('installBtn'),
  scrubRange: $('scrubRange'),
  currentTimeLabel: $('currentTimeLabel'),
  totalTimeLabel: $('totalTimeLabel'),
  progressBar: $('progressBar'),
  downloadBox: $('downloadBox'),
  downloadTitle: $('downloadTitle'),
  downloadMessage: $('downloadMessage'),
  downloadLink: $('downloadLink'),
  timelineEditor: $('timelineEditor'),
  durationBadge: $('durationBadge'),
  audioDurationBadge: $('audioDurationBadge'),
  inspector: $('inspector'),
  selectedInfo: $('selectedInfo'),
};

const state = {
  media: [],
  texts: [],
  selected: null,
  currentTime: 0,
  isPlaying: false,
  rafId: null,
  previewStartPerf: 0,
  previewStartTime: 0,
  deferredInstallPrompt: null,
  previewAudio: null,
  audio: {
    url: null,
    file: null,
    fileName: '',
    duration: 0,
    trimStart: 0,
    trimEnd: 0,
    timelineStart: 0,
    buffer: null,
    element: null,
  },
  ffmpeg: {
    instance: null,
    fetchFile: null,
    toBlobURL: null,
    loaded: false,
    loadingPromise: null,
  },
};

function uid(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function setStatus(message) {
  refs.statusText.textContent = message;
}

function pxPerSecond() {
  return Number(refs.timelineScale.value || 80);
}

function audioDuration() {
  if (!state.audio.url) return 0;
  return Math.max(0, Number(state.audio.trimEnd || 0) - Number(state.audio.trimStart || 0));
}

function projectDuration() {
  const mediaEnd = state.media.reduce((max, item) => Math.max(max, item.start + item.duration), 0);
  const textEnd = state.texts.reduce((max, item) => Math.max(max, item.start + item.duration), 0);
  const audioEnd = state.audio.url ? state.audio.timelineStart + audioDuration() : 0;
  return Math.max(mediaEnd, textEnd, audioEnd, 0);
}

function updateCanvasSize() {
  const [w, h] = refs.formatSelect.value.split('x').map(Number);
  stage.width = w;
  stage.height = h;
  drawFrame(state.currentTime);
}

function roundRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function objectFitCoverDimensions(mediaWidth, mediaHeight, boxWidth, boxHeight, zoom = 1, panX = 0, panY = 0) {
  const safeW = Math.max(1, mediaWidth || boxWidth);
  const safeH = Math.max(1, mediaHeight || boxHeight);
  const scale = Math.max(boxWidth / safeW, boxHeight / safeH) * zoom;
  const width = safeW * scale;
  const height = safeH * scale;
  return {
    x: (boxWidth - width) / 2 + panX,
    y: (boxHeight - height) / 2 + panY,
    width,
    height,
  };
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
  ctx.fillText('VideoMaker Studio', w / 2, h / 2 - 44);
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `500 ${Math.round(w * 0.026)}px system-ui, sans-serif`;
  ctx.fillText('Aggiungi foto, video, audio e testi', w / 2, h / 2 + 34);
}

function filterToCanvas(filter) {
  switch (filter) {
    case 'cinema': return 'contrast(1.15) saturate(1.15) brightness(0.92)';
    case 'warm': return 'sepia(0.18) saturate(1.22) brightness(1.04)';
    case 'cold': return 'saturate(0.9) hue-rotate(185deg) brightness(1.02)';
    case 'bw': return 'grayscale(1) contrast(1.12)';
    case 'vintage': return 'sepia(0.42) contrast(1.08) saturate(0.84)';
    case 'dramatic': return 'contrast(1.32) saturate(1.05) brightness(0.86)';
    case 'softBlur': return 'blur(2px) brightness(1.04)';
    default: return 'none';
  }
}

function mediaAt(time) {
  return state.media
    .filter((item) => time >= item.start && time < item.start + item.duration)
    .sort((a, b) => a.start - b.start || state.media.indexOf(a) - state.media.indexOf(b))
    .at(-1) || null;
}

function activeTextsAt(time) {
  return state.texts.filter((item) => time >= item.start && time < item.start + item.duration);
}

function getMotion(scene, progress) {
  const w = stage.width;
  switch (scene.motion) {
    case 'zoomIn': return { zoom: 1 + progress * 0.12, panX: 0, panY: 0 };
    case 'zoomOut': return { zoom: 1.12 - progress * 0.12, panX: 0, panY: 0 };
    case 'panLeft': return { zoom: 1.12, panX: (0.5 - progress) * w * 0.08, panY: 0 };
    case 'panRight': return { zoom: 1.12, panX: (progress - 0.5) * w * 0.08, panY: 0 };
    case 'shake': return { zoom: 1.04, panX: Math.sin(progress * Math.PI * 28) * w * 0.01, panY: Math.cos(progress * Math.PI * 31) * w * 0.006 };
    default: return { zoom: 1, panX: 0, panY: 0 };
  }
}

function prepareVideoFrame(scene, localTime) {
  if (scene.type !== 'video' || !scene.element) return;
  const video = scene.element;
  const target = clamp((scene.trimStart || 0) + localTime, scene.trimStart || 0, scene.trimEnd || video.duration || localTime);
  if (!Number.isFinite(target)) return;
  if (Math.abs(video.currentTime - target) > 0.12) {
    try { video.currentTime = target; } catch (_) { /* ignore browser seek errors */ }
  }
  if (state.isPlaying && video.paused) {
    video.muted = true;
    video.play().catch(() => {});
  }
}

function pauseInactiveVideos(activeId) {
  state.media.forEach((item) => {
    if (item.type === 'video' && item.element && item.id !== activeId && !item.element.paused) {
      item.element.pause();
    }
  });
}

function drawMedia(scene, time) {
  if (!scene) {
    pauseInactiveVideos(null);
    drawEmpty();
    return;
  }

  const w = stage.width;
  const h = stage.height;
  const local = clamp(time - scene.start, 0, scene.duration);
  const progress = scene.duration > 0 ? clamp(local / scene.duration, 0, 1) : 0;
  const transitionDuration = clamp(scene.transitionDuration || 0, 0, Math.min(3, scene.duration / 2));
  const transitionProgress = transitionDuration > 0 ? clamp(local / transitionDuration, 0, 1) : 1;
  const mediaEl = scene.element;

  prepareVideoFrame(scene, local);
  pauseInactiveVideos(scene.id);

  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  let alpha = 1;
  let clipW = w;
  let offsetX = 0;
  let transitionZoom = 1;
  if (transitionProgress < 1) {
    if (scene.transition === 'fade') alpha = transitionProgress;
    if (scene.transition === 'slide') offsetX = (1 - transitionProgress) * w;
    if (scene.transition === 'zoom') transitionZoom = 1.22 - transitionProgress * 0.22;
    if (scene.transition === 'wipe') clipW = Math.max(1, w * transitionProgress);
  }

  const motion = getMotion(scene, progress);
  const zoom = (scene.zoom || 1) * motion.zoom * transitionZoom;
  const mediaW = scene.type === 'image' ? mediaEl.naturalWidth : mediaEl.videoWidth;
  const mediaH = scene.type === 'image' ? mediaEl.naturalHeight : mediaEl.videoHeight;
  const box = objectFitCoverDimensions(mediaW, mediaH, w, h, zoom, motion.panX + offsetX, motion.panY);

  ctx.globalAlpha = alpha;
  ctx.filter = filterToCanvas(scene.filter);
  if (scene.transition === 'wipe' && transitionProgress < 1) {
    ctx.beginPath();
    ctx.rect(0, 0, clipW, h);
    ctx.clip();
  }
  try {
    ctx.drawImage(mediaEl, box.x, box.y, box.width, box.height);
  } catch (_) {
    drawEmpty();
  }
  ctx.restore();
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
  return lines.slice(0, 8);
}

function drawTextItem(item, time) {
  const text = item.text?.trim();
  if (!text) return;
  const w = stage.width;
  const h = stage.height;
  const local = clamp(time - item.start, 0, item.duration);
  const progress = item.duration > 0 ? clamp(local / item.duration, 0, 1) : 1;
  const inOut = Math.min(1, progress * 5, (1 - progress) * 5);
  const fontSize = Math.max(18, Math.round((Number(item.fontSize) || 64) * (w / 1080)));
  const lineHeight = fontSize * 1.18;
  const maxWidth = w * clamp(item.maxWidth || 82, 25, 95) / 100;
  const x = w * clamp(item.x ?? 50, 0, 100) / 100;
  const y = h * clamp(item.y ?? 78, 0, 100) / 100;
  let scale = 1;
  let dx = 0;
  let alpha = 1;

  if (item.animation === 'fade') alpha = inOut;
  if (item.animation === 'pop') scale = 0.86 + inOut * 0.14;
  if (item.animation === 'slideUp') dx = 0;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + (item.animation === 'slideUp' ? (1 - inOut) * fontSize * 1.2 : 0));
  ctx.scale(scale, scale);
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(text, maxWidth);
  const blockHeight = lines.length * lineHeight;
  const padX = Math.round(w * 0.03);
  const padY = Math.round(fontSize * 0.58);

  if ((item.bgOpacity || 0) > 0) {
    ctx.fillStyle = `rgba(0,0,0,${clamp(item.bgOpacity, 0, 0.9)})`;
    roundRect(ctx, -maxWidth / 2 - padX, -blockHeight / 2 - padY, maxWidth + padX * 2, blockHeight + padY * 2, 30);
    ctx.fill();
  }

  lines.forEach((line, index) => {
    const yy = -blockHeight / 2 + index * lineHeight + lineHeight / 2;
    ctx.lineWidth = Math.max(5, fontSize * 0.09);
    ctx.strokeStyle = item.strokeColor || 'rgba(0,0,0,0.82)';
    ctx.strokeText(line, dx, yy);
    ctx.fillStyle = item.color || '#ffffff';
    ctx.fillText(line, dx, yy);
  });
  ctx.restore();
}

function drawFrame(time) {
  const scene = mediaAt(time);
  drawMedia(scene, time);
  activeTextsAt(time).forEach((item) => drawTextItem(item, time));
}

function updateDurationUi() {
  const total = projectDuration();
  state.currentTime = clamp(state.currentTime, 0, Math.max(0, total));
  refs.durationBadge.textContent = `Progetto ${formatLong(total)}`;
  refs.audioDurationBadge.textContent = `Audio ${formatLong(audioDuration())}`;
  refs.scrubRange.max = total.toFixed(2);
  refs.scrubRange.value = state.currentTime.toFixed(2);
  refs.currentTimeLabel.textContent = formatSeconds(state.currentTime);
  refs.totalTimeLabel.textContent = formatSeconds(total);
  refs.progressBar.style.width = total ? `${Math.min(100, (state.currentTime / total) * 100)}%` : '0%';
}


function createThumbFromElement(element, width = 176, height = 99) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  c.fillStyle = '#020617';
  c.fillRect(0, 0, width, height);
  const mediaW = element.naturalWidth || element.videoWidth || width;
  const mediaH = element.naturalHeight || element.videoHeight || height;
  const box = objectFitCoverDimensions(mediaW, mediaH, width, height, 1, 0, 0);
  try { c.drawImage(element, box.x, box.y, box.width, box.height); } catch (_) {}
  return canvas.toDataURL('image/jpeg', 0.72);
}

function repeatedImageThumbs(img, count = 5) {
  const thumb = createThumbFromElement(img);
  return Array.from({ length: count }, () => thumb);
}

function waitForVideoSeek(video, time) {
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done, { once: true });
    try { video.currentTime = time; } catch (_) { resolve(); }
    setTimeout(resolve, 900);
  });
}

async function buildVideoThumbs(url, duration, count = 6) {
  const video = document.createElement('video');
  video.src = url;
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  await new Promise((resolve) => {
    video.onloadedmetadata = resolve;
    video.onerror = resolve;
  });
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : video.duration || 1;
  const thumbs = [];
  for (let i = 0; i < count; i += 1) {
    const t = Math.min(Math.max(0.05, (safeDuration * (i + 0.5)) / count), Math.max(0.05, safeDuration - 0.05));
    await waitForVideoSeek(video, t);
    thumbs.push(createThumbFromElement(video));
  }
  return thumbs;
}

function renderClipThumbs(item) {
  const thumbs = item.thumbnails?.length ? item.thumbnails : [];
  if (!thumbs.length) {
    return `<div class="clip-thumb-placeholder">${item.type === 'image' ? '📷' : '🎬'}</div>`;
  }
  return `<div class="clip-thumbs">${thumbs.slice(0, 7).map((src) => `<span class="clip-thumb" style="background-image:url('${src}')"></span>`).join('')}</div>`;
}

function createMediaClip(file, type) {
  const url = URL.createObjectURL(file);
  const start = nextMediaStart();
  const base = {
    id: uid(type),
    type,
    fileName: file.name,
    url,
    start,
    duration: Number(refs.defaultDuration.value || 4),
    filter: 'none',
    transition: 'fade',
    transitionDuration: 0.6,
    motion: 'zoomIn',
    zoom: 1,
    trimStart: 0,
    trimEnd: 0,
    thumbnails: [],
    element: null,
  };

  if (type === 'image') {
    const img = new Image();
    img.onload = () => {
      base.width = img.naturalWidth;
      base.height = img.naturalHeight;
      base.thumbnails = repeatedImageThumbs(img);
      renderAll();
    };
    img.src = url;
    base.element = img;
    state.media.push(base);
    selectItem('media', base.id);
    renderAll();
  } else {
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = async () => {
      base.trimEnd = Number.isFinite(video.duration) ? video.duration : base.duration;
      base.duration = Math.min(Math.max(1, base.trimEnd - base.trimStart), 8);
      base.width = video.videoWidth;
      base.height = video.videoHeight;
      renderAll();
      try {
        base.thumbnails = await buildVideoThumbs(url, base.trimEnd, 6);
        renderAll();
      } catch (error) {
        console.warn('Miniature video non generate', error);
      }
    };
    base.element = video;
    state.media.push(base);
    selectItem('media', base.id);
    renderAll();
  }
}

function nextMediaStart() {
  return state.media.reduce((max, item) => Math.max(max, item.start + item.duration), 0);
}

async function handleImages(event) {
  const files = Array.from(event.target.files || []);
  files.forEach((file) => createMediaClip(file, 'image'));
  event.target.value = '';
}

async function handleVideos(event) {
  const files = Array.from(event.target.files || []);
  files.forEach((file) => createMediaClip(file, 'video'));
  event.target.value = '';
}

async function handleAudio(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const audio = new Audio(url);
  audio.preload = 'metadata';
  audio.onloadedmetadata = async () => {
    state.audio.url = url;
    state.audio.file = file;
    state.audio.fileName = file.name;
    state.audio.duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    state.audio.trimStart = 0;
    state.audio.trimEnd = state.audio.duration;
    state.audio.timelineStart = 0;
    state.audio.element = audio;
    refs.audioInfo.textContent = `${file.name} • ${formatSeconds(state.audio.duration)}`;
    await decodeAudioBuffer(file);
    drawWaveform();
    selectItem('audio', 'main');
    renderAll();
  };
  event.target.value = '';
}

async function decodeAudioBuffer(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    state.audio.buffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    await audioCtx.close();
  } catch (error) {
    console.warn('Impossibile decodificare audio', error);
    state.audio.buffer = null;
  }
}

function drawWaveform() {
  const w = waveform.width;
  const h = waveform.height;
  waveCtx.clearRect(0, 0, w, h);
  waveCtx.fillStyle = 'rgba(0,0,0,0.34)';
  waveCtx.fillRect(0, 0, w, h);
  if (!state.audio.buffer) {
    waveCtx.fillStyle = 'rgba(255,255,255,0.68)';
    waveCtx.font = '700 24px system-ui';
    waveCtx.textAlign = 'center';
    waveCtx.fillText('Carica un audio per vedere la forma d’onda', w / 2, h / 2);
    return;
  }
  const data = state.audio.buffer.getChannelData(0);
  const samples = 220;
  const block = Math.floor(data.length / samples);
  waveCtx.fillStyle = 'rgba(56,189,248,0.82)';
  for (let i = 0; i < samples; i += 1) {
    let sum = 0;
    for (let j = 0; j < block; j += 1) {
      sum += Math.abs(data[i * block + j] || 0);
    }
    const amp = sum / block;
    const barH = Math.max(2, amp * h * 2.2);
    const x = (i / samples) * w;
    waveCtx.fillRect(x, (h - barH) / 2, w / samples - 1, barH);
  }
  const startX = (state.audio.trimStart / state.audio.duration) * w;
  const endX = (state.audio.trimEnd / state.audio.duration) * w;
  waveCtx.fillStyle = 'rgba(0,0,0,0.44)';
  waveCtx.fillRect(0, 0, startX, h);
  waveCtx.fillRect(endX, 0, w - endX, h);
}

function addTextClip(start = state.currentTime) {
  const item = {
    id: uid('text'),
    text: 'Scrivi il tuo testo',
    start: clamp(start, 0, Math.max(projectDuration(), 30)),
    duration: 4,
    x: 50,
    y: 78,
    fontSize: 64,
    color: '#ffffff',
    strokeColor: 'rgba(0,0,0,0.82)',
    bgOpacity: 0.45,
    maxWidth: 82,
    animation: 'fade',
  };
  state.texts.push(item);
  selectItem('text', item.id);
  renderAll();
}

function selectItem(type, id) {
  state.selected = { type, id };
  renderTimeline();
  renderInspector();
  drawFrame(state.currentTime);
}

function selectedMedia() {
  if (state.selected?.type !== 'media') return null;
  return state.media.find((item) => item.id === state.selected.id) || null;
}

function selectedText() {
  if (state.selected?.type !== 'text') return null;
  return state.texts.find((item) => item.id === state.selected.id) || null;
}

function renderAll() {
  updateDurationUi();
  renderTimeline();
  renderInspector();
  drawFrame(state.currentTime);
}

function renderTimeline() {
  const total = Math.max(projectDuration(), 12);
  const scale = pxPerSecond();
  const width = Math.ceil(total * scale + 180);
  if (!state.media.length && !state.texts.length && !state.audio.url) {
    refs.timelineEditor.className = 'timeline-editor empty';
    refs.timelineEditor.innerHTML = '<p>Aggiungi foto, video o audio per iniziare il montaggio.</p>';
    return;
  }

  refs.timelineEditor.className = 'timeline-editor';
  refs.timelineEditor.innerHTML = `
    <div class="timeline-stage" style="width:${width + 106}px">
      <div class="ruler" style="width:${width}px">${renderTicks(total, scale)}</div>
      <div id="timelinePlayhead" class="playhead" style="left:${106 + state.currentTime * scale}px"></div>
      ${renderLane('Foto / Video', 'media', width, renderMediaBlocks(scale))}
      ${renderLane('Testi', 'text', width, renderTextBlocks(scale))}
      ${renderLane('Audio', 'audio', width, renderAudioBlock(scale))}
    </div>
  `;
  bindTimelineEvents();
}

function renderTicks(total, scale) {
  const maxSec = Math.ceil(total);
  let html = '';
  for (let sec = 0; sec <= maxSec; sec += 1) {
    const isMajor = sec % 5 === 0;
    html += `<div class="tick" style="left:${sec * scale}px; opacity:${isMajor ? 1 : 0.38}; height:${isMajor ? 36 : 16}px">${isMajor ? formatSeconds(sec) : ''}</div>`;
  }
  return html;
}

function renderLane(label, kind, width, content) {
  return `
    <div class="lane-row">
      <div class="lane-label">${label}</div>
      <div class="lane-track ${kind}-track" style="width:${width}px">${content}</div>
    </div>
  `;
}

function isSelected(type, id) {
  return state.selected?.type === type && state.selected?.id === id;
}

function renderMediaBlocks(scale) {
  return state.media.map((item) => {
    const left = item.start * scale;
    const width = Math.max(28, item.duration * scale);
    const icon = item.type === 'image' ? '📷' : '🎬';
    return `
      <div class="clip media ${isSelected('media', item.id) ? 'selected' : ''}" data-type="media" data-id="${item.id}" style="left:${left}px; width:${width}px">
        ${renderClipThumbs(item)}
        <div class="resize-handle left" data-mode="resize-left"></div>
        <div class="clip-content" data-mode="drag">
          <strong>${icon} ${escapeHtml(item.fileName)}</strong>
          <span>${formatSeconds(item.start)} • ${item.duration.toFixed(1)}s • ${labelFor(item.filter)} / ${labelFor(item.transition)}</span>
        </div>
        <div class="resize-handle right" data-mode="resize-right"></div>
      </div>
    `;
  }).join('');
}

function renderTextBlocks(scale) {
  return state.texts.map((item) => {
    const left = item.start * scale;
    const width = Math.max(28, item.duration * scale);
    return `
      <div class="clip text ${isSelected('text', item.id) ? 'selected' : ''}" data-type="text" data-id="${item.id}" style="left:${left}px; width:${width}px">
        <div class="resize-handle left" data-mode="resize-left"></div>
        <div class="clip-content" data-mode="drag">
          <strong>📝 ${escapeHtml(item.text || 'Testo')}</strong>
          <span>${formatSeconds(item.start)} • ${item.duration.toFixed(1)}s</span>
        </div>
        <div class="resize-handle right" data-mode="resize-right"></div>
      </div>
    `;
  }).join('');
}

function renderAudioBlock(scale) {
  if (!state.audio.url) return '';
  const left = state.audio.timelineStart * scale;
  const width = Math.max(28, audioDuration() * scale);
  return `
    <div class="clip audio ${isSelected('audio', 'main') ? 'selected' : ''}" data-type="audio" data-id="main" style="left:${left}px; width:${width}px">
      <div class="resize-handle left" data-mode="resize-left"></div>
      <div class="clip-content" data-mode="drag">
        <strong>🎵 ${escapeHtml(state.audio.fileName)}</strong>
        <span>${formatSeconds(state.audio.timelineStart)} • taglio ${formatSeconds(state.audio.trimStart)} - ${formatSeconds(state.audio.trimEnd)}</span>
      </div>
      <div class="resize-handle right" data-mode="resize-right"></div>
    </div>
  `;
}

function labelFor(value) {
  const map = {
    none: 'nessuno', cinema: 'cinema', warm: 'caldo', cold: 'freddo', bw: 'B/N', vintage: 'vintage', dramatic: 'drama', softBlur: 'soft',
    fade: 'fade', slide: 'slide', zoom: 'zoom', wipe: 'wipe', zoomIn: 'zoom+', zoomOut: 'zoom-', panLeft: 'pan sx', panRight: 'pan dx', shake: 'shake',
  };
  return map[value] || value || 'nessuno';
}

function bindTimelineEvents() {
  refs.timelineEditor.querySelectorAll('.clip').forEach((clip) => {
    clip.addEventListener('pointerdown', (event) => {
      const mode = event.target.dataset.mode || 'drag';
      beginTimelinePointer(event, clip.dataset.type, clip.dataset.id, mode);
    });
  });
}

function beginTimelinePointer(event, type, id, mode) {
  event.preventDefault();
  event.stopPropagation();
  selectItem(type, id);
  const scale = pxPerSecond();
  const startX = event.clientX;
  const initial = snapshotItem(type, id);
  const pointerId = event.pointerId;
  event.currentTarget?.setPointerCapture?.(pointerId);

  const onMove = (moveEvent) => {
    const dx = moveEvent.clientX - startX;
    const delta = dx / scale;
    applyTimelineChange(type, id, mode, initial, delta);
    updateDurationUi();
    renderTimeline();
    renderInspector();
    drawFrame(state.currentTime);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    renderAll();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp, { once: true });
}

function snapshotItem(type, id) {
  if (type === 'media') {
    const item = state.media.find((entry) => entry.id === id);
    return { start: item.start, duration: item.duration, trimStart: item.trimStart, trimEnd: item.trimEnd };
  }
  if (type === 'text') {
    const item = state.texts.find((entry) => entry.id === id);
    return { start: item.start, duration: item.duration };
  }
  return { timelineStart: state.audio.timelineStart, trimStart: state.audio.trimStart, trimEnd: state.audio.trimEnd };
}

function applyTimelineChange(type, id, mode, initial, delta) {
  const minDuration = 0.35;
  if (type === 'media') {
    const item = state.media.find((entry) => entry.id === id);
    if (!item) return;
    if (mode === 'drag') item.start = Math.max(0, initial.start + delta);
    if (mode === 'resize-right') item.duration = Math.max(minDuration, initial.duration + delta);
    if (mode === 'resize-left') {
      const newStart = Math.max(0, initial.start + delta);
      const end = initial.start + initial.duration;
      item.start = Math.min(newStart, end - minDuration);
      item.duration = Math.max(minDuration, end - item.start);
    }
    if (item.type === 'video') {
      const available = Math.max(minDuration, (item.trimEnd || item.duration) - (item.trimStart || 0));
      item.duration = Math.min(item.duration, available);
    }
  }
  if (type === 'text') {
    const item = state.texts.find((entry) => entry.id === id);
    if (!item) return;
    if (mode === 'drag') item.start = Math.max(0, initial.start + delta);
    if (mode === 'resize-right') item.duration = Math.max(minDuration, initial.duration + delta);
    if (mode === 'resize-left') {
      const newStart = Math.max(0, initial.start + delta);
      const end = initial.start + initial.duration;
      item.start = Math.min(newStart, end - minDuration);
      item.duration = Math.max(minDuration, end - item.start);
    }
  }
  if (type === 'audio' && state.audio.url) {
    const dur = state.audio.duration || 0;
    if (mode === 'drag') state.audio.timelineStart = Math.max(0, initial.timelineStart + delta);
    if (mode === 'resize-right') state.audio.trimEnd = clamp(initial.trimEnd + delta, state.audio.trimStart + minDuration, dur);
    if (mode === 'resize-left') {
      const newTrimStart = clamp(initial.trimStart + delta, 0, initial.trimEnd - minDuration);
      state.audio.timelineStart = Math.max(0, initial.timelineStart + delta);
      state.audio.trimStart = newTrimStart;
    }
    drawWaveform();
  }
}

function renderInspector() {
  const selected = state.selected;
  if (!selected) {
    refs.selectedInfo.textContent = 'Nessun elemento selezionato.';
    refs.inspector.className = 'inspector-empty';
    refs.inspector.innerHTML = '<p>Seleziona un blocco nella timeline per modificarlo.</p>';
    return;
  }
  refs.inspector.className = '';
  if (selected.type === 'media') return renderMediaInspector();
  if (selected.type === 'text') return renderTextInspector();
  if (selected.type === 'audio') return renderAudioInspector();
}

function renderMediaInspector() {
  const item = selectedMedia();
  if (!item) return;
  refs.selectedInfo.textContent = `${item.type === 'image' ? 'Foto' : 'Video'}: ${item.fileName}`;
  refs.inspector.innerHTML = `
    <div class="inspector-grid">
      <label>Inizio sulla timeline <input data-field="start" type="number" min="0" step="0.1" value="${item.start.toFixed(2)}"></label>
      <label>Durata clip <input data-field="duration" type="number" min="0.35" step="0.1" value="${item.duration.toFixed(2)}"></label>
      <label>Zoom <input data-field="zoom" type="number" min="1" max="2" step="0.05" value="${(item.zoom || 1).toFixed(2)}"></label>
      <label>Filtro
        <select data-field="filter">
          ${options(['none','cinema','warm','cold','bw','vintage','dramatic','softBlur'], item.filter)}
        </select>
      </label>
      <label>Transizione
        <select data-field="transition">
          ${options(['none','fade','slide','zoom','wipe'], item.transition)}
        </select>
      </label>
      <label>Durata transizione <input data-field="transitionDuration" type="number" min="0" max="3" step="0.1" value="${(item.transitionDuration || 0).toFixed(1)}"></label>
      <label>Effetto movimento
        <select data-field="motion">
          ${options(['none','zoomIn','zoomOut','panLeft','panRight','shake'], item.motion)}
        </select>
      </label>
      ${item.type === 'video' ? `
        <label>Taglio video da <input data-field="trimStart" type="number" min="0" step="0.1" value="${(item.trimStart || 0).toFixed(2)}"></label>
        <label>Taglio video a <input data-field="trimEnd" type="number" min="0" step="0.1" value="${(item.trimEnd || 0).toFixed(2)}"></label>
      ` : ''}
    </div>
    <div class="inspector-actions">
      <button id="makeTextFromClip" class="secondary">+ Testo sopra questa clip</button>
      <button id="duplicateSelected" class="ghost">Duplica</button>
      <button id="deleteSelected" class="danger">Elimina</button>
    </div>
  `;
  bindInspectorInputs('media', item);
  $('makeTextFromClip').onclick = () => addTextClip(item.start);
  $('duplicateSelected').onclick = duplicateSelected;
  $('deleteSelected').onclick = deleteSelected;
}

function renderTextInspector() {
  const item = selectedText();
  if (!item) return;
  refs.selectedInfo.textContent = `Testo: ${item.text.slice(0, 40)}`;
  refs.inspector.innerHTML = `
    <div class="inspector-grid">
      <label class="inspector-wide">Testo <textarea data-field="text">${escapeHtml(item.text)}</textarea></label>
      <label>Inizio <input data-field="start" type="number" min="0" step="0.1" value="${item.start.toFixed(2)}"></label>
      <label>Durata <input data-field="duration" type="number" min="0.35" step="0.1" value="${item.duration.toFixed(2)}"></label>
      <label>Grandezza <input data-field="fontSize" type="number" min="18" max="180" step="2" value="${item.fontSize}"></label>
      <label>Colore <input data-field="color" type="color" value="${item.color}"></label>
      <label>Posizione X <input data-field="x" type="range" min="0" max="100" step="1" value="${item.x}"></label>
      <label>Posizione Y <input data-field="y" type="range" min="0" max="100" step="1" value="${item.y}"></label>
      <label>Larghezza testo <input data-field="maxWidth" type="range" min="25" max="95" step="1" value="${item.maxWidth}"></label>
      <label>Sfondo <input data-field="bgOpacity" type="range" min="0" max="0.9" step="0.05" value="${item.bgOpacity}"></label>
      <label>Animazione
        <select data-field="animation">
          ${options(['none','fade','pop','slideUp'], item.animation)}
        </select>
      </label>
    </div>
    <div class="inspector-actions">
      <button id="duplicateSelected" class="ghost">Duplica</button>
      <button id="deleteSelected" class="danger">Elimina</button>
    </div>
  `;
  bindInspectorInputs('text', item);
  $('duplicateSelected').onclick = duplicateSelected;
  $('deleteSelected').onclick = deleteSelected;
}

function renderAudioInspector() {
  if (!state.audio.url) return;
  refs.selectedInfo.textContent = `Audio: ${state.audio.fileName}`;
  refs.inspector.innerHTML = `
    <div class="inspector-grid">
      <label>Inizio sulla timeline <input data-audio="timelineStart" type="number" min="0" step="0.1" value="${state.audio.timelineStart.toFixed(2)}"></label>
      <label>Taglio audio da <input data-audio="trimStart" type="number" min="0" step="0.1" value="${state.audio.trimStart.toFixed(2)}"></label>
      <label>Taglio audio a <input data-audio="trimEnd" type="number" min="0" step="0.1" value="${state.audio.trimEnd.toFixed(2)}"></label>
      <label>Volume <input id="audioVolumeInspector" data-audio="volume" type="range" min="0" max="1" step="0.05" value="${refs.audioVolume.value}"></label>
    </div>
    <div class="inspector-actions">
      <button id="fitFromInspector" class="secondary">Adatta foto/video a questo audio</button>
      <button id="deleteSelected" class="danger">Rimuovi audio</button>
    </div>
  `;
  refs.inspector.querySelectorAll('[data-audio]').forEach((input) => {
    input.addEventListener('input', () => {
      const field = input.dataset.audio;
      if (field === 'volume') refs.audioVolume.value = input.value;
      if (field === 'timelineStart') state.audio.timelineStart = Math.max(0, Number(input.value || 0));
      if (field === 'trimStart') state.audio.trimStart = clamp(input.value, 0, state.audio.trimEnd - 0.35);
      if (field === 'trimEnd') state.audio.trimEnd = clamp(input.value, state.audio.trimStart + 0.35, state.audio.duration);
      drawWaveform();
      renderAll();
    });
  });
  $('fitFromInspector').onclick = fitMediaToAudio;
  $('deleteSelected').onclick = deleteSelected;
}

function bindInspectorInputs(type, item) {
  refs.inspector.querySelectorAll('[data-field]').forEach((input) => {
    input.addEventListener('input', () => {
      const field = input.dataset.field;
      const numericFields = ['start','duration','zoom','transitionDuration','trimStart','trimEnd','fontSize','x','y','maxWidth','bgOpacity'];
      if (numericFields.includes(field)) item[field] = Number(input.value || 0);
      else item[field] = input.value;

      if (type === 'media') {
        item.start = Math.max(0, item.start || 0);
        item.duration = Math.max(0.35, item.duration || 0.35);
        item.zoom = clamp(item.zoom || 1, 1, 2);
        item.transitionDuration = clamp(item.transitionDuration || 0, 0, 3);
        if (item.type === 'video') {
          item.trimStart = clamp(item.trimStart || 0, 0, Math.max(0, item.trimEnd - 0.35));
          item.trimEnd = clamp(item.trimEnd || item.element?.duration || item.duration, item.trimStart + 0.35, item.element?.duration || item.trimEnd || item.duration);
          item.duration = Math.min(item.duration, item.trimEnd - item.trimStart);
        }
      }
      if (type === 'text') {
        item.start = Math.max(0, item.start || 0);
        item.duration = Math.max(0.35, item.duration || 0.35);
      }
      renderAll();
    });
  });
}

function options(values, selected) {
  const labels = {
    none: 'Nessuno', cinema: 'Cinema', warm: 'Caldo', cold: 'Freddo', bw: 'Bianco e nero', vintage: 'Vintage', dramatic: 'Drammatico', softBlur: 'Sfocato soft',
    fade: 'Dissolvenza', slide: 'Scorrimento', zoom: 'Zoom', wipe: 'Tendina', zoomIn: 'Zoom lento avanti', zoomOut: 'Zoom lento indietro', panLeft: 'Panoramica sinistra', panRight: 'Panoramica destra', shake: 'Vibrazione',
    pop: 'Pop', slideUp: 'Scorri dal basso',
  };
  return values.map((value) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${labels[value] || value}</option>`).join('');
}

function duplicateSelected() {
  if (!state.selected) return;
  if (state.selected.type === 'media') {
    const item = selectedMedia();
    if (!item) return;
    const copy = { ...item, id: uid(item.type), start: item.start + item.duration, element: item.element };
    state.media.push(copy);
    selectItem('media', copy.id);
  } else if (state.selected.type === 'text') {
    const item = selectedText();
    if (!item) return;
    const copy = { ...item, id: uid('text'), start: item.start + 0.5 };
    state.texts.push(copy);
    selectItem('text', copy.id);
  }
  renderAll();
}

function deleteSelected() {
  if (!state.selected) return;
  if (state.selected.type === 'media') state.media = state.media.filter((item) => item.id !== state.selected.id);
  if (state.selected.type === 'text') state.texts = state.texts.filter((item) => item.id !== state.selected.id);
  if (state.selected.type === 'audio') {
    stopAudioPreview();
    state.audio = { url: null, file: null, fileName: '', duration: 0, trimStart: 0, trimEnd: 0, timelineStart: 0, buffer: null, element: null };
    refs.audioInfo.textContent = 'Nessun audio caricato.';
    drawWaveform();
  }
  state.selected = null;
  renderAll();
}

function compactMedia() {
  let cursor = 0;
  state.media
    .sort((a, b) => a.start - b.start)
    .forEach((item) => {
      item.start = cursor;
      cursor += item.duration;
    });
  renderAll();
}

function fitMediaToAudio() {
  if (!state.media.length || !state.audio.url || audioDuration() <= 0) {
    setStatus('Carica almeno una clip e una traccia audio.');
    return;
  }
  const total = audioDuration();
  const each = Math.max(0.35, total / state.media.length);
  let cursor = state.audio.timelineStart;
  state.media
    .sort((a, b) => a.start - b.start)
    .forEach((item) => {
      item.start = cursor;
      item.duration = each;
      if (item.type === 'video') item.duration = Math.min(each, Math.max(0.35, item.trimEnd - item.trimStart));
      cursor += item.duration;
    });
  state.currentTime = state.audio.timelineStart;
  setStatus('Foto/video adattati alla lunghezza della traccia audio.');
  renderAll();
}

function applyEffectsToItem(item) {
  item.filter = refs.filterPreset.value;
  item.transition = refs.transitionPreset.value;
  item.motion = refs.motionPreset.value;
  item.transitionDuration = Number(refs.transitionDuration.value || 0);
}

function applyFxSelected() {
  const item = selectedMedia();
  if (!item) {
    setStatus('Seleziona prima una clip foto/video nella timeline.');
    return;
  }
  applyEffectsToItem(item);
  setStatus('Effetti applicati alla clip selezionata.');
  renderAll();
}

function applyFxAll() {
  if (!state.media.length) return;
  state.media.forEach(applyEffectsToItem);
  setStatus('Effetti applicati a tutte le clip.');
  renderAll();
}

function updatePlayheadFromScrub() {
  state.currentTime = Number(refs.scrubRange.value || 0);
  updateDurationUi();
  drawFrame(state.currentTime);
  if (state.isPlaying) syncAudioToTimeline();
}

function startPreview() {
  const total = projectDuration();
  if (total <= 0) {
    setStatus('Aggiungi contenuti prima di avviare l’anteprima.');
    return;
  }
  stopPreview(false);
  state.isPlaying = true;
  state.previewStartTime = state.currentTime;
  state.previewStartPerf = performance.now();
  syncAudioToTimeline();
  setStatus('Anteprima in riproduzione...');
  const loop = (now) => {
    if (!state.isPlaying) return;
    const elapsed = (now - state.previewStartPerf) / 1000;
    state.currentTime = state.previewStartTime + elapsed;
    if (state.currentTime >= total) {
      state.currentTime = total;
      stopPreview(false);
      renderAll();
      setStatus('Anteprima terminata.');
      return;
    }
    drawFrame(state.currentTime);
    updateDurationUi();
    syncAudioToTimeline(false);
    state.rafId = requestAnimationFrame(loop);
  };
  state.rafId = requestAnimationFrame(loop);
}

function stopPreview(redraw = true) {
  state.isPlaying = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = null;
  stopAudioPreview();
  pauseInactiveVideos(null);
  if (redraw) {
    setStatus('Anteprima fermata.');
    renderAll();
  }
}

function syncAudioToTimeline(forceRestart = true) {
  if (!state.audio.element || !state.audio.url) return;
  const audio = state.audio.element;
  const t = state.currentTime;
  const audioStart = state.audio.timelineStart;
  const audioEnd = audioStart + audioDuration();
  if (t < audioStart || t > audioEnd) {
    audio.pause();
    return;
  }
  const target = state.audio.trimStart + (t - audioStart);
  audio.volume = Number(refs.audioVolume.value || 0.85);
  if (Math.abs(audio.currentTime - target) > 0.18 || forceRestart) {
    audio.currentTime = target;
  }
  if (audio.paused) audio.play().catch(() => {});
}

function previewAudioOnly() {
  if (!state.audio.element) {
    setStatus('Carica prima un audio.');
    return;
  }
  stopAudioPreview();
  const audio = state.audio.element;
  audio.currentTime = state.audio.trimStart;
  audio.volume = Number(refs.audioVolume.value || 0.85);
  audio.play().catch(() => {});
  state.previewAudio = audio;
  const stopAt = state.audio.trimEnd;
  const checker = setInterval(() => {
    if (!state.previewAudio || audio.paused || audio.currentTime >= stopAt) {
      clearInterval(checker);
      stopAudioPreview();
    }
  }, 100);
}

function stopAudioPreview() {
  if (state.audio.element) state.audio.element.pause();
  if (state.previewAudio) state.previewAudio.pause();
  state.previewAudio = null;
}

async function buildAudioStream(total) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const destination = audioCtx.createMediaStreamDestination();
  const audio = state.audio;

  if (!audio.buffer || !audio.url || audioDuration() <= 0) {
    return { audioCtx, stream: destination.stream, start: () => {} };
  }

  const source = audioCtx.createBufferSource();
  source.buffer = audio.buffer;
  const gain = audioCtx.createGain();
  const volume = Number(refs.audioVolume.value || 0.85);
  const fade = Number(refs.musicFadeSelect.value || 0);
  const startAt = Math.max(0, audio.timelineStart);
  const duration = Math.min(audioDuration(), Math.max(0, total - startAt));
  source.connect(gain);
  gain.connect(destination);

  return {
    audioCtx,
    stream: destination.stream,
    start: () => {
      const now = audioCtx.currentTime;
      gain.gain.setValueAtTime(volume, now + startAt);
      if (fade > 0) {
        gain.gain.setValueAtTime(0.0001, now + startAt);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + startAt + Math.min(fade, duration / 2));
        gain.gain.setValueAtTime(volume, now + startAt + Math.max(0, duration - fade));
        gain.gain.exponentialRampToValueAtTime(0.0001, now + startAt + duration);
      }
      try { source.start(now + startAt, audio.trimStart, duration); } catch (_) { /* ignore duplicate start */ }
    },
  };
}

function setExportButtons(disabled) {
  refs.exportBtn.disabled = disabled;
  refs.exportMp4Btn.disabled = disabled;
}

function prepareDownload(blob, extension, message) {
  const url = URL.createObjectURL(blob);
  refs.downloadLink.href = url;
  refs.downloadLink.download = `videomaker-studio-${Date.now()}.${extension}`;
  refs.downloadLink.textContent = `Scarica video ${extension.toUpperCase()}`;
  refs.downloadTitle.textContent = `Video ${extension.toUpperCase()} pronto ✅`;
  refs.downloadMessage.textContent = message;
  refs.downloadBox.classList.remove('hidden');
}

async function recordWebmBlob(total) {
  const fps = Number(refs.fpsSelect.value || 30);
  const canvasStream = stage.captureStream(fps);
  const audioPackage = await buildAudioStream(total);
  const tracks = [...canvasStream.getVideoTracks(), ...audioPackage.stream.getAudioTracks()];
  const mixedStream = new MediaStream(tracks);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';
  const recorder = new MediaRecorder(mixedStream, { mimeType });
  const chunks = [];

  return new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) chunks.push(event.data);
    };
    recorder.onerror = (event) => reject(event.error || new Error('Errore durante la registrazione WEBM.'));
    recorder.onstop = async () => {
      try { await audioPackage.audioCtx.close(); } catch (_) {}
      mixedStream.getTracks().forEach((track) => track.stop());
      resolve(new Blob(chunks, { type: 'video/webm' }));
    };

    recorder.start(500);
    audioPackage.start();
    const start = performance.now();
    const render = (now) => {
      const elapsed = (now - start) / 1000;
      const t = Math.min(total, elapsed);
      state.currentTime = t;
      drawFrame(t);
      updateDurationUi();
      refs.progressBar.style.width = `${Math.min(100, (t / total) * 100)}%`;
      if (elapsed < total) {
        requestAnimationFrame(render);
      } else {
        setTimeout(() => recorder.stop(), 180);
      }
    };
    requestAnimationFrame(render);
  });
}

async function loadFfmpeg() {
  if (state.ffmpeg.loaded) return state.ffmpeg;
  if (state.ffmpeg.loadingPromise) return state.ffmpeg.loadingPromise;

  state.ffmpeg.loadingPromise = (async () => {
    setStatus('Caricamento motore MP4 nel browser...');
    const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([
      import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js'),
      import('https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js'),
    ]);
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message));
    ffmpeg.on('progress', ({ progress }) => {
      if (Number.isFinite(progress)) refs.progressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    });
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    state.ffmpeg.instance = ffmpeg;
    state.ffmpeg.fetchFile = fetchFile;
    state.ffmpeg.toBlobURL = toBlobURL;
    state.ffmpeg.loaded = true;
    return state.ffmpeg;
  })();

  return state.ffmpeg.loadingPromise;
}

async function convertWebmToMp4(webmBlob) {
  const ffmpegState = await loadFfmpeg();
  const ffmpeg = ffmpegState.instance;
  const fetchFile = ffmpegState.fetchFile;
  const input = `input-${Date.now()}.webm`;
  const output = `output-${Date.now()}.mp4`;
  await ffmpeg.writeFile(input, await fetchFile(webmBlob));
  setStatus('Conversione MP4 in corso...');
  refs.progressBar.style.width = '0%';

  const primary = ['-y', '-i', input, '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', output];
  const fallback = ['-y', '-i', input, '-c:v', 'mpeg4', '-q:v', '5', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', output];

  try {
    await ffmpeg.exec(primary);
  } catch (error) {
    console.warn('Conversione libx264 non riuscita, provo fallback MPEG-4', error);
    await ffmpeg.exec(fallback);
  }

  const data = await ffmpeg.readFile(output);
  try { await ffmpeg.deleteFile(input); } catch (_) {}
  try { await ffmpeg.deleteFile(output); } catch (_) {}
  return new Blob([data.buffer], { type: 'video/mp4' });
}

async function exportVideo(format = 'webm') {
  const total = projectDuration();
  if (total <= 0) {
    setStatus('Aggiungi almeno una foto, video, testo o audio.');
    return;
  }
  stopPreview(false);
  setExportButtons(true);
  refs.downloadBox.classList.add('hidden');
  refs.progressBar.style.width = '0%';
  setStatus(format === 'mp4' ? 'Creo il video base prima della conversione MP4...' : 'Esportazione WEBM in corso...');

  try {
    const webmBlob = await recordWebmBlob(total);
    if (format === 'mp4') {
      const mp4Blob = await convertWebmToMp4(webmBlob);
      prepareDownload(mp4Blob, 'mp4', 'Il file MP4 è stato generato direttamente nel browser. Su progetti lunghi può richiedere più tempo e memoria.');
      setStatus('Video MP4 esportato correttamente.');
    } else {
      prepareDownload(webmBlob, 'webm', 'Il file WEBM è stato generato direttamente dal browser.');
      setStatus('Video WEBM esportato correttamente.');
    }
  } catch (error) {
    console.error(error);
    setStatus(`Errore esportazione: ${error.message || error}`);
  } finally {
    setExportButtons(false);
    updateDurationUi();
  }
}

function resetProject() {
  if (!confirm('Vuoi cancellare tutto il progetto?')) return;
  stopPreview(false);
  state.media.forEach((item) => item.url && URL.revokeObjectURL(item.url));
  if (state.audio.url) URL.revokeObjectURL(state.audio.url);
  state.media = [];
  state.texts = [];
  state.selected = null;
  state.currentTime = 0;
  state.audio = { url: null, file: null, fileName: '', duration: 0, trimStart: 0, trimEnd: 0, timelineStart: 0, buffer: null, element: null };
  refs.audioInfo.textContent = 'Nessun audio caricato.';
  refs.downloadBox.classList.add('hidden');
  drawWaveform();
  renderAll();
  setStatus('Progetto pulito.');
}

function bindEvents() {
  refs.imageInput.addEventListener('change', handleImages);
  refs.videoInput.addEventListener('change', handleVideos);
  refs.audioInput.addEventListener('change', handleAudio);
  refs.formatSelect.addEventListener('change', updateCanvasSize);
  refs.timelineScale.addEventListener('input', renderTimeline);
  refs.scrubRange.addEventListener('input', updatePlayheadFromScrub);
  refs.previewBtn.addEventListener('click', startPreview);
  refs.stopPreviewBtn.addEventListener('click', () => stopPreview(true));
  refs.exportBtn.addEventListener('click', () => exportVideo('webm'));
  refs.exportMp4Btn.addEventListener('click', () => exportVideo('mp4'));
  refs.resetBtn.addEventListener('click', resetProject);
  refs.fitMediaToAudioBtn.addEventListener('click', fitMediaToAudio);
  refs.compactMediaBtn.addEventListener('click', compactMedia);
  refs.addTextBtn.addEventListener('click', () => addTextClip(state.currentTime));
  refs.applyFxSelectedBtn.addEventListener('click', applyFxSelected);
  refs.applyFxAllBtn.addEventListener('click', applyFxAll);
  refs.previewAudioBtn.addEventListener('click', previewAudioOnly);
  refs.stopAudioBtn.addEventListener('click', stopAudioPreview);
  refs.audioVolume.addEventListener('input', () => {
    if (state.audio.element) state.audio.element.volume = Number(refs.audioVolume.value || 0.85);
    renderInspector();
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
}

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  }
}

function init() {
  bindEvents();
  updateCanvasSize();
  drawWaveform();
  renderAll();
  initServiceWorker();
}

init();
