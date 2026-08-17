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

Algunos resultados pueden ser **palabras inventadas**. Lo importante es transformar correctamente sus sílabas. La interfaz no clasifica el resultado como real o inventado: el corpus local es limitado y no constituye un diccionario fiable.

Los niveles filtran el banco local: nivel 1 usa bisílabas simples, nivel 2 trisílabas simples y nivel 3 palabras de dos o más sílabas con estructuras mixtas o trabadas. Las sílabas añadidas y sustitutas proceden de un inventario local revisable. La pantalla evita repetir la segmentación textual y ofrece la ayuda instrumental la primera vez que aparece cada operación, además de un control accesible para recuperarla.

El motor reparte las operaciones con una diferencia máxima de una ronda, baraja su orden mediante aleatoriedad inyectable y evita consecutivas cuando es posible. Después prioriza palabras base no usadas, elige las menos utilizadas al agotar alternativas, evita la repetición inmediata y nunca repite la identidad completa. Si no puede completar la duración devuelve `insufficient` sin reducirla.

Las métricas incluyen rondas, primer intento, errores, movimientos, deshacer y reiniciar globalmente, por operación y por ronda. El contexto usa `initial`, `medial` y `final`; en adición, principio es índice 0, final es el espacio posterior a la última sílaba y los espacios intermedios son mediales. Las inversiones usan `full` o `edges`.

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

El corpus local es acotado y no equivale a un diccionario clínicamente validado. Un futuro rediseño de dificultad deberá separar longitud, estructura, posición y operación; esta versión mantiene las reglas actuales. No se incluyen fonemas, letras, imágenes, audio, perfiles, informes, backend, IA ni persistencia. Las herramientas experimentales de administración e importación se conservan fuera de la experiencia de estas actividades; no intervienen en la generación de consignas.

## Configuración y contrato común de sesión

Ambas actividades consumen el modelo serializable de `src/core/sessionConfig.js`. Separa modo, duración, dimensiones lingüísticas y opciones exclusivas de cada actividad. Los perfiles Inicial, Intermedio y Avanzado son puntos de partida editables; cualquier cambio que deje de coincidir se identifica como Personalizado. El valor `4` en `syllableCounts` significa **cuatro o más sílabas** y solo selecciona entradas que ya existen en el corpus.

Los antiguos niveles 1, 2 y 3 se adaptan, respectivamente, a Inicial, Intermedio y Avanzado mediante `migrateLegacyLevelConfig`; no existe un segundo motor dimensional. La frecuencia del corpus se presenta como 1 Muy frecuente, 2 Frecuente y 3 Menos frecuente.

Los modos `therapist`, `supervised` (predeterminado) y `autonomous` se describen mediante políticas comunes. Los plugins mantienen `start`, `submit`, `next` y `getMetrics`, y pueden ofrecer `restartRound`, `skipRound`, `finishSession` y `getSessionState`. El registro valida esos métodos opcionales cuando están presentes. Las métricas comunes distinguen rondas completadas, omitidas y no realizadas, además de reinicios profesionales y finalización anticipada.

La disponibilidad se calcula sobre palabras jugables y retos concretos antes de comenzar. En Manipular, las posiciones filtran el banco de retos: `edges` requiere ambos extremos y `full` sigue siendo una inversión completa independiente de inicial/medial/final.

### Limitación léxica deliberada

No se filtra ni se informa “palabra real” frente a “pseudopalabra”: el corpus no permite determinar ese estado con fiabilidad. Esta base tampoco incorpora audio, imágenes, adaptación automática, datos personales ni persistencia.
