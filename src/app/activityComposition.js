import { createActivityComposition } from './activityRuntime.js';
import { ACTIVITY_DEFINITIONS } from '../exercises/activityDefinitions.js';
import { createOrderSyllablesPlugin } from '../exercises/orderSyllablesPlugin.js';
import { createManipulateSyllablesPlugin } from '../exercises/manipulateSyllablesPlugin.js';
import { createSessionConfigurator } from '../ui/sessionConfigurator.js';
import { createOrderSyllablesController } from '../ui/activities/orderSyllablesController.js';
import { createManipulateSyllablesController } from '../ui/activities/manipulateSyllablesController.js';

export const activityComposition = createActivityComposition([
  { definition: ACTIVITY_DEFINITIONS['order-syllables'], createPlugin: createOrderSyllablesPlugin, createController: createOrderSyllablesController, createConfigurator: createSessionConfigurator },
  { definition: ACTIVITY_DEFINITIONS['manipulate-syllables'], createPlugin: createManipulateSyllablesPlugin, createController: createManipulateSyllablesController, createConfigurator: createSessionConfigurator }
]);
