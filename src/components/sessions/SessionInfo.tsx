import type { SessionSummary } from '@/types/sessions';
import { formatSessionDateTime } from '@/utils/format-session-time';

export interface SessionInfoProps {
  session: Pick<SessionSummary, 'title' | 'instructor' | 'startsAt' | 'durationMinutes'>;
  /** Heading level of the title inside the surrounding page. */
  headingLevel?: 'h2' | 'h3';
}

/** A class in two lines: title, then day, time, length and instructor. */
export function SessionInfo({ session, headingLevel = 'h3' }: SessionInfoProps) {
  const Heading = headingLevel;
  return (
    <div className="min-w-0">
      <Heading className="truncate font-display text-lg font-bold text-ink-900">{session.title}</Heading>
      <p className="text-sm text-ink-500">
        {formatSessionDateTime(session.startsAt)} · {session.durationMinutes} min · with {session.instructor}
      </p>
    </div>
  );
}
