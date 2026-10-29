import functions from '@google-cloud/functions-framework';
import { handle } from './guard.mjs';

functions.cloudEvent('budgetGuard', (cloudEvent) => handle(cloudEvent));
