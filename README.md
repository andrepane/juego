# LEXIA

LEXIA es una aplicación web estática, *mobile first*, para trabajar habilidades fonológicas y metalingüísticas en un contexto educativo o clínico. Está escrita en HTML, CSS y JavaScript modular, sin frameworks, backend, perfiles ni persistencia.

## Actividades

### Ordenar sílabas

Presenta las sílabas desordenadas de una palabra del corpus y pide reconstruir la palabra real. Conserva sus tres niveles, interacción, puntuación y selección independiente.

### Manipular sílabas

Parte de una palabra visible y pide construir un resultado nuevo mediante fichas pulsables con identificadores únicos. Incluye cuatro operaciones:

- **Quitar** una sílaba inicial, medial o final.
- **Añadir** una sílaba segura al principio, al final o —desde nivel 2— en una posición intermedia.
- **Sustituir** una sílaba por otra distinta; las consignas precisan la posición cuando hay repeticiones.
- **Invertir** el orden completo o intercambiar los extremos, según el nivel.

Algunos resultados son **pseudopalabras**. Esto es intencionado: se evalúa la transformación silábica, no que el resultado figure en el diccionario. Solo se etiqueta como palabra real cuando coincide con el corpus local.

Los niveles filtran el banco local: nivel 1 usa bisílabas simples, nivel 2 trisílabas simples y nivel 3 palabras de dos o más sílabas con estructuras mixtas o trabadas. Las sílabas añadidas y sustitutas proceden de un inventario local revisable. El motor crea identidades con palabra, operación, posición, sílaba y variante, distribuye cíclicamente las operaciones seleccionadas y elige sin repetir una identidad. Si no alcanza la duración solicitada devuelve un estado `insufficient` en vez de rellenar con repeticiones.

Retos distintos disponibles actualmente (pueden variar si se revisa el corpus):

| Nivel | Quitar | Añadir | Sustituir | Invertir |
| --- | ---: | ---: | ---: | ---: |
| 1 | 46 | 368 | 357 | 22 |
| 2 | 57 | 608 | 445 | 19 |
| 3 | 87 | 1952 | 1383 | 70 |

## Uso local y pruebas

Se necesita Node.js 20 o posterior solo para las pruebas. La aplicación no requiere compilación ni dependencias.

```bash
npm start
# Abrir http://localhost:4173
npm test
```

`npm test` ejecuta conjuntamente las suites independientes de Ordenar sílabas y Manipular sílabas mediante el ejecutor nativo de Node.

## Organización

- `main.js`: registro, navegación y presentación de las dos sesiones.
- `src/exercises/orderSyllablesPlugin.js` y `orderSyllablesConfig.js`: motor y reglas exclusivos de Ordenar sílabas.
- `src/exercises/manipulateSyllablesPlugin.js` y `manipulateSyllablesConfig.js`: motor, métricas, niveles e inventario seguro exclusivos de Manipular sílabas.
- `src/core/exerciseRegistry.js`: contrato y registro común de plugins.
- `src/core/wordUtils.js`: acceso y filtros compartidos del corpus.
- `src/data/words/`: banco curado por categorías y muestra procesada del corpus general.
- `test/`: suites deterministas de ambas actividades.

## Limitaciones actuales

El corpus local y la clasificación palabra real/inventada son acotados y no equivalen a un diccionario clínicamente validado. No se incluyen fonemas, letras, imágenes, audio, perfiles, informes, backend, IA ni persistencia. Las herramientas experimentales de administración e importación se conservan fuera de la experiencia de estas actividades; no intervienen en la generación de consignas.
