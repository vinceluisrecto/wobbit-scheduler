import { pingDatabase } from '../../../../src/repositories/health';
import { getHealth } from '../../../../src/services/health';

jest.mock('../../../../src/repositories/health');

const mockedPingDatabase = jest.mocked(pingDatabase);

describe('getHealth', () => {
  it('reports up when the database responds', async () => {
    mockedPingDatabase.mockResolvedValue();

    await expect(getHealth()).resolves.toEqual({ status: 'up', database: 'up' });
  });

  it('reports down when the database is unreachable', async () => {
    mockedPingDatabase.mockRejectedValue(new Error('connection refused'));

    await expect(getHealth()).resolves.toEqual({ status: 'down', database: 'down' });
  });
});
