function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isTest = process.env.NODE_ENV === 'test';

export const env = {
  port: Number(process.env.SERVER_PORT ?? 4000),
  isProduction: process.env.NODE_ENV === 'production',
  // D3: Jest sets NODE_ENV=test and uses the separate test database when it is configured.
  databaseUrl: (isTest && process.env.TEST_DATABASE_URL) || requireEnv('DATABASE_URL'),
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  smtpHost: process.env.SMTP_HOST ?? 'localhost',
  smtpPort: Number(process.env.SMTP_PORT ?? 1025),
  mailFrom: process.env.MAIL_FROM ?? 'Studio <no-reply@studio.local>',
  // D11: only `yarn create-admin` and the seed need these, so they're optional here.
  admin: {
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
};
