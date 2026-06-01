# VideoMaker WebApp

WebApp statica per GitHub Pages che permette di creare un video partendo da foto, video, audio e testi.

## Funzioni incluse

- Upload di più foto
- Upload di video da inserire nella timeline
- Upload di un audio principale
- Audio dei video opzionale durante l’esportazione
- Testi sovrapposti per ogni scena
- Formato verticale, orizzontale o quadrato
- Anteprima nel browser
- Esportazione in formato WEBM
- Installabile come PWA base

## Come pubblicarla su GitHub Pages

1. Crea un nuovo repository su GitHub, ad esempio `videomaker-webapp`.
2. Carica tutti questi file nella root del repository:
   - `index.html`
   - `style.css`
   - `script.js`
   - `manifest.webmanifest`
   - `service-worker.js`
   - `icon.svg`
3. Vai su **Settings** del repository.
4. Apri **Pages**.
5. In **Build and deployment**, scegli:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. Salva.
7. Dopo qualche minuto GitHub mostrerà il link pubblico della WebApp.

## Limite importante

La versione 1 esporta in WEBM perché funziona direttamente dal browser senza server.
Per esportare direttamente in MP4 bisogna aggiungere una seconda fase con FFmpeg.wasm oppure usare un servizio esterno/server.
