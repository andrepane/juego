# LEXIA

LEXIA es una aplicación web estática, mobile first, para trabajar habilidades fonológicas y metalingüísticas en un contexto educativo o clínico. La primera actividad disponible es **Ordenar sílabas**: permite elegir dificultad y duración, construir palabras con piezas táctiles y consultar un resumen anónimo de la sesión.

## Uso local

Se necesita Node.js 20 o posterior solo para las pruebas. La aplicación no requiere compilación ni dependencias.

```bash
npm start
# Abrir http://localhost:4173 (los módulos ES no deben cargarse mediante file://)
npm test
```

## Organización

- `main.js`: navegación y presentación de la sesión.
- `src/exercises/orderSyllablesPlugin.js`: único motor de Ordenar sílabas y sus métricas.
- `src/exercises/orderSyllablesConfig.js`: reglas lingüísticas de los tres niveles.
- `src/core/`: registro de actividades, filtrado, historial y herramientas de corpus.
- `src/data/words/`: banco curado por categorías; `index.js` incorpora además la muestra procesada del corpus general.
- `src/data/raw/` y `src/data/processed/`: muestras y resultados de las herramientas de procesamiento.

Los niveles 1 y 2 usan estructuras CV-CV y estructuras trisílabas sencillas (`CV-CV-CV` y `V-CV-CV`). Se incluye esta segunda variante para disponer de al menos 20 alternativas sin alterar el corpus. El nivel 3 se obtiene de los metadatos estructurales existentes: se considera **trabada** una sílaba que comienza por `CC` y **mixta** cualquier estructura que no esté compuesta únicamente por `CV`. No se ha modificado silenciosamente el corpus.

## En desarrollo y limitaciones

La actividad de manipulación metalingüística aparece como próxima y no es accesible. No hay perfiles, backend, persistencia ni informes: el resumen vive únicamente durante la sesión del navegador.

Las utilidades del panel de administración y de importación se conservan para el trabajo de corpus, pero no se exponen en esta primera experiencia. Su integración de generación remota es experimental, depende de un servicio externo y no debe considerarse una vía validada para datos clínicos. El corpus CREA completo no se distribuye por tamaño y licencia: debe obtenerse y procesarse localmente; la muestra incluida no representa por sí sola un corpus clínicamente validado.
