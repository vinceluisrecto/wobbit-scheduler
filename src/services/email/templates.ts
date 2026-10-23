import { env } from '../../config/env';
import type { EmailMessage, EmailRecipient } from '../../types/email';
import type { SessionSummary } from '../../types/sessions';

// One plain function per email (E1–E8). Times use the recipient's own timezone.

function formatClassTime(startsAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(new Date(startsAt));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function link(path: string): string {
  return `${env.appUrl}${path}`;
}

interface EmailParts {
  to: EmailRecipient;
  subject: string;
  lines: string[]; // paragraphs, plain text
  action?: { label: string; url: string };
}

function buildEmail({ to, subject, lines, action }: EmailParts): EmailMessage {
  const greeting = `Hi ${to.name},`;
  const textParts = [greeting, ...lines];
  const htmlParts = [greeting, ...lines].map((line) => `<p>${escapeHtml(line)}</p>`);

  if (action) {
    textParts.push(`${action.label}: ${action.url}`);
    htmlParts.push(`<p><a href="${escapeHtml(action.url)}">${escapeHtml(action.label)}</a></p>`);
  }

  return { to: to.email, subject, text: textParts.join('\n\n'), html: htmlParts.join('\n') };
}

function classLine(session: SessionSummary, timeZone: string): string {
  return `${session.title} with ${session.instructor}, ${formatClassTime(session.startsAt, timeZone)}.`;
}

// E1
export function welcomeEmail(to: EmailRecipient): EmailMessage {
  return buildEmail({
    to,
    subject: 'Welcome to the studio',
    lines: ['Your account is ready. You can book a class whenever you like.'],
    action: { label: 'See classes', url: link('/sessions') },
  });
}

// E2
export function bookingConfirmedEmail(to: EmailRecipient, bookingId: string, session: SessionSummary): EmailMessage {
  return buildEmail({
    to,
    subject: `Booking confirmed: ${session.title}`,
    lines: ['You are booked in.', classLine(session, to.timeZone), 'Pay at the studio.'],
    action: { label: 'View your booking', url: link(`/bookings/${bookingId}`) },
  });
}

// E3
export function waitlistJoinedEmail(to: EmailRecipient, position: number, session: SessionSummary): EmailMessage {
  return buildEmail({
    to,
    subject: `You're on the waitlist (#${position}): ${session.title}`,
    lines: [
      `You are #${position} in line for:`,
      classLine(session, to.timeZone),
      'If a place frees up, we book it for you automatically and email you.',
    ],
    action: { label: 'My bookings', url: link('/account') },
  });
}

// E4
export function promotedEmail(to: EmailRecipient, bookingId: string, session: SessionSummary): EmailMessage {
  return buildEmail({
    to,
    subject: `You got a place! ${session.title}`,
    lines: ['A place opened up and it is yours. You are booked in.', classLine(session, to.timeZone)],
    action: { label: 'View your booking', url: link(`/bookings/${bookingId}`) },
  });
}

// E5
export function bookingCancelledEmail(
  to: EmailRecipient,
  session: SessionSummary,
  cancelledBy: 'member' | 'admin',
): EmailMessage {
  const opening =
    cancelledBy === 'member' ? 'You cancelled your booking for:' : 'The studio cancelled your booking for:';
  return buildEmail({
    to,
    subject: `Booking cancelled: ${session.title}`,
    lines: [opening, classLine(session, to.timeZone)],
    action: { label: 'My bookings', url: link('/account') },
  });
}

// E6 (sent by the admin edit)
export function classChangedEmail(to: EmailRecipient, bookingId: string, session: SessionSummary): EmailMessage {
  return buildEmail({
    to,
    subject: `Class details changed: ${session.title}`,
    lines: ['The studio updated a class you are booked into. Here are the new details:', classLine(session, to.timeZone)],
    action: { label: 'View your booking', url: link(`/bookings/${bookingId}`) },
  });
}

// E7
export function passwordResetEmail(to: EmailRecipient, token: string): EmailMessage {
  return buildEmail({
    to,
    subject: 'Reset your password',
    lines: [
      'Someone asked to reset the password for your account. The link works once and expires in 1 hour.',
      'If it was not you, you can ignore this email.',
    ],
    action: { label: 'Reset your password', url: link(`/reset-password?token=${encodeURIComponent(token)}`) },
  });
}

// E8
export function refundDueEmail(
  to: EmailRecipient,
  member: { name: string; email: string },
  session: SessionSummary,
): EmailMessage {
  return buildEmail({
    to,
    subject: `Refund due: ${member.name}, ${session.title}`,
    lines: [
      `${member.name} (${member.email}) had paid for a booking that was just cancelled. A refund is due.`,
      classLine(session, to.timeZone),
    ],
    action: { label: 'Open the class', url: link(`/admin/sessions/${session.id}`) },
  });
}
