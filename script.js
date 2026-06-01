const $ = (id) => document.getElementById(id);

const state = {
  scenes: [],
  audioUrl: null,
  audioFileName: '',
  isPlaying: false,
  deferredInstallPrompt: null,
};

const stage = $('stage');
const ctx = stage.getContext('2d');

const imageInput = $('imageInput');
const videoInput = $('videoInput');
const audioInput = $('audioInput');
const timeline = $('timeline');
const durationBadge = $('durationBadge');
const statusText = $('statusText');
const progressBar = $('progressBar');
const downloadBox = $('downloadBox');
const downloadLink = $('downloadLink');
const formatSelect = $('formatSelect');
const defaultDuration = $('defaultDuration');
const fadeDuration = $('fadeDuration');
const audioVolume = $('audioVolume');
const bulkText = $('bulkText');
const watermarkCheck = $('watermarkCheck');
const videoAudioCheck = $('videoAudioCheck');
const previewBtn = $('previewBtn');
const exportBtn = $('exportBtn');
const resetBtn = $('resetBtn');
const applyTextBtn = $('applyTextBtn');
const installBtn = $('installBtn');

function setStatus(message) {
  statusText.textContent = message;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatSeconds(seconds) {
  if (!Number.isFinite(seconds)) return '0s';
  const min = Math.floor(seconds / 60);
  const sec = Math.round(seconds % 60);
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function totalDuration() {
  return state.scenes.reduce((sum, scene) => sum + Number(scene.duration || 0), 0);
}

function updateCanvasSize() {
  const [w, h] = formatSelect.value.split('x').map(Number);
  stage.width = w;
  stage.height = h;
  drawEmpty();
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
  ctx.font = `800 ${Math.round(w * 0.055)}px system-ui, sans-serif`;
  ctx.fillText('VideoMaker', w / 2, h / 2 - 40);
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `500 ${Math.round(w * 0.026)}px system-ui, sans-serif`;
  ctx.fillText('Aggiungi foto, video, audio e testi', w / 2, h / 2 + 35);
}

function objectFitCoverDimensions(mediaWidth, mediaHeight, boxWidth, boxHeight, zoom = 1) {
  const scale = Math.max(boxWidth / mediaWidth, boxHeight / mediaHeight) * zoom;
  const width = mediaWidth * scale;
  const height = mediaHeight * scale;
  return {
    x: (boxWidth - width) / 2,
    y: (boxHeight - height) / 2,
    width,
    height,
  };
}

function wrapText(text, maxWidth, fontSize) {
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
  return lines.slice(0, 5);
}

function drawTextOverlay(text) {
  if (!text) return;
  const w = stage.width;
  const h = stage.height;
  const fontSize = Math.max(32, Math.round(w * 0.052));
  const lineHeight = fontSize * 1.18;
  const maxWidth = w * 0.82;
  ctx.font = `900 ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = wrapText(text, maxWidth, fontSize);
  const blockHeight = lines.length * lineHeight;
  const yStart = h * 0.79 - blockHeight / 2;
  const padX = 34;
  const padY = 28;

  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  roundRect(ctx, w / 2 - maxWidth / 2 - padX, yStart - padY, maxWidth + padX * 2, blockHeight + padY * 2, 32);
  ctx.fill();

  lines.forEach((line, index) => {
    const y = yStart + index * lineHeight + lineHeight / 2;
    ctx.lineWidth = Math.max(7, fontSize * 0.11);
    ctx.strokeStyle = 'rgba(0,0,0,0.72)';
    ctx.strokeText(line, w / 2, y);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(line, w / 2, y);
  });
  ctx.restore();
}

function drawWatermark() {
  if (!watermarkCheck.checked) return;
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

function roundRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
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
  return last ? { scene: last, localTime: Number(last.duration || 0), start: totalDuration() - Number(last.duration || 0), end: totalDuration() } : null;
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

  const media = scene.media;
  if (scene.type === 'image' && media?.complete) {
    const progress = Math.min(1, localTime / Math.max(0.01, scene.duration));
    const zoom = 1.02 + progress * 0.08;
    const fit = objectFitCoverDimensions(media.naturalWidth, media.naturalHeight, w, h, zoom);
    ctx.drawImage(media, fit.x, fit.y, fit.width, fit.height);
  }

  if (scene.type === 'video' && media?.readyState >= 2) {
    const mw = media.videoWidth || w;
    const mh = media.videoHeight || h;
    const fit = objectFitCoverDimensions(mw, mh, w, h, 1);
    ctx.drawImage(media, fit.x, fit.y, fit.width, fit.height);
  }

  const fade = Math.min(Number(fadeDuration.value || 0), Number(scene.duration || 0) / 2);
  if (fade > 0) {
    let alpha = 0;
    if (localTime < fade) alpha = 1 - localTime / fade;
    if (scene.duration - localTime < fade) alpha = Math.max(alpha, 1 - (scene.duration - localTime) / fade);
    if (alpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(1, alpha)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawTextOverlay(scene.text);
  drawWatermark();
}

async function addImageFiles(files) {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.src = url;
    await image.decode().catch(() => {});
    state.scenes.push({
      id: crypto.randomUUID(),
      type: 'image',
      file,
      url,
      media: image,
      name: file.name,
      duration: Number(defaultDuration.value || 4),
      text: '',
    });
  }
  renderTimeline();
  drawFrame(0);
}

async function addVideoFiles(files) {
  for (const file of files) {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.src = url;
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    await new Promise((resolve) => {
      video.onloadedmetadata = resolve;
      video.onerror = resolve;
      setTimeout(resolve, 1800);
    });
    state.scenes.push({
      id: crypto.randomUUID(),
      type: 'video',
      file,
      url,
      media: video,
      name: file.name,
      duration: Number.isFinite(video.duration) && video.duration > 0 ? Math.min(60, Math.round(video.duration)) : 6,
      text: '',
    });
  }
  renderTimeline();
  drawFrame(0);
}

function setAudioFile(file) {
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.audioUrl = URL.createObjectURL(file);
  state.audioFileName = file.name;
  setStatus(`Audio caricato: ${file.name}`);
}

function renderTimeline() {
  const total = totalDuration();
  durationBadge.textContent = formatSeconds(total);
  if (!state.scenes.length) {
    timeline.className = 'timeline empty';
    timeline.innerHTML = '<p>Aggiungi foto o video per iniziare.</p>';
    return;
  }

  timeline.className = 'timeline';
  timeline.innerHTML = state.scenes.map((scene, index) => `
    <article class="scene-card" data-id="${scene.id}">
      ${scene.type === 'image'
        ? `<img class="thumb" src="${scene.url}" alt="Anteprima" />`
        : `<video class="thumb" src="${scene.url}" muted playsinline></video>`}
      <div class="scene-fields">
        <div class="scene-title">
          <span>${index + 1}. ${scene.type === 'image' ? 'Foto' : 'Video'}</span>
          <small>${escapeHtml(scene.name)}</small>
        </div>
        <div class="inline-fields">
          <label>Durata <input data-action="duration" type="number" min="1" max="90" step="1" value="${scene.duration}" /></label>
          <label>Testo <input data-action="text" type="text" value="${escapeHtml(scene.text)}" placeholder="Testo su questa scena" /></label>
        </div>
        <div class="scene-actions">
          <button class="secondary" data-action="up">↑ Su</button>
          <button class="secondary" data-action="down">↓ Giù</button>
          <button class="danger" data-action="delete">Elimina</button>
        </div>
      </div>
    </article>
  `).join('');
}

function findSceneByCard(element) {
  const card = element.closest('.scene-card');
  if (!card) return null;
  const index = state.scenes.findIndex((scene) => scene.id === card.dataset.id);
  return { card, index, scene: state.scenes[index] };
}

function moveScene(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.scenes.length) return;
  const [scene] = state.scenes.splice(index, 1);
  state.scenes.splice(newIndex, 0, scene);
  renderTimeline();
  drawFrame(0);
}

async function resetVideosForPlayback() {
  for (const scene of state.scenes) {
    if (scene.type === 'video') {
      scene.media.pause();
      scene.media.currentTime = 0;
      scene.media.muted = true;
    }
  }
}

async function syncVideos(globalTime, includeAudio = false) {
  const current = sceneAt(globalTime);
  for (const scene of state.scenes) {
    if (scene.type !== 'video') continue;
    const video = scene.media;
    if (current?.scene?.id === scene.id) {
      const localTime = Math.min(Math.max(0, current.localTime), Math.max(0, video.duration || scene.duration) - 0.05);
      if (Math.abs((video.currentTime || 0) - localTime) > 0.28) {
        try { video.currentTime = localTime; } catch {}
      }
      video.muted = !includeAudio;
      if (video.paused) {
        await video.play().catch(() => {});
      }
    } else {
      video.pause();
    }
  }
}

async function playPreview() {
  if (!state.scenes.length) {
    setStatus('Aggiungi almeno una foto o un video.');
    return;
  }
  if (state.isPlaying) return;
  state.isPlaying = true;
  previewBtn.disabled = true;
  exportBtn.disabled = true;
  downloadBox.classList.add('hidden');
  setStatus('Anteprima in riproduzione...');
  await resetVideosForPlayback();

  const total = totalDuration();
  const start = performance.now();

  const loop = async (now) => {
    if (!state.isPlaying) return;
    const elapsed = Math.min(total, (now - start) / 1000);
    await syncVideos(elapsed, false);
    drawFrame(elapsed);
    progressBar.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
    if (elapsed < total) {
      requestAnimationFrame(loop);
    } else {
      state.isPlaying = false;
      previewBtn.disabled = false;
      exportBtn.disabled = false;
      setStatus('Anteprima completata.');
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

async function createAudioMixStream() {
  const audioCtx = new AudioContext();
  const destination = audioCtx.createMediaStreamDestination();

  const cleanup = [];
  const videoAudioMap = new Map();

  if (state.audioUrl) {
    const audio = new Audio(state.audioUrl);
    audio.crossOrigin = 'anonymous';
    audio.loop = false;
    audio.volume = 1;
    const source = audioCtx.createMediaElementSource(audio);
    const gain = audioCtx.createGain();
    gain.gain.value = Number(audioVolume.value || 0.8);
    source.connect(gain).connect(destination);
    cleanup.push(() => { audio.pause(); audio.src = ''; });
    cleanup.audio = audio;
  }

  if (videoAudioCheck.checked) {
    for (const scene of state.scenes) {
      if (scene.type !== 'video') continue;
      const videoAudio = document.createElement('video');
      videoAudio.src = scene.url;
      videoAudio.preload = 'auto';
      videoAudio.playsInline = true;
      videoAudio.muted = false;
      videoAudio.volume = 1;
      const source = audioCtx.createMediaElementSource(videoAudio);
      source.connect(destination);
      videoAudioMap.set(scene.id, videoAudio);
      cleanup.push(() => { videoAudio.pause(); videoAudio.src = ''; });
    }
  }

  await audioCtx.resume();
  return { audioCtx, destination, cleanup, videoAudioMap };
}

async function syncVideoAudioPlayers(globalTime, videoAudioMap) {
  if (!videoAudioMap || !videoAudioMap.size) return;
  const current = sceneAt(globalTime);
  for (const [sceneId, media] of videoAudioMap.entries()) {
    if (current?.scene?.id === sceneId) {
      const scene = current.scene;
      const localTime = Math.min(Math.max(0, current.localTime), Math.max(0, media.duration || scene.duration) - 0.05);
      if (Number.isFinite(localTime) && Math.abs((media.currentTime || 0) - localTime) > 0.28) {
        try { media.currentTime = localTime; } catch {}
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

  downloadBox.classList.add('hidden');
  previewBtn.disabled = true;
  exportBtn.disabled = true;
  setStatus('Preparazione esportazione...');
  progressBar.style.width = '0%';

  await resetVideosForPlayback();
  const total = totalDuration();
  const fps = 30;
  const canvasStream = stage.captureStream(fps);
  const finalStream = new MediaStream(canvasStream.getVideoTracks());
  const audioMix = await createAudioMixStream();
  for (const track of audioMix.destination.stream.getAudioTracks()) {
    finalStream.addTrack(track);
  }

  const chunks = [];
  const mimeType = supportedMimeType();
  const recorder = new MediaRecorder(finalStream, mimeType ? { mimeType, videoBitsPerSecond: 8_000_000 } : undefined);

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };

  const recordingDone = new Promise((resolve) => {
    recorder.onstop = resolve;
  });

  recorder.start(250);
  setStatus('Esportazione in corso... non chiudere la pagina.');

  if (audioMix.cleanup.audio) {
    audioMix.cleanup.audio.currentTime = 0;
    await audioMix.cleanup.audio.play().catch(() => {});
  }

  const start = performance.now();
  await new Promise((resolve) => {
    const loop = async (now) => {
      const elapsed = Math.min(total, (now - start) / 1000);
      await syncVideos(elapsed, false);
      await syncVideoAudioPlayers(elapsed, audioMix.videoAudioMap);
      drawFrame(elapsed);
      progressBar.style.width = `${Math.min(100, (elapsed / total) * 100)}%`;
      if (elapsed < total) {
        requestAnimationFrame(loop);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(loop);
  });

  recorder.stop();
  await recordingDone;
  for (const track of finalStream.getTracks()) track.stop();
  for (const fn of audioMix.cleanup) fn();
  await audioMix.audioCtx.close().catch(() => {});
  await resetVideosForPlayback();

  const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
  const url = URL.createObjectURL(blob);
  downloadLink.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadLink.download = `videomaker-${stamp}.webm`;
  downloadBox.classList.remove('hidden');
  setStatus('Video esportato correttamente.');
  previewBtn.disabled = false;
  exportBtn.disabled = false;
}

imageInput.addEventListener('change', (event) => addImageFiles(event.target.files));
videoInput.addEventListener('change', (event) => addVideoFiles(event.target.files));
audioInput.addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (file) setAudioFile(file);
});

formatSelect.addEventListener('change', updateCanvasSize);
previewBtn.addEventListener('click', playPreview);
exportBtn.addEventListener('click', exportVideo);
resetBtn.addEventListener('click', async () => {
  await resetVideosForPlayback();
  for (const scene of state.scenes) URL.revokeObjectURL(scene.url);
  if (state.audioUrl) URL.revokeObjectURL(state.audioUrl);
  state.scenes = [];
  state.audioUrl = null;
  state.audioFileName = '';
  bulkText.value = '';
  renderTimeline();
  drawEmpty();
  progressBar.style.width = '0%';
  downloadBox.classList.add('hidden');
  setStatus('Progetto pulito.');
});

applyTextBtn.addEventListener('click', () => {
  const value = bulkText.value.trim();
  state.scenes.forEach((scene) => { scene.text = value; });
  renderTimeline();
  drawFrame(0);
});

timeline.addEventListener('input', (event) => {
  const result = findSceneByCard(event.target);
  if (!result?.scene) return;
  const action = event.target.dataset.action;
  if (action === 'duration') {
    result.scene.duration = Math.max(1, Number(event.target.value || 1));
    durationBadge.textContent = formatSeconds(totalDuration());
  }
  if (action === 'text') {
    result.scene.text = event.target.value;
  }
  drawFrame(0);
});

timeline.addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  const result = findSceneByCard(event.target);
  if (!result?.scene) return;
  if (action === 'delete') {
    URL.revokeObjectURL(result.scene.url);
    state.scenes.splice(result.index, 1);
    renderTimeline();
    drawFrame(0);
  }
  if (action === 'up') moveScene(result.index, -1);
  if (action === 'down') moveScene(result.index, 1);
});

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async () => {
  if (!state.deferredInstallPrompt) return;
  state.deferredInstallPrompt.prompt();
  await state.deferredInstallPrompt.userChoice;
  state.deferredInstallPrompt = null;
  installBtn.classList.add('hidden');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

updateCanvasSize();
renderTimeline();
