import { collectionHandlers } from '../../../../lib/mobileUserDataRoutes';

export const runtime = 'nodejs';

const handlers = collectionHandlers('bookmark');

export const OPTIONS = handlers.OPTIONS;
export const GET = handlers.GET;
export const POST = handlers.POST;
