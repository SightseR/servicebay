import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const cfg = (values: Record<string, string | undefined>) => ({ get: (k: string) => values[k] }) as unknown as ConfigService;

describe('MailService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs instead of sending when RESEND_API_KEY is not set', async () => {
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(global, 'fetch');
    const svc = new MailService(cfg({}));
    expect(svc.isConfigured).toBe(false);
    await svc.send({ to: 'a@b', subject: 'S', text: 'T', html: '<p>T</p>' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(warn.mock.calls[0][0]).toContain('a@b');
  });

  it('POSTs to Resend with the bearer key when configured', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }));
    const svc = new MailService(cfg({ RESEND_API_KEY: 're_test', MAIL_FROM: 'ServiceBay <no-reply@sightser.site>' }));
    await svc.send({ to: 'a@b', subject: 'S', text: 'T', html: '<p>T</p>' });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer re_test');
    expect(JSON.parse(init!.body as string)).toMatchObject({ from: 'ServiceBay <no-reply@sightser.site>', to: ['a@b'], subject: 'S' });
  });

  it('throws when Resend rejects the request', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response('nope', { status: 403 }));
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const svc = new MailService(cfg({ RESEND_API_KEY: 're_test' }));
    await expect(svc.send({ to: 'a@b', subject: 'S', text: 'T', html: '' })).rejects.toThrow('Email delivery failed');
  });
});
