import { findSessionById, listUpcomingSessions } from '../../../../src/repositories/sessions';
import { getSession, listSessions } from '../../../../src/services/sessions';
import { SessionNotFoundError } from '../../../../src/utils/errors';
import { session } from '../fixtures';

jest.mock('../../../../src/repositories/sessions');

describe('sessions service', () => {
  it('lists upcoming sessions from the repository', async () => {
    jest.mocked(listUpcomingSessions).mockResolvedValue([session]);
    await expect(listSessions()).resolves.toEqual([session]);
  });

  it('returns a session by id', async () => {
    jest.mocked(findSessionById).mockResolvedValue(session);
    await expect(getSession(session.id)).resolves.toEqual(session);
  });

  it('throws SESSION_NOT_FOUND when it does not exist', async () => {
    jest.mocked(findSessionById).mockResolvedValue(null);
    await expect(getSession('missing')).rejects.toBeInstanceOf(SessionNotFoundError);
  });
});
