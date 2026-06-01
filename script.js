/* VideoMaker Studio AI - static GitHub Pages editor */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));
  const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const fmtTime = (sec = 0) => {
    sec = Math.max(0, sec);
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    const d = Math.floor((sec % 1) * 10);
    return `${m}:${s}.${d}`;
  };
  const readFileText = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });

  const dom = {
    canvas: $('#previewCanvas'),
    safeArea: $('#safeArea'),
    loadingOverlay: $('#loadingOverlay'),
    loadingTitle: $('#loadingTitle'),
    loadingText: $('#loadingText'),
    mediaInput: $('#mediaInput'),
    dropZone: $('#dropZone'),
    assetLibrary: $('#assetLibrary'),
    formatSelect: $('#formatSelect'),
    fpsSelect: $('#fpsSelect'),
    playBtn: $('#playBtn'),
    timeSlider: $('#timeSlider'),
    timeReadout: $('#timeReadout'),
    timelineInfo: $('#timelineInfo'),
    timelineScroll: $('#timelineScroll'),
    ruler: $('#ruler'),
    mediaTrack: $('#mediaTrack'),
    textTrack: $('#textTrack'),
    subtitlesTrack: $('#subtitlesTrack'),
    audioTrack: $('#audioTrack'),
    playhead: $('#playhead'),
    zoomSlider: $('#zoomSlider'),
    snapBtn: $('#snapBtn'),
    inspector: $('#inspector'),
    selectedLabel: $('#selectedLabel'),
    effectGrid: $('#effectGrid'),
    motionGrid: $('#motionGrid'),
    transitionGrid: $('#transitionGrid'),
    aiProvider: $('#aiProvider'),
    apiKeyInput: $('#apiKeyInput'),
    proxyUrlInput: $('#proxyUrlInput'),
    transcribeModel: $('#transcribeModel'),
    saveKeyCheck: $('#saveKeyCheck'),
    subtitleDraftText: $('#subtitleDraftText'),
    srtInput: $('#srtInput'),
  };
  const ctx = dom.canvas.getContext('2d', { alpha: false });

  const EFFECTS = [
    { id:'none', name:'Pulito', desc:'Nessun filtro', filter:'none', glow:'rgba(255,255,255,.18)' },
    { id:'cinematic', name:'Cinematic', desc:'Contrasto + vignetta', filter:'contrast(1.18) saturate(1.12) brightness(.96)', overlay:'vignette', glow:'rgba(124,92,255,.3)' },
    { id:'warm', name:'Caldo', desc:'Look emozionale', filter:'sepia(.18) saturate(1.22) brightness(1.04)', glow:'rgba(255,160,88,.32)' },
    { id:'cold', name:'Freddo', desc:'Tono blu moderno', filter:'saturate(.95) hue-rotate(180deg) contrast(1.06)', glow:'rgba(0,224,255,.28)' },
    { id:'bw', name:'Bianco/Nero', desc:'Editoriale', filter:'grayscale(1) contrast(1.2)', glow:'rgba(255,255,255,.25)' },
    { id:'vintage', name:'Vintage', desc:'Sepia + grana', filter:'sepia(.55) contrast(1.08) brightness(.98)', overlay:'grain', glow:'rgba(255,209,102,.26)' },
    { id:'dream', name:'Dream Glow', desc:'Morbido luminoso', filter:'brightness(1.08) saturate(1.26) blur(.15px)', overlay:'glow', glow:'rgba(255,63,143,.24)' },
    { id:'neon', name:'Neon', desc:'Cyber color', filter:'contrast(1.24) saturate(1.7) brightness(.96)', overlay:'neon', glow:'rgba(255,63,143,.3)' },
    { id:'dramatic', name:'Drammatico', desc:'Ombre profonde', filter:'contrast(1.36) saturate(.9) brightness(.85)', overlay:'vignette', glow:'rgba(255,77,109,.24)' },
    { id:'soft', name:'Soft Portrait', desc:'Pelle morbida', filter:'brightness(1.06) contrast(.96) saturate(1.05)', glow:'rgba(255,180,200,.25)' },
    { id:'punchy', name:'Social Pop', desc:'Colori forti', filter:'contrast(1.15) saturate(1.45)', glow:'rgba(0,224,255,.28)' },
    { id:'noir', name:'Noir', desc:'Scuro elegante', filter:'grayscale(.92) contrast(1.34) brightness(.78)', overlay:'vignette', glow:'rgba(120,130,160,.25)' },
    { id:'vhs', name:'VHS', desc:'Vecchia videocamera', filter:'contrast(1.12) saturate(.8) brightness(.94)', overlay:'scanlines', glow:'rgba(53,229,140,.2)' },
    { id:'glitch', name:'Glitch', desc:'Distorsione digitale', filter:'contrast(1.18) saturate(1.25)', overlay:'glitch', glow:'rgba(255,63,143,.33)' },
    { id:'blur-bg', name:'Blur Mood', desc:'Fondo sfumato', filter:'saturate(1.12)', overlay:'blurFrame', glow:'rgba(124,92,255,.3)' },
    { id:'news', name:'Breaking News', desc:'Look informativo', filter:'contrast(1.08) saturate(1.15)', overlay:'newsFrame', glow:'rgba(255,77,109,.3)' },
  ];
  const MOTIONS = [
    { id:'none', name:'Fermo', desc:'Nessun movimento' },
    { id:'kenburns-in', name:'Zoom In', desc:'Ingrandimento lento' },
    { id:'kenburns-out', name:'Zoom Out', desc:'Allontanamento lento' },
    { id:'pan-left', name:'Pan Sinistra', desc:'Scorrimento laterale' },
    { id:'pan-right', name:'Pan Destra', desc:'Scorrimento laterale' },
    { id:'pan-up', name:'Pan Alto', desc:'Movimento verticale' },
    { id:'pan-down', name:'Pan Basso', desc:'Movimento verticale' },
    { id:'rotate-slow', name:'Rotazione lenta', desc:'Effetto elegante' },
    { id:'pulse', name:'Pulse Beat', desc:'Spinta social' },
    { id:'float', name:'Float', desc:'Movimento morbido' },
  ];
  const TRANSITIONS = [
    { id:'none', name:'Taglio netto', desc:'Cambio immediato' },
    { id:'fade', name:'Fade', desc:'Dissolvenza' },
    { id:'crossfade', name:'Crossfade', desc:'Doppia dissolvenza' },
    { id:'slide-left', name:'Slide Left', desc:'Scorrimento a sinistra' },
    { id:'slide-right', name:'Slide Right', desc:'Scorrimento a destra' },
    { id:'slide-up', name:'Slide Up', desc:'Scorrimento in alto' },
    { id:'slide-down', name:'Slide Down', desc:'Scorrimento in basso' },
    { id:'zoom', name:'Zoom Blur', desc:'Zoom dinamico' },
    { id:'wipe', name:'Wipe', desc:'Tendina laterale' },
    { id:'circle', name:'Circle Reveal', desc:'Apertura circolare' },
    { id:'spin', name:'Spin', desc:'Rotazione veloce' },
    { id:'flash', name:'Flash', desc:'Lampo bianco' },
    { id:'black', name:'Fade Black', desc:'Nero cinematografico' },
    { id:'pixel', name:'Pixel Pop', desc:'Effetto digitale' },
    { id:'split', name:'Split', desc:'Divisione centrale' },
    { id:'swirl', name:'Swirl', desc:'Rotazione morbida' },
  ];

  const state = {
    projectName: 'Nuovo progetto',
    assets: [],
    clips: { media: [], text: [], subtitles: [], audio: [] },
    selected: null,
    currentTime: 0,
    duration: 0,
    pps: 95,
    fps: 30,
    format: 'vertical',
    snap: true,
    playing: false,
    playStartClock: 0,
    playStartTime: 0,
    history: [],
    future: [],
  };

  const mediaCache = new Map();
  const audioPlayback = new Map();
  let animationId = null;

  function pushHistory() {
    const snap = JSON.stringify(serializeProject());
    if (state.history[state.history.length - 1] !== snap) {
      state.history.push(snap);
      if (state.history.length > 70) state.history.shift();
      state.future.length = 0;
    }
  }

  function serializeProject() {
    return {
      version: 5,
      projectName: state.projectName,
      format: state.format,
      fps: state.fps,
      pps: state.pps,
      assets: state.assets.map(a => ({ id:a.id, name:a.name, type:a.type, duration:a.duration, url:a.url, thumb:a.thumb, waveform:a.waveform, note:'I file locali vengono riaperti solo nella sessione corrente.' })),
      clips: state.clips,
    };
  }

  function restoreProject(data) {
    state.projectName = data.projectName || 'Progetto caricato';
    state.format = data.format || 'vertical';
    state.fps = Number(data.fps || 30);
    state.pps = Number(data.pps || 95);
    state.assets = (data.assets || []).map(a => ({ ...a, file:null }));
    state.clips = data.clips || { media: [], text: [], subtitles: [], audio: [] };
    state.selected = null;
    state.currentTime = 0;
    applyFormat();
    renderAll();
  }

  function getCanvasSize(format = state.format) {
    if (format === 'horizontal') return { width: 1920, height: 1080 };
    if (format === 'square') return { width: 1080, height: 1080 };
    return { width: 1080, height: 1920 };
  }

  function applyFormat() {
    const size = getCanvasSize();
    dom.canvas.width = size.width;
    dom.canvas.height = size.height;
    renderPreview(state.currentTime);
    requestAnimationFrame(updateSafeArea);
  }

  function updateSafeArea() {
    const rect = dom.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dom.safeArea.style.width = `${rect.width * .82}px`;
    dom.safeArea.style.height = `${rect.height * .82}px`;
    dom.safeArea.style.left = `${rect.left + rect.width * .09 - dom.safeArea.parentElement.getBoundingClientRect().left}px`;
    dom.safeArea.style.top = `${rect.top + rect.height * .09 - dom.safeArea.parentElement.getBoundingClientRect().top}px`;
  }

  function computeDuration() {
    const all = [...state.clips.media, ...state.clips.text, ...state.clips.subtitles, ...state.clips.audio];
    state.duration = Math.max(0, ...all.map(c => c.start + c.duration));
    dom.timeSlider.max = Math.max(0.01, state.duration);
    dom.timelineInfo.textContent = `Durata ${fmtTime(state.duration)}`;
    dom.timeReadout.textContent = `${fmtTime(state.currentTime)} / ${fmtTime(state.duration)}`;
  }

  function snapTime(v) {
    return state.snap ? Math.round(v * 10) / 10 : Math.round(v * 100) / 100;
  }

  function getAsset(id) {
    return state.assets.find(a => a.id === id);
  }
  function findClip(id) {
    for (const track of Object.keys(state.clips)) {
      const clip = state.clips[track].find(c => c.id === id);
      if (clip) return { clip, track };
    }
    return null;
  }
  function selectedClip() {
    return state.selected ? findClip(state.selected.id) : null;
  }
  function activeClips(track, t = state.currentTime) {
    return state.clips[track].filter(c => t >= c.start && t <= c.start + c.duration).sort((a,b)=>a.start-b.start);
  }
  function endOfTrack(track) {
    return Math.max(0, ...state.clips[track].map(c => c.start + c.duration));
  }

  async function addFiles(files) {
    const list = Array.from(files || []);
    if (!list.length) return;
    pushHistory();
    for (const file of list) {
      const url = URL.createObjectURL(file);
      const id = uid('asset');
      const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file';
      const asset = { id, file, url, type, name:file.name, duration: type === 'image' ? 4 : 0, thumb:null, waveform:null };
      state.assets.push(asset);
      try {
        if (type === 'image') {
          asset.thumb = url;
          addMediaClip(asset, 4);
        } else if (type === 'video') {
          const meta = await loadVideoMeta(asset);
          asset.duration = meta.duration || 5;
          asset.thumb = meta.thumb;
          addMediaClip(asset, Math.min(asset.duration || 5, 8));
        } else if (type === 'audio') {
          const meta = await loadAudioMeta(asset);
          asset.duration = meta.duration || 30;
          asset.waveform = meta.waveform;
          addAudioClip(asset);
        }
      } catch (err) {
        console.warn('Errore caricamento file', err);
      }
    }
    renderAll();
  }

  function addMediaClip(asset, duration = 4) {
    const start = endOfTrack('media');
    state.clips.media.push({
      id: uid('clip'), track:'media', kind:asset.type, assetId:asset.id, label:asset.name,
      start, duration: clamp(duration, .3, 60), trimStart:0, opacity:1,
      transition:'fade', transitionDuration:.45, effect:'cinematic', motion: asset.type === 'image' ? 'kenburns-in' : 'none',
      volume:1,
    });
  }
  function addAudioClip(asset) {
    const start = endOfTrack('audio');
    state.clips.audio.push({ id:uid('clip'), track:'audio', kind:'audio', assetId:asset.id, label:asset.name, start, duration:asset.duration || 30, trimStart:0, volume:1, fadeIn:.25, fadeOut:.4 });
  }
  function addTextClip() {
    pushHistory();
    state.clips.text.push({ id:uid('clip'), track:'text', kind:'text', label:'Titolo', text:'Scrivi il tuo testo', start:state.currentTime, duration:3, x:.5, y:.18, size:64, color:'#ffffff', background:'rgba(0,0,0,0)', font:'Inter', weight:800, animation:'rise', align:'center', shadow:true });
    renderAll();
  }
  function addSubtitleClip(text = 'Nuovo sottotitolo', start = state.currentTime, duration = 2) {
    state.clips.subtitles.push({ id:uid('clip'), track:'subtitles', kind:'subtitle', label:'Sottotitolo', text, start, duration, x:.5, y:.82, size:42, color:'#ffffff', background:'rgba(0,0,0,.62)', font:'Inter', weight:800, animation:'pop', align:'center', shadow:true });
  }

  function loadVideoMeta(asset) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = asset.url;
      video.onloadedmetadata = () => {
        const captureAt = Math.min(.4, Math.max(0, video.duration / 5));
        video.currentTime = captureAt;
      };
      video.onseeked = () => {
        const c = document.createElement('canvas');
        c.width = 320; c.height = 180;
        const x = c.getContext('2d');
        x.fillStyle = '#111'; x.fillRect(0,0,c.width,c.height);
        drawCover(x, video, 0, 0, c.width, c.height);
        resolve({ duration: video.duration, thumb: c.toDataURL('image/jpeg', .72) });
      };
      video.onerror = reject;
    });
  }

  function loadAudioMeta(asset) {
    return new Promise((resolve) => {
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      audio.src = asset.url;
      audio.onloadedmetadata = async () => {
        let waveform = null;
        try { waveform = await makeWaveform(asset.file); } catch (e) { console.warn(e); }
        resolve({ duration: audio.duration || 30, waveform });
      };
      audio.onerror = () => resolve({ duration:30, waveform:null });
    });
  }

  async function makeWaveform(file) {
    const array = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ac = new AudioCtx();
    const buffer = await ac.decodeAudioData(array.slice(0));
    const data = buffer.getChannelData(0);
    const samples = 90;
    const block = Math.floor(data.length / samples);
    const peaks = [];
    for (let i=0;i<samples;i++) {
      let sum = 0;
      for (let j=0;j<block;j++) sum += Math.abs(data[i*block+j] || 0);
      peaks.push(Math.min(1, (sum / block) * 2.6));
    }
    await ac.close();
    return waveformSvg(peaks);
  }
  function waveformSvg(peaks) {
    const w = 900, h = 120;
    const bar = w / peaks.length;
    const rects = peaks.map((p,i)=>{
      const bh = Math.max(3, p * h);
      const y = (h - bh)/2;
      return `<rect x="${(i*bar).toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2,bar*.55).toFixed(1)}" height="${bh.toFixed(1)}" rx="2" fill="rgba(255,255,255,.9)"/>`;
    }).join('');
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rects}</svg>`)}`;
  }

  function renderAll() {
    computeDuration();
    renderLibrary();
    renderPresets();
    renderTimeline();
    renderInspector();
    renderPreview(state.currentTime);
    saveAutosave();
  }

  function renderLibrary() {
    if (!state.assets.length) {
      dom.assetLibrary.className = 'asset-library empty-state';
      dom.assetLibrary.textContent = 'Nessun file caricato';
      return;
    }
    dom.assetLibrary.className = 'asset-library';
    dom.assetLibrary.innerHTML = '';
    for (const asset of state.assets) {
      const div = document.createElement('div');
      div.className = 'asset-card';
      div.innerHTML = `
        <div class="asset-thumb" ${asset.thumb ? `style="background-image:url('${asset.thumb}')"` : ''}>${asset.type === 'audio' ? '♪' : asset.type === 'video' ? '▶' : ''}</div>
        <div><b>${escapeHtml(asset.name)}</b><span>${asset.type} • ${fmtTime(asset.duration || 0)}</span></div>`;
      div.addEventListener('click', () => {
        pushHistory();
        if (asset.type === 'audio') addAudioClip(asset);
        else if (asset.type === 'image' || asset.type === 'video') addMediaClip(asset, asset.type === 'image' ? 4 : Math.min(asset.duration, 8));
        renderAll();
      });
      dom.assetLibrary.appendChild(div);
    }
  }

  function renderPresets() {
    if (!dom.effectGrid.dataset.ready) {
      dom.effectGrid.innerHTML = EFFECTS.map(e => `<button class="preset" style="--glow:${e.glow || 'rgba(124,92,255,.2)'}" data-effect="${e.id}"><b>${e.name}</b><span>${e.desc}</span></button>`).join('');
      dom.motionGrid.innerHTML = MOTIONS.map(m => `<button class="preset" data-motion="${m.id}"><b>${m.name}</b><span>${m.desc}</span></button>`).join('');
      dom.transitionGrid.innerHTML = TRANSITIONS.map(t => `<button class="preset" data-transition="${t.id}"><b>${t.name}</b><span>${t.desc}</span></button>`).join('');
      dom.effectGrid.dataset.ready = '1';
      $$('[data-effect]').forEach(b => b.addEventListener('click', () => applyToSelected('effect', b.dataset.effect, 'media')));
      $$('[data-motion]').forEach(b => b.addEventListener('click', () => applyToSelected('motion', b.dataset.motion, 'media')));
      $$('[data-transition]').forEach(b => b.addEventListener('click', () => applyToSelected('transition', b.dataset.transition, 'media')));
    }
  }

  function applyToSelected(key, value, trackExpected) {
    const found = selectedClip();
    if (!found) return alert('Seleziona prima una clip nella timeline.');
    if (trackExpected && found.track !== trackExpected) return alert('Questo preset si applica solo alle clip foto/video.');
    pushHistory();
    found.clip[key] = value;
    if (key === 'transition' && !found.clip.transitionDuration) found.clip.transitionDuration = .45;
    renderAll();
  }

  function renderTimeline() {
    const totalWidth = Math.max(900, (Math.max(state.duration, 12) + 2) * state.pps);
    document.documentElement.style.setProperty('--pps', `${state.pps}px`);
    [dom.ruler, dom.mediaTrack, dom.textTrack, dom.subtitlesTrack, dom.audioTrack].forEach(el => el.style.width = `${totalWidth}px`);
    renderRuler(totalWidth);
    renderTrack('media', dom.mediaTrack);
    renderTrack('text', dom.textTrack);
    renderTrack('subtitles', dom.subtitlesTrack);
    renderTrack('audio', dom.audioTrack);
    updatePlayhead();
  }

  function renderRuler(totalWidth) {
    dom.ruler.innerHTML = '';
    const seconds = Math.ceil(totalWidth / state.pps);
    for (let s=0;s<=seconds;s++) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = `${s * state.pps}px`;
      tick.textContent = `${s}s`;
      dom.ruler.appendChild(tick);
    }
  }

  function renderTrack(track, lane) {
    lane.innerHTML = '';
    const template = $('#clipTemplate');
    for (const clip of state.clips[track]) {
      const node = template.content.firstElementChild.cloneNode(true);
      node.classList.add(track);
      if (state.selected?.id === clip.id) node.classList.add('selected');
      node.dataset.clipId = clip.id;
      node.dataset.track = track;
      node.style.left = `${clip.start * state.pps}px`;
      node.style.width = `${Math.max(22, clip.duration * state.pps)}px`;
      const thumb = $('.clip-thumb', node);
      const content = $('.clip-content', node);
      const asset = clip.assetId ? getAsset(clip.assetId) : null;
      const thumbUrl = asset?.thumb || asset?.waveform;
      if (thumbUrl) thumb.style.backgroundImage = `url('${thumbUrl}')`;
      if (track === 'audio' && asset?.waveform) thumb.style.backgroundImage = `url('${asset.waveform}')`;
      content.innerHTML = `<b>${escapeHtml(clip.label || clip.text || track)}</b><small>${fmtTime(clip.start)} → ${fmtTime(clip.start + clip.duration)}</small>`;
      if (track === 'text' || track === 'subtitles') content.innerHTML = `<b>${escapeHtml(clip.text || clip.label)}</b><small>${fmtTime(clip.duration)}</small>`;
      node.addEventListener('pointerdown', onClipPointerDown);
      node.addEventListener('click', (e) => { e.stopPropagation(); selectClip(clip.id, track); });
      lane.appendChild(node);
    }
  }

  function onClipPointerDown(e) {
    const node = e.currentTarget;
    const id = node.dataset.clipId;
    const track = node.dataset.track;
    const found = findClip(id);
    if (!found) return;
    selectClip(id, track, false);
    const clip = found.clip;
    const startX = e.clientX;
    const original = { start: clip.start, duration: clip.duration, trimStart: clip.trimStart || 0 };
    const action = e.target.classList.contains('left') ? 'resize-left' : e.target.classList.contains('right') ? 'resize-right' : 'move';
    node.setPointerCapture(e.pointerId);
    const onMove = (ev) => {
      const dx = (ev.clientX - startX) / state.pps;
      if (action === 'move') {
        clip.start = snapTime(Math.max(0, original.start + dx));
      } else if (action === 'resize-right') {
        clip.duration = snapTime(Math.max(.2, original.duration + dx));
      } else if (action === 'resize-left') {
        const newStart = snapTime(Math.max(0, original.start + dx));
        const end = original.start + original.duration;
        clip.start = Math.min(newStart, end - .2);
        clip.duration = snapTime(Math.max(.2, end - clip.start));
        if (clip.kind === 'audio' || clip.kind === 'video') clip.trimStart = Math.max(0, original.trimStart + (clip.start - original.start));
      }
      computeDuration();
      renderTimeline();
      renderInspector();
      renderPreview(state.currentTime);
    };
    const onUp = () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerup', onUp);
      pushHistory();
      renderAll();
    };
    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerup', onUp);
  }

  function selectClip(id, track, doRender = true) {
    state.selected = { id, track };
    if (doRender) renderAll(); else renderInspector();
  }

  function updatePlayhead() {
    const left = 126 + state.currentTime * state.pps;
    dom.playhead.style.left = `${left}px`;
    dom.timeSlider.value = state.currentTime;
    dom.timeReadout.textContent = `${fmtTime(state.currentTime)} / ${fmtTime(state.duration)}`;
  }

  function renderInspector() {
    const found = selectedClip();
    if (!found) {
      dom.selectedLabel.textContent = 'Nessun elemento selezionato';
      dom.inspector.className = 'inspector empty-state';
      dom.inspector.textContent = 'Seleziona una clip nella timeline per modificarla.';
      return;
    }
    dom.inspector.className = 'inspector';
    const { clip, track } = found;
    dom.selectedLabel.textContent = `${track.toUpperCase()} • ${clip.label || clip.text || clip.id}`;
    let html = `
      <div class="section">
        <div class="inline2">
          ${numberControl('start', 'Inizio', clip.start, 0, 999, .1)}
          ${numberControl('duration', 'Durata', clip.duration, .2, 999, .1)}
        </div>
      </div>`;
    if (track === 'media') {
      html += `
        <div class="section">
          <div class="inline2">
            ${selectControl('effect','Filtro', clip.effect || 'none', EFFECTS.map(e=>[e.id,e.name]))}
            ${selectControl('motion','Movimento', clip.motion || 'none', MOTIONS.map(m=>[m.id,m.name]))}
          </div>
          <div class="inline2">
            ${selectControl('transition','Transizione', clip.transition || 'none', TRANSITIONS.map(t=>[t.id,t.name]))}
            ${numberControl('transitionDuration','Durata trans.', clip.transitionDuration || .45, 0, 3, .05)}
          </div>
          ${rangeControl('opacity','Opacità', clip.opacity ?? 1, 0, 1, .01)}
        </div>`;
      if (clip.kind === 'video') {
        html += `<div class="section"><div class="inline2">${numberControl('trimStart','Taglio inizio', clip.trimStart || 0, 0, 999, .1)}${rangeControl('volume','Volume video', clip.volume ?? 1, 0, 1, .01)}</div></div>`;
      }
    }
    if (track === 'audio') {
      html += `
        <div class="section">
          <div class="inline2">${numberControl('trimStart','Taglio inizio', clip.trimStart || 0, 0, 999, .1)}${rangeControl('volume','Volume', clip.volume ?? 1, 0, 1, .01)}</div>
          <div class="inline2">${numberControl('fadeIn','Fade in', clip.fadeIn || 0, 0, 5, .1)}${numberControl('fadeOut','Fade out', clip.fadeOut || 0, 0, 5, .1)}</div>
        </div>`;
    }
    if (track === 'text' || track === 'subtitles') {
      html += `
        <div class="section">
          <label class="control">Testo<textarea data-field="text" class="textarea" rows="4">${escapeHtml(clip.text || '')}</textarea></label>
          <div class="inline2">${rangeControl('x','Posizione X', clip.x ?? .5, 0, 1, .01)}${rangeControl('y','Posizione Y', clip.y ?? .8, 0, 1, .01)}</div>
          <div class="inline2">${numberControl('size','Grandezza', clip.size || 44, 12, 180, 1)}${selectControl('animation','Animazione', clip.animation || 'none', [['none','Nessuna'],['rise','Rise'],['pop','Pop'],['typewriter','Typewriter'],['karaoke','Karaoke'],['bounce','Bounce'],['slide-left','Slide Left'],['glow','Glow']])}</div>
          <div class="inline2">${selectControl('align','Allineamento', clip.align || 'center', [['left','Sinistra'],['center','Centro'],['right','Destra']])}${numberControl('weight','Spessore', clip.weight || 800, 100, 900, 100)}</div>
          <label class="control">Colore <div class="color-row"><input data-field="color" type="text" value="${clip.color || '#ffffff'}"><input data-field="color" type="color" value="${toColor(clip.color || '#ffffff')}"></div></label>
          <label class="control">Sfondo <input data-field="background" type="text" value="${clip.background || 'rgba(0,0,0,.62)'}"></label>
          <label class="checkline"><input data-field="shadow" type="checkbox" ${clip.shadow ? 'checked' : ''}/> Ombra testo</label>
        </div>`;
    }
    html += `<div class="section"><button id="duplicateClipBtn" class="btn secondary full">Duplica clip</button><button id="deleteClipBtn" class="btn danger full">Elimina clip</button></div>`;
    dom.inspector.innerHTML = html;
    $$('[data-field]', dom.inspector).forEach(input => {
      input.addEventListener('input', () => updateClipField(input));
      input.addEventListener('change', () => updateClipField(input));
    });
    $('#deleteClipBtn')?.addEventListener('click', deleteSelected);
    $('#duplicateClipBtn')?.addEventListener('click', duplicateSelected);
  }

  function updateClipField(input) {
    const found = selectedClip();
    if (!found) return;
    const { clip } = found;
    const field = input.dataset.field;
    let value;
    if (input.type === 'checkbox') value = input.checked;
    else if (input.type === 'number' || input.type === 'range') value = Number(input.value);
    else value = input.value;
    if (field === 'duration') value = Math.max(.2, value);
    if (field === 'start') value = Math.max(0, value);
    clip[field] = value;
    computeDuration();
    renderTimeline();
    renderPreview(state.currentTime);
  }

  function numberControl(field,label,value,min,max,step){return `<label class="control">${label}<input data-field="${field}" type="number" min="${min}" max="${max}" step="${step}" value="${Number(value ?? 0).toFixed(step < 1 ? 2 : 0)}"></label>`;}
  function rangeControl(field,label,value,min,max,step){return `<label class="control"><span class="range-value"><span>${label}</span><span>${Number(value ?? 0).toFixed(2)}</span></span><input data-field="${field}" type="range" min="${min}" max="${max}" step="${step}" value="${value ?? 0}"></label>`;}
  function selectControl(field,label,value,opts){return `<label class="control">${label}<select data-field="${field}">${opts.map(([v,n])=>`<option value="${v}" ${v===value?'selected':''}>${n}</option>`).join('')}</select></label>`;}

  function drawCover(c, img, x, y, w, h, scaleExtra = 1, offX = 0, offY = 0) {
    const iw = img.videoWidth || img.naturalWidth || img.width || 1;
    const ih = img.videoHeight || img.naturalHeight || img.height || 1;
    const scale = Math.max(w / iw, h / ih) * scaleExtra;
    const dw = iw * scale;
    const dh = ih * scale;
    c.drawImage(img, x + (w-dw)/2 + offX, y + (h-dh)/2 + offY, dw, dh);
  }

  function getMediaElement(asset) {
    if (!asset) return null;
    if (mediaCache.has(asset.id)) return mediaCache.get(asset.id);
    let el;
    if (asset.type === 'image') {
      el = new Image();
      el.src = asset.url;
    } else if (asset.type === 'video') {
      el = document.createElement('video');
      el.src = asset.url;
      el.muted = true;
      el.playsInline = true;
      el.preload = 'auto';
    }
    mediaCache.set(asset.id, el);
    return el;
  }

  function renderPreview(t = state.currentTime) {
    const w = dom.canvas.width, h = dom.canvas.height;
    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha = 1;
    const grd = ctx.createLinearGradient(0,0,w,h);
    grd.addColorStop(0,'#050713'); grd.addColorStop(1,'#11162f');
    ctx.fillStyle = grd; ctx.fillRect(0,0,w,h);
    const active = activeClips('media', t).at(-1);
    if (active) drawMediaClip(active, t, w, h);
    else drawEmptyPreview(w,h);
    for (const text of activeClips('text', t)) drawTextClip(text, t, w, h);
    for (const sub of activeClips('subtitles', t)) drawTextClip(sub, t, w, h, true);
    ctx.restore();
    updatePlayhead();
  }

  function drawEmptyPreview(w,h) {
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    roundRect(ctx, w*.12, h*.38, w*.76, h*.2, 40); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `800 ${Math.round(w*.05)}px Inter, Arial`; ctx.textAlign = 'center';
    ctx.fillText('Carica foto, video e audio', w/2, h*.48);
    ctx.fillStyle = 'rgba(255,255,255,.65)'; ctx.font = `500 ${Math.round(w*.026)}px Inter, Arial`;
    ctx.fillText('Poi modifica tutto dalla timeline', w/2, h*.53);
  }

  function drawMediaClip(clip, t, w, h) {
    const asset = getAsset(clip.assetId);
    const el = getMediaElement(asset);
    if (!el) return;
    const local = clamp((t - clip.start) / clip.duration, 0, 1);
    const transitionAmount = getTransitionAmount(clip, t);
    const effect = EFFECTS.find(e => e.id === clip.effect) || EFFECTS[0];
    ctx.save();
    ctx.globalAlpha = (clip.opacity ?? 1) * transitionAmount.alpha;
    ctx.filter = effect.filter || 'none';
    applyTransitionTransform(clip.transition, transitionAmount.phase, transitionAmount.dir, w, h);
    const motion = motionTransform(clip.motion, local, w, h);
    ctx.translate(w/2 + motion.x, h/2 + motion.y);
    ctx.rotate(motion.rotate);
    ctx.translate(-w/2, -h/2);
    if (asset.type === 'video') {
      try {
        const target = Math.min((clip.trimStart || 0) + (t - clip.start), Math.max(0, (asset.duration || 0) - .05));
        if (Math.abs((el.currentTime || 0) - target) > .18 && el.readyState >= 1) el.currentTime = target;
      } catch (_) {}
    }
    if (effect.overlay === 'blurFrame' && el.complete !== false) {
      ctx.save(); ctx.filter = 'blur(34px) brightness(.72) saturate(1.2)'; drawCover(ctx, el, -40, -40, w+80, h+80, 1.12); ctx.restore();
    }
    if (el.complete === false || (asset.type === 'video' && el.readyState < 2)) {
      drawPlaceholder(w,h, asset.name);
    } else {
      drawCover(ctx, el, 0, 0, w, h, motion.scale, motion.offX, motion.offY);
    }
    ctx.filter = 'none';
    drawOverlay(effect.overlay, local, w, h);
    ctx.restore();
  }

  function getTransitionAmount(clip, t) {
    const d = Math.max(0.001, clip.transitionDuration || .45);
    const local = t - clip.start;
    const endLocal = clip.duration - local;
    if ((clip.transition || 'none') === 'none') return { alpha:1, phase:1, dir:0 };
    if (local < d) return { alpha: clamp(local / d, 0, 1), phase: clamp(local / d, 0, 1), dir: -1 };
    if (endLocal < d) return { alpha: clamp(endLocal / d, 0, 1), phase: clamp(endLocal / d, 0, 1), dir: 1 };
    return { alpha:1, phase:1, dir:0 };
  }

  function applyTransitionTransform(kind, phase, dir, w, h) {
    if (!dir || kind === 'fade' || kind === 'crossfade' || kind === 'none') return;
    const inv = 1 - phase;
    if (kind === 'slide-left') ctx.translate(dir * inv * -w, 0);
    if (kind === 'slide-right') ctx.translate(dir * inv * w, 0);
    if (kind === 'slide-up') ctx.translate(0, dir * inv * -h);
    if (kind === 'slide-down') ctx.translate(0, dir * inv * h);
    if (kind === 'zoom') { ctx.translate(w/2,h/2); ctx.scale(1 + inv * .28, 1 + inv * .28); ctx.translate(-w/2,-h/2); ctx.filter = `${ctx.filter} blur(${inv*4}px)`; }
    if (kind === 'spin' || kind === 'swirl') { ctx.translate(w/2,h/2); ctx.rotate(inv * dir * (kind === 'spin' ? .6 : .22)); ctx.scale(1 + inv*.16, 1 + inv*.16); ctx.translate(-w/2,-h/2); }
    if (kind === 'pixel') ctx.filter = `${ctx.filter} contrast(${1+inv*.6}) saturate(${1+inv*.4})`;
  }

  function motionTransform(kind, p, w, h) {
    const ease = p < .5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
    const m = { scale:1, x:0, y:0, offX:0, offY:0, rotate:0 };
    if (kind === 'kenburns-in') m.scale = 1 + ease * .13;
    if (kind === 'kenburns-out') m.scale = 1.13 - ease * .13;
    if (kind === 'pan-left') m.offX = (ease - .5) * -w * .08, m.scale = 1.08;
    if (kind === 'pan-right') m.offX = (ease - .5) * w * .08, m.scale = 1.08;
    if (kind === 'pan-up') m.offY = (ease - .5) * -h * .08, m.scale = 1.08;
    if (kind === 'pan-down') m.offY = (ease - .5) * h * .08, m.scale = 1.08;
    if (kind === 'rotate-slow') { m.rotate = (ease - .5) * .035; m.scale = 1.06; }
    if (kind === 'pulse') m.scale = 1 + Math.sin(p * Math.PI * 8) * .018;
    if (kind === 'float') { m.y = Math.sin(p * Math.PI * 2) * h * .012; m.scale = 1.04; }
    return m;
  }

  function drawOverlay(type, p, w, h) {
    if (!type) return;
    if (type === 'vignette') {
      const g = ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.12,w/2,h/2,Math.max(w,h)*.62);
      g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,0,.58)'); ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    }
    if (type === 'grain' || type === 'vhs') {
      ctx.globalAlpha = .08; ctx.fillStyle = '#fff';
      for (let i=0;i<450;i++) ctx.fillRect(Math.random()*w, Math.random()*h, Math.random()*3+1, Math.random()*3+1);
      ctx.globalAlpha = 1;
    }
    if (type === 'scanlines' || type === 'vhs') {
      ctx.globalAlpha = .12; ctx.fillStyle = '#000'; for (let y=0;y<h;y+=8) ctx.fillRect(0,y,w,2); ctx.globalAlpha = 1;
    }
    if (type === 'glitch') {
      ctx.globalAlpha = .22; ctx.fillStyle = '#00e0ff'; ctx.fillRect(Math.random()*w*.1, Math.random()*h, w, 8+Math.random()*20); ctx.fillStyle = '#ff3f8f'; ctx.fillRect(-Math.random()*w*.1, Math.random()*h, w, 6+Math.random()*16); ctx.globalAlpha = 1;
    }
    if (type === 'neon') {
      const g = ctx.createLinearGradient(0,0,w,h); g.addColorStop(0,'rgba(124,92,255,.18)'); g.addColorStop(1,'rgba(0,224,255,.16)'); ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    }
    if (type === 'glow') {
      const g = ctx.createRadialGradient(w*.5,h*.35,0,w*.5,h*.35,w*.55); g.addColorStop(0,'rgba(255,255,255,.12)'); g.addColorStop(1,'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    }
    if (type === 'newsFrame') {
      ctx.fillStyle = 'rgba(210,0,42,.8)'; ctx.fillRect(0,h*.88,w,h*.12); ctx.fillStyle = '#fff'; ctx.font = `900 ${Math.round(w*.045)}px Arial`; ctx.textAlign='left'; ctx.fillText('BREAKING', w*.05, h*.955);
    }
  }

  function drawPlaceholder(w,h,name) {
    ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = `700 ${Math.round(w*.03)}px Arial`; ctx.textAlign = 'center'; ctx.fillText(name || 'Caricamento...', w/2, h/2);
  }

  function drawTextClip(clip, t, w, h, isSubtitle=false) {
    const local = clamp((t - clip.start) / clip.duration, 0, 1);
    const x = (clip.x ?? .5) * w;
    const y = (clip.y ?? .8) * h;
    const size = clip.size || (isSubtitle ? 42 : 64);
    const font = `${clip.weight || 800} ${size}px ${clip.font || 'Inter'}, Arial, sans-serif`;
    const lines = wrapText(ctx, clip.text || '', Math.min(w*.88, w - 80), font);
    const lineH = size * 1.18;
    let alpha = 1, tx = x, ty = y, scale = 1;
    if (clip.animation === 'rise') { alpha = smooth(local); ty += (1-smooth(local))*50; }
    if (clip.animation === 'pop') { alpha = smooth(local); scale = .88 + smooth(local) * .12; }
    if (clip.animation === 'bounce') { scale = 1 + Math.sin(local*Math.PI*4)*.035*(1-local); }
    if (clip.animation === 'slide-left') { tx += (1-smooth(local))*w*.18; alpha = smooth(local); }
    if (clip.animation === 'glow') { alpha = .85 + Math.sin(local*Math.PI*4)*.15; }
    const visibleText = clip.animation === 'typewriter' ? clip.text.slice(0, Math.ceil((clip.text.length || 0) * local)) : clip.text;
    const drawLines = clip.animation === 'typewriter' ? wrapText(ctx, visibleText, Math.min(w*.88,w-80), font) : lines;
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(tx,ty); ctx.scale(scale,scale); ctx.translate(-tx,-ty); ctx.font = font; ctx.textAlign = clip.align || 'center'; ctx.textBaseline = 'middle';
    const textW = Math.max(...drawLines.map(l => ctx.measureText(l).width), 1);
    const boxW = Math.min(w*.92, textW + size*.9);
    const boxH = drawLines.length * lineH + size*.45;
    let bx = x - boxW/2; if (clip.align === 'left') bx = x; if (clip.align === 'right') bx = x - boxW;
    const by = y - boxH/2;
    if (clip.background && clip.background !== 'rgba(0,0,0,0)') { ctx.fillStyle = clip.background; roundRect(ctx,bx,by,boxW,boxH,Math.max(14,size*.22)); ctx.fill(); }
    if (clip.shadow) { ctx.shadowColor='rgba(0,0,0,.72)'; ctx.shadowBlur=18; ctx.shadowOffsetY=6; }
    ctx.fillStyle = clip.color || '#fff';
    drawLines.forEach((line,i) => ctx.fillText(line, x, y + (i-(drawLines.length-1)/2)*lineH));
    if (clip.animation === 'karaoke') {
      ctx.save(); ctx.beginPath(); ctx.rect(bx, by, boxW * local, boxH); ctx.clip(); ctx.fillStyle = '#00e0ff'; drawLines.forEach((line,i) => ctx.fillText(line, x, y + (i-(drawLines.length-1)/2)*lineH)); ctx.restore();
    }
    ctx.restore();
  }

  function wrapText(c, text, maxWidth, font) {
    c.font = font;
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (c.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  function roundRect(c,x,y,w,h,r) {
    const rr = Math.min(r, w/2, h/2);
    c.beginPath(); c.moveTo(x+rr,y); c.arcTo(x+w,y,x+w,y+h,rr); c.arcTo(x+w,y+h,x,y+h,rr); c.arcTo(x,y+h,x,y,rr); c.arcTo(x,y,x+w,y,rr); c.closePath();
  }
  const smooth = x => x*x*(3-2*x);
  function escapeHtml(str='') { return String(str).replace(/[&<>'"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m])); }
  function toColor(v) { return /^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff'; }

  function startPlayback() {
    if (state.playing) return;
    state.playing = true;
    state.playStartClock = performance.now();
    state.playStartTime = state.currentTime;
    dom.playBtn.textContent = '⏸';
    loopPlayback();
  }
  function stopPlayback() {
    state.playing = false;
    dom.playBtn.textContent = '▶';
    if (animationId) cancelAnimationFrame(animationId);
    stopAllAudio();
  }
  function loopPlayback() {
    if (!state.playing) return;
    const elapsed = (performance.now() - state.playStartClock) / 1000;
    state.currentTime = state.playStartTime + elapsed;
    if (state.currentTime >= state.duration) { state.currentTime = state.duration; renderPreview(state.currentTime); stopPlayback(); return; }
    syncAudioForTime(state.currentTime);
    renderPreview(state.currentTime);
    animationId = requestAnimationFrame(loopPlayback);
  }

  function getAudioElement(asset) {
    if (!asset) return null;
    if (audioPlayback.has(asset.id)) return audioPlayback.get(asset.id);
    const el = document.createElement('audio');
    el.src = asset.url; el.preload = 'auto'; el.crossOrigin = 'anonymous';
    audioPlayback.set(asset.id, el);
    return el;
  }
  function syncAudioForTime(t) {
    for (const clip of state.clips.audio) {
      const asset = getAsset(clip.assetId); const el = getAudioElement(asset); if (!el) continue;
      const active = t >= clip.start && t <= clip.start + clip.duration;
      if (active) {
        const target = (clip.trimStart || 0) + (t - clip.start);
        if (Math.abs((el.currentTime || 0) - target) > .22) { try { el.currentTime = target; } catch (_) {} }
        el.volume = clipVolumeAt(clip, t);
        if (el.paused) el.play().catch(()=>{});
      } else if (!el.paused) el.pause();
    }
  }
  function clipVolumeAt(clip,t) {
    const base = clip.volume ?? 1;
    const local = t - clip.start;
    const end = clip.start + clip.duration - t;
    let v = base;
    if (clip.fadeIn) v *= clamp(local / clip.fadeIn, 0, 1);
    if (clip.fadeOut) v *= clamp(end / clip.fadeOut, 0, 1);
    return clamp(v,0,1);
  }
  function stopAllAudio(){ audioPlayback.forEach(a => { a.pause(); try{a.currentTime=0;}catch(_){}}); }

  function getBestWebmMime() {
    const candidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm'
    ];
    return candidates.find(m => MediaRecorder.isTypeSupported(m)) || '';
  }

  function getBestNativeMp4Mime() {
    const candidates = [
      'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
      'video/mp4;codecs="avc1.64001F,mp4a.40.2"',
      'video/mp4;codecs="h264,aac"',
      'video/mp4'
    ];
    return candidates.find(m => MediaRecorder.isTypeSupported(m)) || '';
  }

  async function renderProjectToBlob({ title = 'Esportazione', mimeType = '', videoBitsPerSecond = 7_000_000 } = {}) {
    if (!state.duration) { alert('Aggiungi almeno una clip prima di esportare.'); return null; }
    if (!mimeType) throw new Error('Formato video non supportato da questo browser.');
    stopPlayback();
    showLoading(title, 'Preparazione rendering...');
    updateLoading(0, 'Preparazione canvas e audio...');

    const fps = state.fps;
    const stream = dom.canvas.captureStream(fps);
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const audioEls = [];

    for (const clip of state.clips.audio) {
      const asset = getAsset(clip.assetId);
      if (!asset) continue;
      const el = document.createElement('audio');
      el.src = asset.url;
      el.preload = 'auto';
      el.crossOrigin = 'anonymous';
      const src = audioCtx.createMediaElementSource(el);
      const gain = audioCtx.createGain();
      src.connect(gain).connect(dest);
      audioEls.push({ el, clip, gain });
    }

    dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));

    const chunks = [];
    let recorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond });
    } catch (err) {
      await audioCtx.close().catch(()=>{});
      throw err;
    }

    recorder.ondataavailable = e => e.data && e.data.size && chunks.push(e.data);
    const done = new Promise((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(';')[0] || mimeType }));
      recorder.onerror = e => reject(e.error || e);
    });

    await audioCtx.resume();
    recorder.start(250);
    const startClock = performance.now();
    let lastProgress = -1;

    await new Promise(resolve => {
      const step = () => {
        const t = Math.min(state.duration, (performance.now() - startClock) / 1000);
        state.currentTime = t;

        for (const item of audioEls) {
          const { el, clip, gain } = item;
          const active = t >= clip.start && t <= clip.start + clip.duration;
          if (active) {
            const target = (clip.trimStart || 0) + (t - clip.start);
            if (Math.abs((el.currentTime || 0) - target) > .22) {
              try { el.currentTime = target; } catch (_) {}
            }
            gain.gain.value = clipVolumeAt(clip, t);
            if (el.paused) el.play().catch(()=>{});
          } else if (!el.paused) {
            el.pause();
          }
        }

        renderPreview(t);
        const p = Math.round((t / state.duration) * 100);
        if (p !== lastProgress && (p % 2 === 0 || p === 100)) {
          lastProgress = p;
          updateLoading(p, `Rendering ${fmtTime(t)} / ${fmtTime(state.duration)}`);
        }
        if (t >= state.duration) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });

    recorder.stop();
    audioEls.forEach(({ el }) => el.pause());
    await audioCtx.close().catch(()=>{});
    return await done;
  }

  async function exportWebM(returnBlob = false) {
    try {
      const mimeType = getBestWebmMime();
      const blob = await renderProjectToBlob({
        title: 'Esportazione WEBM',
        mimeType,
        videoBitsPerSecond: 7_000_000
      });
      hideLoading();
      if (!blob) return null;
      if (returnBlob) return blob;
      downloadBlob(blob, `${safeFileName(state.projectName)}.webm`);
      return blob;
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Esportazione WEBM non riuscita. Prova con un video più corto o con FPS 30.');
      return null;
    }
  }

  async function exportMP4() {
    stopPlayback();

    // Primo tentativo: MP4 nativo del browser. Sui browser moderni evita FFmpeg.wasm,
    // quindi richiede meno memoria ed è molto più stabile su GitHub Pages.
    const nativeMp4 = getBestNativeMp4Mime();
    if (nativeMp4) {
      try {
        const blob = await renderProjectToBlob({
          title: 'Esportazione MP4',
          mimeType: nativeMp4,
          videoBitsPerSecond: 10_000_000
        });
        hideLoading();
        if (!blob) return;
        downloadBlob(blob, `${safeFileName(state.projectName)}.mp4`);
        return;
      } catch (err) {
        console.warn('MP4 nativo non riuscito, provo con FFmpeg.wasm.', err);
        hideLoading();
      }
    }

    // Secondo tentativo: conversione WEBM -> MP4 con FFmpeg.wasm.
    try {
      const webm = await exportWebM(true);
      if (!webm) return;
      showLoading('Conversione MP4', 'Caricamento FFmpeg.wasm...');
      updateLoading(4, 'Caricamento motore video...');

      const moduleBase = 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm';
      const utilBase = 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm';
      const coreBase = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';

      const { FFmpeg } = await import(`${moduleBase}/index.js`);
      const { fetchFile, toBlobURL } = await import(`${utilBase}/index.js`);
      const ffmpeg = new FFmpeg();

      ffmpeg.on('progress', ({ progress, time }) => {
        const p = Math.max(10, Math.min(98, Math.round((progress || 0) * 100)));
        updateLoading(p, `Conversione in corso ${Math.round((time || 0) / 1000000)}s`);
      });
      ffmpeg.on('log', ({ message }) => console.log('[ffmpeg]', message));

      await ffmpeg.load({
        coreURL: await toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm')
      });

      updateLoading(18, 'Caricamento file WEBM...');
      await ffmpeg.writeFile('input.webm', await fetchFile(webm));
      updateLoading(35, 'Compressione H.264 MP4...');
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-movflags', 'faststart',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '160k',
        'output.mp4'
      ]);
      const data = await ffmpeg.readFile('output.mp4');
      const mp4 = new Blob([data.buffer], { type: 'video/mp4' });
      downloadBlob(mp4, `${safeFileName(state.projectName)}.mp4`);
      updateLoading(100, 'MP4 pronto');
      hideLoading();
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Conversione MP4 non riuscita. Prova così: aggiorna la pagina con CTRL+F5, usa Chrome o Edge aggiornato, riduci FPS a 30 e video più corto. Puoi comunque esportare in WEBM.');
    }
  }

  async function generateAiSubtitles() {
    const audioClip = state.clips.audio[0];
    if (!audioClip) return alert('Carica prima una traccia audio.');
    const asset = getAsset(audioClip.assetId);
    if (!asset?.file) return alert('Per generare sottotitoli AI serve il file audio caricato in questa sessione.');

    const provider = dom.aiProvider?.value || 'gemini';
    const apiKey = dom.apiKeyInput.value.trim();
    const proxyUrl = dom.proxyUrlInput.value.trim();
    if (!apiKey && !proxyUrl) return alert('Inserisci la chiave API Gemini/OpenAI oppure un proxy sicuro.');

    if (dom.saveKeyCheck.checked && apiKey) {
      localStorage.setItem('videomaker_ai_key', apiKey);
      localStorage.setItem('videomaker_ai_provider', provider);
    } else {
      localStorage.removeItem('videomaker_ai_key');
      localStorage.removeItem('videomaker_ai_provider');
    }

    showLoading('Sottotitoli AI', provider === 'gemini' ? 'Invio audio a Gemini...' : 'Invio audio a OpenAI...');
    try {
      let segments = [];
      let fallbackText = '';

      if (proxyUrl) {
        const form = new FormData();
        form.append('file', asset.file, asset.name || 'audio.mp3');
        form.append('provider', provider);
        form.append('model', dom.transcribeModel.value || (provider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o-mini-transcribe'));
        form.append('duration', String(audioClip.duration || state.duration || 0));
        const res = await fetch(proxyUrl, { method:'POST', body: form });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        segments = normalizeSubtitleSegments(data.segments || data.words || [], audioClip);
        fallbackText = data.text || data.transcript || '';
      } else if (provider === 'gemini') {
        const data = await transcribeWithGemini(apiKey, asset.file, audioClip);
        segments = normalizeSubtitleSegments(data.segments || [], audioClip);
        fallbackText = data.text || data.transcript || '';
      } else {
        const data = await transcribeWithOpenAI(apiKey, asset.file);
        segments = normalizeSubtitleSegments(data.segments || data.words || [], audioClip);
        fallbackText = data.text || '';
      }

      pushHistory();
      state.clips.subtitles.length = 0;
      if (segments.length) {
        for (const seg of segments) addSubtitleClip(seg.text, seg.start, seg.duration);
      } else if (fallbackText) {
        createDraftSubtitles(fallbackText);
      } else {
        throw new Error('Nessun sottotitolo ricevuto dalla AI.');
      }
      hideLoading();
      renderAll();
    } catch (err) {
      hideLoading();
      console.error(err);
      alert('Non sono riuscito a generare i sottotitoli AI. Controlla chiave API, modello, rete o formato audio. Con Gemini i tempi possono essere approssimati; con OpenAI spesso sono più precisi.');
    }
  }

  async function transcribeWithOpenAI(apiKey, file) {
    const form = new FormData();
    form.append('file', file, file.name || 'audio.mp3');
    form.append('model', dom.transcribeModel.value?.startsWith('gpt') || dom.transcribeModel.value === 'whisper-1' ? dom.transcribeModel.value : 'gpt-4o-mini-transcribe');
    form.append('response_format', 'verbose_json');
    form.append('timestamp_granularities[]', 'segment');
    form.append('temperature', '0');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:'POST',
      headers:{ Authorization:`Bearer ${apiKey}` },
      body: form
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }

  async function transcribeWithGemini(apiKey, file, audioClip) {
    const model = (dom.transcribeModel.value || 'gemini-2.0-flash').startsWith('gemini') ? dom.transcribeModel.value : 'gemini-2.0-flash';
    const base64 = await readFileAsBase64(file);
    const duration = Math.max(1, audioClip.duration || state.duration || 30);
    const prompt = `Analizza questo audio e crea sottotitoli brevi in italiano. Rispondi solo con JSON valido, senza markdown. Schema esatto: {"segments":[{"start":0.0,"end":2.4,"text":"testo"}],"text":"trascrizione completa"}. Durata audio circa ${duration.toFixed(1)} secondi. Usa segmenti da 1 a 4 secondi, testi brevi e leggibili. Se non sei sicuro dei timestamp, distribuisci i segmenti in modo realistico lungo tutta la durata.`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: file.type || 'audio/mpeg', data: base64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json'
        }
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
    return parseAiJson(raw, duration);
  }

  function parseAiJson(raw, duration) {
    const cleaned = String(raw || '').replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return { segments: parsed, text: parsed.map(s => s.text).filter(Boolean).join(' ') };
      return parsed;
    } catch (_) {
      const text = cleaned.replace(/[{}\[\]"]/g, ' ').replace(/\s+/g, ' ').trim();
      const chunks = splitCaptionText(text, 42);
      const step = duration / Math.max(1, chunks.length);
      return { text, segments: chunks.map((chunk, i) => ({ start: i * step, end: Math.min(duration, (i + .92) * step), text: chunk })) };
    }
  }

  function normalizeSubtitleSegments(items, audioClip) {
    const out = [];
    for (const item of items || []) {
      const text = String(item.text || item.word || item.caption || '').trim();
      if (!text) continue;
      const rawStart = Number(item.start ?? item.startTime ?? 0);
      const rawEnd = Number(item.end ?? item.endTime ?? (rawStart + 2));
      const start = audioClip.start + Math.max(0, rawStart - (audioClip.trimStart || 0));
      const end = audioClip.start + Math.max(start + .6, rawEnd - (audioClip.trimStart || 0));
      out.push({ text, start, duration: clamp(end - start, .5, 8) });
    }
    return out;
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function createDraftSubtitles(text = dom.subtitleDraftText.value) {
    const audioClip = state.clips.audio[0];
    const startBase = audioClip?.start || 0;
    const total = audioClip?.duration || Math.max(8, state.duration || 20);
    const chunks = splitCaptionText(text || 'Questo è un esempio di sottotitolo automatico creato dalla webapp.', 42);
    const step = total / chunks.length;
    state.clips.subtitles.length = 0;
    chunks.forEach((chunk, i) => addSubtitleClip(chunk, startBase + i * step, Math.max(1.1, step * .92)));
  }
  function splitCaptionText(text, maxChars) {
    const words = String(text).replace(/\s+/g,' ').trim().split(' ');
    const chunks = []; let line = '';
    for (const w of words) {
      if ((line + ' ' + w).trim().length > maxChars && line) { chunks.push(line); line = w; }
      else line = (line + ' ' + w).trim();
    }
    if (line) chunks.push(line);
    return chunks.length ? chunks : [''];
  }

  function parseSRT(srt) {
    const blocks = srt.replace(/\r/g,'').split(/\n\n+/);
    const out = [];
    const rx = /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/;
    for (const block of blocks) {
      const lines = block.split('\n').filter(Boolean);
      const timeLine = lines.find(l => rx.test(l));
      if (!timeLine) continue;
      const m = timeLine.match(rx);
      const text = lines.slice(lines.indexOf(timeLine)+1).join(' ');
      out.push({ start:srtTime(m[1]), end:srtTime(m[2]), text });
    }
    return out;
  }
  function srtTime(v) { const [h,m,rest] = v.split(':'); const [s,ms] = rest.split(','); return Number(h)*3600 + Number(m)*60 + Number(s) + Number(ms)/1000; }

  function fitPhotosToAudio() {
    const audioEnd = Math.max(...state.clips.audio.map(c => c.start + c.duration), 0);
    const photos = state.clips.media.filter(c => c.kind === 'image' || c.kind === 'video');
    if (!audioEnd || !photos.length) return alert('Carica almeno una traccia audio e alcune foto/video.');
    pushHistory();
    const each = audioEnd / photos.length;
    photos.forEach((c,i) => { c.start = i * each; c.duration = Math.max(.4, each); });
    renderAll();
  }

  function autoBeatCut() {
    const audioEnd = Math.max(...state.clips.audio.map(c => c.start + c.duration), 0) || 15;
    const clips = state.clips.media;
    if (!clips.length) return alert('Aggiungi prima foto o video.');
    pushHistory();
    const pattern = [1.2, 1.2, .8, 1.8, 1.0, 1.0, 2.0];
    let t = 0;
    clips.forEach((c,i) => { c.start = t; c.duration = pattern[i % pattern.length]; c.motion = ['kenburns-in','pan-left','pan-right','pulse','float'][i%5]; c.transition = ['fade','slide-left','zoom','flash'][i%4]; t += c.duration; });
    if (t < audioEnd) clips[clips.length-1].duration += audioEnd - t;
    renderAll();
  }

  function deleteSelected() {
    const found = selectedClip(); if (!found) return;
    pushHistory();
    state.clips[found.track] = state.clips[found.track].filter(c => c.id !== found.clip.id);
    state.selected = null; renderAll();
  }
  function duplicateSelected() {
    const found = selectedClip(); if (!found) return;
    pushHistory();
    const copy = JSON.parse(JSON.stringify(found.clip)); copy.id = uid('clip'); copy.start += .3; copy.label = `${copy.label || copy.kind} copia`;
    state.clips[found.track].push(copy); selectClip(copy.id, found.track); renderAll();
  }

  function undo() {
    if (state.history.length < 2) return;
    const current = state.history.pop(); state.future.push(current);
    restoreProject(JSON.parse(state.history[state.history.length-1]));
  }
  function redo() {
    if (!state.future.length) return;
    const snap = state.future.pop(); state.history.push(snap); restoreProject(JSON.parse(snap));
  }

  function saveProjectFile() {
    const data = new Blob([JSON.stringify(serializeProject(), null, 2)], { type:'application/json' });
    downloadBlob(data, `${safeFileName(state.projectName)}-project.json`);
  }
  async function loadProjectFile(file) {
    const text = await readFileText(file);
    restoreProject(JSON.parse(text));
    pushHistory();
  }
  function saveAutosave() {
    try { localStorage.setItem('videomaker_autosave_v5', JSON.stringify(serializeProject())); } catch(_) {}
  }
  function loadAutosave() {
    const raw = localStorage.getItem('videomaker_autosave_v5');
    if (!raw) return;
    try { const data = JSON.parse(raw); if (data?.clips) restoreProject(data); } catch(_) {}
  }

  function downloadBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 10000);
  }
  function safeFileName(name) { return String(name || 'videomaker-studio-ai').toLowerCase().replace(/[^a-z0-9\-_]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'') || 'videomaker-studio-ai'; }
  function showLoading(title,text) { dom.loadingTitle.textContent = title; dom.loadingText.textContent = text || ''; dom.loadingOverlay.classList.remove('hidden'); }
  function updateLoading(percent,text) { dom.loadingText.textContent = `${percent}% • ${text || ''}`; }
  function hideLoading() { dom.loadingOverlay.classList.add('hidden'); }

  function initEvents() {
    dom.mediaInput.addEventListener('change', e => addFiles(e.target.files));
    dom.dropZone.addEventListener('dragover', e => { e.preventDefault(); dom.dropZone.classList.add('drag'); });
    dom.dropZone.addEventListener('dragleave', () => dom.dropZone.classList.remove('drag'));
    dom.dropZone.addEventListener('drop', e => { e.preventDefault(); dom.dropZone.classList.remove('drag'); addFiles(e.dataTransfer.files); });
    $$('.tab').forEach(tab => tab.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
      $$('.panel-tab').forEach(p => p.classList.remove('active')); $(`#${tab.dataset.tab}Tab`).classList.add('active');
    }));
    $('#addTextBtn').addEventListener('click', addTextClip);
    $('#addTrackTextBtn').addEventListener('click', addTextClip);
    $('#addSubtitleBtn').addEventListener('click', () => { pushHistory(); addSubtitleClip(); renderAll(); });
    $('#addTrackSubtitleBtn').addEventListener('click', () => { pushHistory(); addSubtitleClip(); renderAll(); });
    $('#fitPhotosBtn').addEventListener('click', fitPhotosToAudio);
    $('#autoBeatBtn').addEventListener('click', autoBeatCut);
    $('#deleteSelectedBtn').addEventListener('click', deleteSelected);
    dom.formatSelect.addEventListener('change', e => { pushHistory(); state.format = e.target.value; applyFormat(); saveAutosave(); });
    dom.fpsSelect.addEventListener('change', e => { state.fps = Number(e.target.value); saveAutosave(); });
    dom.playBtn.addEventListener('click', () => state.playing ? stopPlayback() : startPlayback());
    dom.timeSlider.addEventListener('input', e => { stopPlayback(); state.currentTime = Number(e.target.value); renderPreview(state.currentTime); });
    dom.timelineScroll.addEventListener('click', e => {
      if (!e.target.classList.contains('track-lane') && e.target !== dom.ruler) return;
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      state.currentTime = clamp(x / state.pps, 0, state.duration || 999);
      renderPreview(state.currentTime);
    });
    dom.zoomSlider.addEventListener('input', e => { state.pps = Number(e.target.value); renderTimeline(); });
    $('#zoomOutBtn').addEventListener('click', () => { state.pps = clamp(state.pps - 10,45,180); dom.zoomSlider.value = state.pps; renderTimeline(); });
    $('#zoomInBtn').addEventListener('click', () => { state.pps = clamp(state.pps + 10,45,180); dom.zoomSlider.value = state.pps; renderTimeline(); });
    dom.snapBtn.addEventListener('click', () => { state.snap = !state.snap; dom.snapBtn.classList.toggle('active', state.snap); });
    $('#exportWebmBtn').addEventListener('click', () => exportWebM(false));
    $('#exportMp4Btn').addEventListener('click', exportMP4);
    $('#saveProjectBtn').addEventListener('click', saveProjectFile);
    $('#loadProjectInput').addEventListener('change', e => e.target.files[0] && loadProjectFile(e.target.files[0]));
    $('#generateAiSubtitlesBtn').addEventListener('click', generateAiSubtitles);
    $('#makeDraftSubtitlesBtn').addEventListener('click', () => { pushHistory(); createDraftSubtitles(); renderAll(); });
    dom.srtInput.addEventListener('change', async e => {
      const file = e.target.files[0]; if (!file) return;
      const text = await readFileText(file); const cues = parseSRT(text);
      pushHistory(); state.clips.subtitles.length = 0; cues.forEach(c => addSubtitleClip(c.text, c.start, c.end - c.start)); renderAll();
    });
    $('#undoBtn').addEventListener('click', undo);
    $('#redoBtn').addEventListener('click', redo);
    $('#previewFitBtn').addEventListener('click', updateSafeArea);
    window.addEventListener('resize', updateSafeArea);
    document.addEventListener('keydown', e => {
      if (e.target.matches('input,textarea,select')) return;
      if (e.code === 'Space') { e.preventDefault(); state.playing ? stopPlayback() : startPlayback(); }
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    });
  }

  function seedDemo() {
    if (state.clips.media.length) return;
    addTextClip();
    const t = state.clips.text[0];
    t.text = 'VideoMaker Studio AI'; t.start = 0; t.duration = 3.2; t.y = .42; t.size = 74; t.animation = 'glow'; t.background = 'rgba(124,92,255,.28)';
    addSubtitleClip('Carica i tuoi file e crea un video professionale', .4, 2.8);
  }

  function init() {
    initEvents();
    renderPresets();
    const savedKey = localStorage.getItem('videomaker_ai_key') || localStorage.getItem('videomaker_openai_key');
    const savedProvider = localStorage.getItem('videomaker_ai_provider');
    if (savedProvider && dom.aiProvider) dom.aiProvider.value = savedProvider;
    if (savedKey) { dom.apiKeyInput.value = savedKey; dom.saveKeyCheck.checked = true; }
    loadAutosave();
    seedDemo();
    applyFormat();
    pushHistory();
    renderAll();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  }

  init();
})();
