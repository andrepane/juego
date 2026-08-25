import { createExerciseRegistry } from './src/core/exerciseRegistry.js';
import { activityComposition } from './src/app/activityComposition.js';
import { createActivityRuntime } from './src/app/activityRuntime.js';
import { bindActivityCatalog, renderActivityCatalog } from './src/ui/activityCatalog.js';
import { createSessionShell } from './src/ui/session/sessionShell.js';

const root = document.querySelector('#app');
const shell = createSessionShell({ root, home: 'home' });
const registry = createExerciseRegistry();
activityComposition.list().forEach(entry => {
  registry.register(entry.definition);
});

const exitElement = document.querySelector('#exit-dialog');
const finishElement = document.querySelector('#finish-dialog');
let finishAction = null;
const dialogs = {
  exit: {
    element: exitElement,
    cancel: document.querySelector('#cancel-exit'),
    confirm: document.querySelector('#confirm-exit'),
    open: () => exitElement.showModal()
  },
  finish: { open(action) { finishAction = action; finishElement.showModal(); } }
};
const runtime = createActivityRuntime({ composition: activityComposition, root, shell, dialogs });

dialogs.exit.cancel.addEventListener('click', () => exitElement.close());
dialogs.exit.confirm.addEventListener('click', () => { exitElement.close(); runtime.home(); });
document.querySelector('#cancel-finish').addEventListener('click', () => { finishAction = null; finishElement.close(); });
document.querySelector('#confirm-finish').addEventListener('click', () => { finishElement.close(); const action = finishAction; finishAction = null; action?.(); });
renderActivityCatalog(document.querySelector('#activity-catalog'), registry);
bindActivityCatalog(document.querySelector('#activity-catalog'), activityId => runtime.openConfiguration(activityId));
shell.home();
