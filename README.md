# VideoMaker Timeline

WebApp statica per montare video da foto, video, audio e testi direttamente dal browser. È pensata per essere pubblicata gratis su GitHub Pages.

## Funzioni principali

- Caricamento di foto multiple.
- Caricamento di video.
- Caricamento di una traccia audio.
- Timeline con corsia scene e corsia audio.
- Selezione e modifica di ogni foto/video.
- Durata foto modificabile manualmente.
- Pulsante **Adatta foto all'audio** per distribuire automaticamente la durata delle foto sulla lunghezza della musica.
- Taglio audio con campo inizio/fine.
- Prova audio.
- Testo sovrapposto per ogni scena.
- Modifica posizione, dimensione e colore del testo.
- Taglio video con inizio/fine.
- Anteprima del montaggio.
- Esportazione in WEBM.
- PWA installabile.

## Come pubblicarla su GitHub Pages

1. Crea un nuovo repository su GitHub, ad esempio `videomaker-timeline`.
2. Carica tutti i file di questa cartella nel repository.
3. Vai su **Settings**.
4. Vai su **Pages**.
5. In **Build and deployment**, seleziona **Deploy from a branch**.
6. Scegli branch `main` e cartella `/root`.
7. Salva.
8. Dopo poco GitHub ti mostrerà il link pubblico della webapp.

## Come usarla

1. Carica foto e video.
2. Carica una traccia audio.
3. Imposta inizio e fine dell'audio, se vuoi tagliare la musica.
4. Premi **Adatta foto all'audio** per distribuire le foto sulla durata della traccia.
5. Clicca una scena nella timeline.
6. Modifica durata, testo, zoom, colore e posizione del testo.
7. Premi **Anteprima**.
8. Quando il risultato va bene, premi **Esporta WEBM**.

## Nota sul formato video

La webapp esporta in WEBM perché funziona direttamente nel browser senza server e senza programmi esterni. Se ti serve MP4, puoi convertire il file con CapCut, Canva, VLC o un convertitore online.
