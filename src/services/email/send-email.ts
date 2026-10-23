import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import type { EmailMessage } from '../../types/email';

// The only place that talks SMTP (Mailpit locally, D18).
const transport = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: false,
});

export async function sendEmail(message: EmailMessage): Promise<void> {
  await transport.sendMail({ from: env.mailFrom, ...message });
}

// Call after the transaction has committed, e.g. sendEmailInBackground(() => welcomeEmail(user)).
// Never awaited and never throws to the caller: a failure to build or send the email is logged
// and never undoes the request (D18).
export function sendEmailInBackground(build: () => EmailMessage): void {
  let message: EmailMessage;
  try {
    message = build();
  } catch (error) {
    console.error('Building an email failed:', error);
    return;
  }

  sendEmail(message).catch((error: unknown) => {
    console.error(`Email "${message.subject}" to ${message.to} failed:`, error);
  });
}
