# Datos léxicos (CREA)

Este repositorio **no versiona** el corpus completo ni archivos ZIP grandes.

## Uso local del corpus

1. Coloca `CREA_total.zip` manualmente en:
   - `src/data/raw/CREA_total.zip`
2. Procesa el corpus localmente con el flujo/herramienta de procesamiento que use `src/core/wordProcessor.js`.
3. Publica únicamente salidas pequeñas y revisadas, por ejemplo:
   - `src/data/processed/spanishWordsCore.json`

## Reglas de versionado

- No subir ZIPs ni datasets grandes a GitHub.
- `src/data/raw/*.zip` está ignorado por Git.
- Mantener en el repositorio solo código y muestras pequeñas.
