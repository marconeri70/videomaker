# VideoMaker Studio AI

Webapp statica pronta per GitHub Pages per creare video da foto, video, audio, testi, effetti, transizioni e sottotitoli AI.

## Funzioni principali

- Interfaccia professionale tipo mini editor video.
- Timeline multi-corsia:
  - Video / foto
  - Testi
  - Sottotitoli
  - Audio
- Blocchi selezionabili, trascinabili e ridimensionabili.
- Miniature reali nella timeline per foto e video.
- Waveform grafico per la traccia audio.
- Inspector laterale per modificare inizio, durata, testo, colore, posizione, filtri, movimenti e transizioni.
- Effetti video:
  - Cinematic
  - Caldo
  - Freddo
  - Bianco/Nero
  - Vintage
  - Dream Glow
  - Neon
  - Drammatico
  - Soft Portrait
  - Social Pop
  - Noir
  - VHS
  - Glitch
  - Blur Mood
  - Breaking News
- Movimenti foto:
  - Zoom In
  - Zoom Out
  - Pan Sinistra
  - Pan Destra
  - Pan Alto
  - Pan Basso
  - Rotazione lenta
  - Pulse Beat
  - Float
- Transizioni:
  - Fade
  - Crossfade
  - Slide Left / Right / Up / Down
  - Zoom Blur
  - Wipe
  - Circle Reveal
  - Spin
  - Flash
  - Fade Black
  - Pixel Pop
  - Split
  - Swirl
- Sottotitoli:
  - Creazione manuale
  - Importazione SRT
  - Generazione demo da testo
  - Generazione AI da audio con API OpenAI oppure proxy sicuro
- Esportazione WEBM.
- Esportazione MP4 tramite FFmpeg.wasm.
- Salvataggio e caricamento progetto JSON.
- PWA installabile.

## Pubblicazione su GitHub Pages

1. Crea un nuovo repository GitHub, ad esempio `videomaker-studio-ai`.
2. Carica tutti i file contenuti in questa cartella.
3. Vai su `Settings` > `Pages`.
4. In `Build and deployment`, scegli `Deploy from a branch`.
5. Seleziona branch `main` e cartella `/root`.
6. Salva.
7. Dopo qualche minuto GitHub ti darà il link pubblico.

## Sottotitoli AI

La webapp può inviare un file audio alla API OpenAI per ricevere una trascrizione con segmenti temporali. Per sicurezza, non inserire mai una chiave API direttamente nel codice pubblicato online.

Hai due modalità:

### Modalità semplice

Inserisci la tua chiave API nel campo della webapp. La chiave rimane nel browser e non viene salvata nei file GitHub. Puoi scegliere se salvarla nel localStorage del browser.

### Modalità più sicura

Usa un proxy personale, ad esempio un Cloudflare Worker, e inserisci l'URL nel campo `Proxy URL opzionale`. In questo modo la chiave API resta nel worker e non viene mai mostrata al browser.

## Note importanti

- L'esportazione video viene fatta nel browser. Video lunghi o con molti effetti possono richiedere tempo.
- La conversione MP4 carica FFmpeg.wasm da CDN. Serve connessione internet.
- Su dispositivi poco potenti conviene esportare video brevi.
- Se MP4 non funziona per limiti del browser, esporta in WEBM.
- I file locali non vengono caricati su un server: restano nel browser, salvo l'uso volontario della funzione AI sottotitoli.

## File inclusi

- `index.html`
- `style.css`
- `script.js`
- `manifest.webmanifest`
- `service-worker.js`
- `icon.svg`
- `README.md`
