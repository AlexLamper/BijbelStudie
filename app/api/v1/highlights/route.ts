import { collectionHandlers } from '../../../../lib/mobileUserDataRoutes';

export const runtime = 'nodejs';

const handlers = collectionHandlers('highlight');

export const OPTIONS = handlers.OPTIONS;
export const GET = handlers.GET;
export const POST = handlers.POST;
