import connectMongoDB from './mongodb';
import AnalyticsEvent from '../models/AnalyticsEvent';
import { sanitizeProps, type EventName } from './analyticsSchema';

/**
 * One analytics row written by the server itself - a level crossed, a daily
 * goal met, a win-back mail sent. Same allowlist as the client sinks
 * (`sanitizeProps`), so nothing written here can carry more than they could.
 *
 * NEVER THROWS. Every caller is in the middle of something that matters more
 * than the measurement (an XP grant, a mail run), and a failed insert must
 * cost nothing but the data point.
 */
export async function recordServerEvent(
  name: EventName,
  userId: unknown,
  props: Record<string, unknown> = {},
): Promise<void> {
  try {
    await connectMongoDB();
    await AnalyticsEvent.create({
      name,
      userId: userId ?? null,
      props: sanitizeProps(name, props),
    });
  } catch (error) {
    console.error(`[analytics] ${name} not recorded`, error);
  }
}
