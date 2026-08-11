import { itemHandlers } from '../../../../../lib/mobileUserDataRoutes';

export const runtime = 'nodejs';

const handlers = itemHandlers('note');

export const OPTIONS = handlers.OPTIONS;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
