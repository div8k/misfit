import type { Mode, Variant } from './types.ts';

// Provider-independent analytics. The default sink only keeps events in memory
// for the playtest export; nothing leaves the device. No fingerprinting,
// location, free text or advertising identifiers are ever recorded.

export type EventName =
  | 'landing_view'
  | 'tutorial_start'
  | 'tutorial_complete'
  | 'daily_start'
  | 'round_identify'
  | 'round_repair_commit'
  | 'round_complete'
  | 'daily_complete'
  | 'share_intent'
  | 'clipboard_success'
  | 'share_sheet_resolved'
  | 'referral_landing'
  | 'referral_start'
  | 'replay_reveal'
  | 'content_issue'
  | 'storage_error';

export type DeviceClass = 'phone' | 'tablet' | 'desktop';

export interface AnalyticsEvent {
  name: EventName;
  at: string;
  puzzle?: string;
  round?: number;
  mode?: Mode;
  variant?: Variant;
  device: DeviceClass;
  props?: Record<string, string | number | boolean | null>;
}

export interface AnalyticsSink {
  track(event: AnalyticsEvent): void;
}

export function deviceClass(width: number): DeviceClass {
  return width < 600 ? 'phone' : width < 1024 ? 'tablet' : 'desktop';
}

export function createDebugSink(limit = 1000) {
  const events: AnalyticsEvent[] = [];
  return {
    track(e: AnalyticsEvent) {
      events.push(e);
      if (events.length > limit) events.shift();
    },
    events: () => events.slice(),
    clear: () => void (events.length = 0),
  };
}

export type Tracker = (
  name: EventName,
  ctx?: Omit<AnalyticsEvent, 'name' | 'at' | 'device'>,
) => void;

export function createTracker(sink: AnalyticsSink, getWidth: () => number, now: () => Date = () => new Date()): Tracker {
  return (name, ctx = {}) => {
    try {
      sink.track({ name, at: now().toISOString(), device: deviceClass(getWidth()), ...ctx });
    } catch {
      /* analytics must never break the game */
    }
  };
}
