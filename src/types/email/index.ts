// Backend-only email shapes, shared by the repositories (which return recipients)
// and src/services/email (which builds and sends messages).
export interface EmailRecipient {
  name: string;
  email: string;
  timeZone: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}
