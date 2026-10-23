import { ADMIN_SESSION_TTL_MS, MEMBER_SESSION_TTL_MS, PASSWORD_RESET_TTL_MS } from '../../constants/auth';
import {
  deleteUserSession,
  findUserByEmail,
  findUserWithPasswordByEmail,
  insertMember,
  insertPasswordResetToken,
  insertUserSession,
  resetPasswordWithToken,
} from '../../repositories/auth';
import type {
  AuthUser,
  ForgotPasswordRequest,
  LoginRequest,
  ResetPasswordRequest,
  SignupRequest,
  User,
} from '../../types/auth';
import { EmailTakenError, InvalidCredentialsError, InvalidResetTokenError } from '../../utils/errors';
import { hashPassword, verifyPassword } from '../../utils/password';
import { generateToken, hashToken } from '../../utils/token';
import { passwordResetEmail, sendEmailInBackground, welcomeEmail } from '../email';

export interface LoggedIn {
  user: User;
  token: string; // goes into the cookie; only its hash is stored
  ttlMs: number;
}

// Compared against when the email is unknown, so both failures take about the same time.
const DUMMY_PASSWORD_HASH = hashPassword('not-a-real-password');

export function toPublicUser(user: AuthUser): User {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function startSession(user: AuthUser): Promise<LoggedIn> {
  const token = generateToken();
  const ttlMs = user.role === 'admin' ? ADMIN_SESSION_TTL_MS : MEMBER_SESSION_TTL_MS;
  await insertUserSession(hashToken(token), user.id, ttlMs);
  return { user: toPublicUser(user), token, ttlMs };
}

export async function signup(input: Required<SignupRequest>): Promise<LoggedIn> {
  const user = await insertMember({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    timeZone: input.timeZone,
  });
  if (!user) throw new EmailTakenError();

  sendEmailInBackground(() => welcomeEmail(user));
  return startSession(user);
}

export async function login(input: LoginRequest): Promise<LoggedIn> {
  const found = await findUserWithPasswordByEmail(input.email);
  const passwordMatches = await verifyPassword(input.password, found?.passwordHash ?? (await DUMMY_PASSWORD_HASH));
  if (!found || !passwordMatches) throw new InvalidCredentialsError();

  return startSession(found.user);
}

export async function logout(sessionTokenHash: string): Promise<void> {
  await deleteUserSession(sessionTokenHash);
}

// Always succeeds, whether or not the email has an account (D16).
export async function forgotPassword(input: ForgotPasswordRequest): Promise<void> {
  const user = await findUserByEmail(input.email);
  if (!user) return;

  const token = generateToken();
  await insertPasswordResetToken(hashToken(token), user.id, PASSWORD_RESET_TTL_MS);
  sendEmailInBackground(() => passwordResetEmail(user, token));
}

export async function resetPassword(input: ResetPasswordRequest): Promise<void> {
  const result = await resetPasswordWithToken(hashToken(input.token), await hashPassword(input.password));
  if (!result.ok) throw new InvalidResetTokenError();
}
