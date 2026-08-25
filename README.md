# LEXIA

LEXIA es una aplicación web estática, *mobile first*, para trabajar habilidades fonológicas y metalingüísticas en un contexto educativo o clínico. Está escrita en HTML, CSS y JavaScript modular, sin frameworks, backend, perfiles ni persistencia.

## Actividades

### Ordenar sílabas

Combina cinco retos seleccionables: ordenar, completar una sílaba ausente con distractores, retirar una intrusa por identidad, corregir un intercambio y reconstruir tras observar un modelo durante 2, 3 o 5 segundos.

### Manipular sílabas

Parte de una palabra visible y pide construir un resultado nuevo mediante fichas pulsables con identificadores únicos. Incluye cuatro operaciones:

- **Quitar** una sílaba inicial, medial o final.
- **Añadir** una sílaba segura al principio, al final o —desde nivel 2— en una posición intermedia.
- **Sustituir** una sílaba por otra distinta; las consignas precisan la posición cuando hay repeticiones.
- **Invertir** el orden completo o intercambiar los extremos, según el nivel.

Las operaciones se practican mediante ejecutar una consigna, alcanzar un resultado, identificar la operación, corregir un error controlado o una transformación encadenada de dos pasos. Los perfiles son puntos de partida editables: Inicial excluye memoria y cadenas; Intermedio incorpora ambas de forma pausada; Avanzado permite deducir la operación.

El registro de variantes genera y valida los retos antes de iniciar. Un planificador común equilibra tipos de reto, evita repetir inmediatamente la misma variante y prioriza palabras base diferentes. La disponibilidad muestra los cupos necesarios y disponibles por variante y, en Manipular, también por operación.

Las fichas conservan la alternativa por pulsación y teclado e incorporan arrastre en dispositivos compatibles. Las zonas de trabajo son desplazables en palabras largas, anuncian cambios mediante `aria-live` y desactivan las transiciones con `prefers-reduced-motion`.

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

## Arquitectura extensible de actividades

LEXIA separa cuatro conceptos que antes estaban reunidos en `main.js`:

- La **definición** contiene únicamente identidad, texto del catálogo, estado, orden y capacidades.
- El **plugin** es el motor de sesión: crea retos, aplica acciones, conserva las reglas lingüísticas y calcula métricas. No conoce el DOM.
- El **controlador** representa una actividad y traduce pulsaciones, teclado y arrastre en acciones del plugin. Los dos controladores implementan el mismo contrato: `activityId`, `mount`, `openConfiguration`, `startSession`, `renderRound`, `finishSession`, `renderSummary` y `destroy`.
- El **runtime** resuelve una composición completa mediante `activityId`, mantiene un único controlador activo y garantiza su limpieza al cambiar de actividad o volver a portada.

`src/app/activityComposition.js` es la única tabla de composición. Cada entrada reúne definición, fábrica de plugin, fábrica de controlador y fábrica de configurador. Una actividad `available` se rechaza si falta cualquiera de esas piezas; una `coming-soon` puede no tener motor ni controlador porque el catálogo no permite abrirla. No hay mapas paralelos ni condiciones por identificador en `main.js`.

La shell común proporciona navegación entre pantallas, foco en el título, progreso accesible, controles profesionales, confirmaciones de salida y finalización, y métricas comunes. Los templates de configuración, juego y resumen específicos viven junto a cada controlador y se montan bajo una raíz propia. `index.html` conserva solo portada y diálogos compartidos: es una decisión deliberada para seguir siendo un sitio estático sencillo sin acumular una pantalla completa por cada actividad futura.

Continúan siendo específicos el aspecto de las fichas, las acciones aceptadas, el feedback pedagógico y las secciones particulares del resumen. Las reglas lingüísticas y métricas detalladas continúan en sus plugins; el configurador dimensional sigue siendo compartido.

### Añadir una actividad en el futuro

1. Añadir su definición canónica a `activityDefinitions.js` (usar `coming-soon` mientras no esté completa).
2. Crear un plugin que implemente el contrato del registro sin acceder al DOM.
3. Crear un controlador con el contrato común, un template encapsulado y listeners abortables o equivalentes.
4. Reutilizar la shell de sesión y dejar en el controlador solo la representación y traducción de interacciones específicas.
5. Añadir exactamente una entrada a `activityComposition.js` y sus pruebas de composición, motor y controlador.
6. Marcarla `available` únicamente cuando definición, plugin, controlador, configurador y destino navegable sean válidos.

## Organización

