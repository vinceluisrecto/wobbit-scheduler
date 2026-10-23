// Integration tests replace the SMTP transport, so nothing reaches Mailpit.
// In each test file:
//   jest.mock('nodemailer', () => jest.requireActual('./helpers/mail').nodemailerMock);
export const mockSendMail = jest.fn();

export const nodemailerMock = {
  __esModule: true,
  default: { createTransport: () => ({ sendMail: (message: unknown) => mockSendMail(message) }) },
};

interface SentMail {
  to: string;
  subject: string;
  text: string;
}

// Emails go out after the response, so let pending callbacks run first.
export async function sentEmails(): Promise<SentMail[]> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  return mockSendMail.mock.calls.map(([message]) => message as SentMail);
}
