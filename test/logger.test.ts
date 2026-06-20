import test from 'node:test';
import assert from 'node:assert/strict';
import { createLogger, redactValue } from '../src/logger.ts';

test('redacts secret-looking values before logging', () => {
  assert.equal(redactValue('sk-secret-token'), '[redacted]');
  assert.equal(redactValue('plain-value'), 'plain-value');
});

test('logger writes structured records with redacted metadata', () => {
  const records: unknown[] = [];
  const logger = createLogger({
    sink(record) {
      records.push(JSON.parse(record));
    }
  });

  logger.info('config.loaded', {
    model: 'gpt-5.5',
    apiKey: 'sk-secret-token',
    nested: { clientSecret: 'abc123' }
  });

  assert.deepEqual(records, [
    {
      level: 'info',
      event: 'config.loaded',
      model: 'gpt-5.5',
      apiKey: '[redacted]',
      nested: { clientSecret: '[redacted]' }
    }
  ]);
});