- `main.js`: crea el registro y el runtime, inicializa la portada y enlaza el catálogo; no controla rondas.
- `src/app/activityRuntime.js`: contrato, validación, resolución y ciclo de vida del controlador activo.
- `src/app/activityComposition.js`: composición única `activityId → definición/plugin/controlador/configurador`.
- `src/ui/activities/`: templates y controladores visuales aislados de las dos actividades.
- `src/ui/session/`: shell, progreso, controles profesionales y resumen comunes.
- `src/exercises/activityDefinitions.js`: fuente central de metadatos e identificadores de las actividades soportadas.
- `src/exercises/orderSyllablesPlugin.js`, `orderSyllablesVariants.js` y `orderSyllablesConfig.js`: sesión, registro de variantes y reglas de Ordenar sílabas.
- `src/exercises/manipulateSyllablesPlugin.js` y `manipulateSyllablesConfig.js`: motor, métricas, niveles e inventario seguro exclusivos de Manipular sílabas.
- `src/core/exerciseRegistry.js`: contrato y registro común de plugins.
- `src/ui/activityCatalog.js`: agrupación por áreas, tarjetas y selección delegada del catálogo.
- `src/core/challengePlanner.js`: planificación equilibrada reutilizable por variante.
- `src/core/wordUtils.js`: acceso y filtros compartidos del corpus.
- `src/data/words/`: banco curado por categorías y muestra procesada del corpus general.
- `test/`: suites deterministas de ambas actividades.

## Limitaciones actuales

El corpus local es acotado y no equivale a un diccionario clínicamente validado. Un futuro rediseño de dificultad deberá separar longitud, estructura, posición y operación; esta versión mantiene las reglas actuales. No se incluyen fonemas, letras, imágenes, audio, perfiles, informes, backend, IA ni persistencia. Las herramientas experimentales de administración e importación se conservan fuera de la experiencia de estas actividades; no intervienen en la generación de consignas.

## Configuración y contrato común de sesión

Ambas actividades consumen el modelo serializable de `src/core/sessionConfig.js`. Separa modo, duración, dimensiones lingüísticas y opciones exclusivas de cada actividad. Los perfiles Inicial, Intermedio y Avanzado son puntos de partida editables; cualquier cambio que deje de coincidir se identifica como Personalizado. El valor `4` en `syllableCounts` significa **cuatro o más sílabas** y solo selecciona entradas que ya existen en el corpus.

Los antiguos niveles 1, 2 y 3 se adaptan, respectivamente, a Inicial, Intermedio y Avanzado mediante `migrateLegacyLevelConfig`; no existe un segundo motor dimensional. La frecuencia del corpus se presenta como 1 Muy frecuente, 2 Frecuente y 3 Menos frecuente.

Los modos `therapist`, `supervised` (predeterminado) y `autonomous` se describen mediante políticas comunes. Los plugins mantienen `start`, `submit`, `next` y `getMetrics`, y pueden ofrecer `restartRound`, `skipRound`, `finishSession` y `getSessionState`. El registro valida esos métodos opcionales cuando están presentes. Las métricas comunes distinguen rondas completadas, omitidas y no realizadas, además de reinicios profesionales y finalización anticipada.

## Plugins de actividad y catálogo

Un plugin de actividad es el objeto que reúne la identidad pública de una actividad y su contrato de ejecución. Sus metadatos obligatorios son:

- `id`, `title` y `shortDescription`;
- `areaId` y `areaTitle` (puede aportar también `areaDescription` para el encabezado del catálogo);
- `icon`, una representación textual sencilla y accesible como decoración;
- `status`, con uno de los valores `available`, `coming-soon` o `hidden`;
- `sortOrder`, un número que determina el orden de las tarjetas;
- `capabilities`, con los booleanos `supportsImages`, `supportsAudio`, `supportsText` y `supportsMetrics`;
- los métodos `start`, `submit`, `next` y `getMetrics`, además de los métodos opcionales de sesión ya descritos.

Las definiciones canónicas viven en `src/exercises/activityDefinitions.js`. La factoría del motor incorpora su definición al objeto que devuelve y `main.js` registra ese objeto mediante `registry.register(...)`. El registro rechaza metadatos incompletos, métodos inválidos e identificadores duplicados. `list()` permite descubrir las actividades visibles y filtrar por estado; `listByArea()` las devuelve agrupadas por área. Ambos métodos excluyen las actividades `hidden` y ordenan por `sortOrder`.

La portada se genera automáticamente desde `registry.listByArea()`: no necesita añadir HTML ni condiciones por tarjeta. Una actividad `available` abre su configurador, una `coming-soon` se presenta desactivada y una `hidden` no se renderiza. Para incorporar una futura actividad será necesario añadir su definición, devolverla desde su plugin y registrar la factoría en la composición de la aplicación.

La composición de la aplicación valida el destino navegable antes de registrar una actividad disponible. Por eso la portada solo ofrece motores que pueden resolverse y montarse completamente.

La disponibilidad se calcula sobre palabras jugables y retos concretos antes de comenzar. En Manipular, las posiciones filtran el banco de retos: `edges` requiere ambos extremos y `full` sigue siendo una inversión completa independiente de inicial/medial/final.

### Limitación léxica deliberada

No se filtra ni se informa “palabra real” frente a “pseudopalabra”: el corpus no permite determinar ese estado con fiabilidad. Esta base tampoco incorpora audio, imágenes, adaptación automática, datos personales ni persistencia.
