import { ConfigService } from '@nestjs/config';
import { CaseSummary, LineService } from './line.service';

const sampleCase: CaseSummary = {
  caseNumber: 'CST2026060001',
  customerName: 'ACME',
  subject: 'อุปกรณ์เสีย',
  category: 'สินค้าชำรุด',
  priority: 'High',
  status: 'Open',
};

function makeService(token: string, target: string): LineService {
  const config = {
    get: (key: string) =>
      key === 'LINE_CHANNEL_ACCESS_TOKEN'
        ? token
        : key === 'LINE_TARGET_ID'
          ? target
          : undefined,
  } as unknown as ConfigService;
  return new LineService(config);
}

describe('LineService', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('is disabled and skips when token/target are missing', async () => {
    const service = makeService('', '');
    expect(service.isEnabled()).toBe(false);

    await service.pushCaseCreated(sampleCase);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('pushes a message to the LINE API when configured', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });
    const service = makeService('token-123', 'U123');
    expect(service.isEnabled()).toBe(true);

    await service.pushCaseCreated(sampleCase);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.line.me/v2/bot/message/push');
    expect(init.headers.Authorization).toBe('Bearer token-123');

    const payload = JSON.parse(init.body);
    expect(payload.to).toBe('U123');
    expect(payload.messages[0].type).toBe('text');
    expect(payload.messages[0].text).toContain('CST2026060001');
  });

  it('pushes a status-change message with the old and new status', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: async () => '' });
    const service = makeService('token-123', 'U123');

    await service.pushCaseStatusChanged({ ...sampleCase, status: 'Resolved' }, 'Open');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const payload = JSON.parse(init.body);
    expect(payload.to).toBe('U123');
    expect(payload.messages[0].text).toContain('CST2026060001');
    expect(payload.messages[0].text).toContain('Open → Resolved');
  });

  it('skips the status-change push when token/target are missing', async () => {
    const service = makeService('', '');
    await service.pushCaseStatusChanged({ ...sampleCase, status: 'Resolved' }, 'Open');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not throw when the LINE API responds with an error', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'bad token' });
    const service = makeService('token-123', 'U123');

    await expect(service.pushCaseCreated(sampleCase)).resolves.toBeUndefined();
  });
});
