# VideoMaker Studio AI Pro V8

Webapp statica pronta per GitHub Pages per creare video da foto, video, audio, testi, effetti, transizioni e sottotitoli AI.


## Novità V8 - Fix testi e sottotitoli doppi

- Nell’anteprima testi e sottotitoli non vengono più disegnati due volte.
- L’anteprima usa elementi cliccabili sopra il canvas, quindi testi e sottotitoli restano trascinabili.
- Durante l’esportazione WEBM/MP4 testi e sottotitoli vengono invece inseriti nel canvas, così compaiono correttamente nel video finale.
- Cache PWA aggiornata: `videomaker-studio-ai-v12-preview-no-duplicates`.

## Novità V4 - Editor più professionale

- I filtri ora si applicano anche a **testi** e **sottotitoli**, non solo a foto/video.
- Puoi cliccare direttamente sull'anteprima e trascinare **testi, sottotitoli, foto e video** per riposizionarli.
- I media hanno controlli di posizione X/Y e scala nell'Inspector.
- La sezione **Intro/Finale** ha stili grafici pronti, scelta font, animazione, colori titolo/sottotitolo e palette visuali.
- La console è stata resa più responsive per cellulare, tablet e schermo dimezzato su PC.
- Cache PWA aggiornata: `videomaker-studio-ai-v8`.

## Novità versioni precedenti

- Esportazione MP4 più stabile:
  - prima prova l'esportazione MP4 nativa del browser;
  - se non disponibile, prova la conversione WEBM → MP4 con FFmpeg.wasm;
  - messaggi di errore più chiari.
- Sottotitoli AI compatibili sia con Gemini sia con OpenAI.
- Campo “Motore AI” per scegliere Gemini o OpenAI.

## Novità V3 - Messaggi intro/finale modificabili

Questa versione rimuove i messaggi demo automatici dai nuovi progetti e aggiunge una scheda **Intro/Finale**. Da lì puoi:

- attivare o disattivare il messaggio iniziale;
- modificare titolo e sottotitolo iniziale;
- attivare o disattivare il messaggio finale;
- modificare titolo e sottotitolo finale;
- scegliere la durata di intro e finale;
- rimuovere i vecchi messaggi pubblicitari/demo già presenti in un progetto salvato.

I messaggi vengono inseriti nelle corsie **Testi** e **Sottotitoli**, quindi possono essere trascinati, ridimensionati e modificati anche dalla timeline.

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
- Effetti video: Cinematic, Caldo, Freddo, Bianco/Nero, Vintage, Dream Glow, Neon, Drammatico, Soft Portrait, Social Pop, Noir, VHS, Glitch, Blur Mood, Breaking News.
- Movimenti foto: Zoom In, Zoom Out, Pan, Rotazione lenta, Pulse Beat, Float.
- Transizioni: Fade, Crossfade, Slide, Zoom Blur, Wipe, Circle Reveal, Spin, Flash, Fade Black, Pixel Pop, Split, Swirl.
- Sottotitoli:
  - creazione manuale;
  - importazione SRT;
  - generazione demo da testo;
  - generazione AI da audio con Gemini, OpenAI oppure proxy sicuro.
- Esportazione WEBM.
- Esportazione MP4.
- Salvataggio e caricamento progetto JSON.
- PWA installabile.

## Pubblicazione su GitHub Pages

1. Carica tutti i file di questa cartella nel repository GitHub.
2. Vai su `Settings` > `Pages`.
3. In `Build and deployment`, scegli `Deploy from a branch`.
4. Seleziona branch `main` e cartella `/root`.
5. Salva.
6. Attendi qualche minuto e poi apri il link pubblico.

## Importante dopo l'aggiornamento

Dopo aver sostituito i file su GitHub, apri la webapp e fai un aggiornamento forzato:

- Windows: `CTRL + F5`
- Mac: `CMD + SHIFT + R`

Se hai installato la PWA, chiudila e riaprila. La nuova cache usa il nome `videomaker-studio-ai-v12-preview-no-duplicates`, quindi il service worker eliminerà la cache vecchia.

## Esportazione MP4

Questa versione prova prima a creare MP4 direttamente dal browser. Questo metodo è più leggero e riduce il rischio di blocchi durante il caricamento di FFmpeg.wasm.

Se il browser non supporta MP4 nativo, la webapp tenta la conversione con FFmpeg.wasm. Per video lunghi, molti effetti o FPS 60, la conversione può richiedere più memoria. In caso di errore:

- usa Chrome o Edge aggiornato;
- imposta FPS a 30;
- prova con un video più corto;
- in alternativa esporta in WEBM.

## Sottotitoli AI con Gemini

1. Apri la scheda `Sottotitoli AI`.
2. Scegli `Gemini` come motore AI.
3. Inserisci la tua chiave API Gemini.
4. Scegli il modello, consigliato `gemini-3.5-flash` o `gemini-2.5-flash`.
5. Carica una traccia audio nella timeline.
6. Premi `Genera sottotitoli AI`.

Con Gemini i tempi dei sottotitoli possono essere approssimati. Se vuoi timestamp più precisi, puoi usare OpenAI con i modelli di trascrizione.

## Sicurezza chiavi API

Non inserire mai una chiave API direttamente dentro i file pubblicati su GitHub. La webapp permette di inserirla solo dall'interfaccia. La modalità più sicura resta usare un proxy personale, ad esempio un Cloudflare Worker.

## File inclusi

- `index.html`
- `style.css`
- `script.js`
- `manifest.webmanifest`
- `service-worker.js`
- `icon.svg`
- `README.md`

## Aggiornamento V5 - anteprima e trascinamento

Questa versione corregge la visualizzazione dell'anteprima e aggiunge un livello interattivo sopra il canvas:

- l'anteprima mantiene sempre il formato corretto senza deformarsi o tagliarsi;
- testi e sottotitoli attivi compaiono anche come elementi cliccabili sopra l'anteprima;
- testi e sottotitoli possono essere trascinati direttamente nell'anteprima con mouse o dito;
- foto e video selezionati possono essere spostati cliccando e trascinando nell'anteprima;
- migliorata la risposta dell'interfaccia quando lo schermo viene dimezzato o usato da cellulare;
- cache PWA aggiornata alla versione V9.

## Correzione V7 sottotitoli AI

La V7 corregge la generazione sottotitoli con Gemini usando il formato REST corretto `inlineData` / `mimeType`. Per file audio più grandi o quando l'invio inline fallisce, prova automaticamente la Gemini Files API. Gli errori ora mostrano anche il dettaglio tecnico, così è più facile capire se il problema dipende da chiave API, modello, formato audio, dimensione file o rete.


## Novità V7

- Retry automatico su errore Gemini 503 / UNAVAILABLE.
- Cambio modello Gemini automatico se quello selezionato è sovraccarico.
- Default su `gemini-2.5-flash`, con fallback su `gemini-2.0-flash`, `gemini-3-flash-preview` e `gemini-3.5-flash`.
- Messaggi di errore più chiari quando Gemini è temporaneamente in alta domanda.
