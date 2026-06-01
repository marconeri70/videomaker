# VideoMaker Studio

WebApp statica pronta per GitHub Pages per creare video partendo da foto, video, audio e testi.

## Funzioni principali

- Importazione di più foto.
- Importazione di video.
- Importazione di una traccia audio.
- Timeline con corsie separate:
  - Foto / Video
  - Testi
  - Audio
- Blocchi trascinabili nella timeline.
- Maniglie laterali per allungare o accorciare clip, testi e audio.
- Taglio della traccia audio direttamente dalla corsia audio.
- Corsia testo dedicata, con testi spostabili e ridimensionabili.
- Pannello di modifica dell’elemento selezionato.
- Menu effetti con:
  - filtri colore
  - transizioni
  - effetti movimento
- Pulsante per adattare automaticamente foto/video alla durata dell’audio.
- Anteprima del montaggio.
- Miniature grafiche reali dentro la timeline per foto e video.
- Esportazione in formato WEBM.
- Esportazione diretta in MP4 nel browser tramite FFmpeg.wasm.
- Installabile come PWA.

## Come pubblicarla su GitHub Pages

1. Crea un nuovo repository su GitHub.
2. Carica tutti i file contenuti in questa cartella.
3. Vai su `Settings`.
4. Vai su `Pages`.
5. Seleziona `Deploy from a branch`.
6. Scegli branch `main` e cartella `/root`.
7. Salva.

Dopo qualche minuto GitHub fornirà il link pubblico della webapp.

## Uso rapido

1. Carica foto e/o video.
2. Carica una traccia audio.
3. Trascina i blocchi nella timeline.
4. Usa le maniglie laterali per modificare la durata.
5. Premi `+ Aggiungi testo` per creare un testo nella corsia dedicata.
6. Seleziona una clip e applica filtri, transizioni o movimenti.
7. Usa `Adatta foto/video all’audio` per sincronizzare il montaggio alla musica.
8. Premi `Anteprima` per controllare il risultato.
9. Premi `Esporta WEBM` per generare velocemente il video.
10. Premi `Esporta MP4` per creare un file MP4 direttamente nel browser.

## Nota sul formato video

La webapp esporta ancora in WEBM per avere una generazione veloce e compatibile con il browser. In più include l’esportazione MP4: prima genera il video base, poi lo converte nel browser con FFmpeg.wasm. La prima conversione può essere lenta perché deve scaricare il motore WebAssembly. Su telefoni o PC poco potenti è consigliato iniziare con video brevi.
