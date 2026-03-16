import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';

import { requestLogging } from '../src/shared/http/request-logging.ts';

class MockResponse extends EventEmitter {
  statusCode = 200;
}

test('requestLogging suppresses routine health checks at info level', (t) => {
  t.after(() => {
    mock.restoreAll();
  });

  const consoleLog = mock.method(console, 'log', () => {});
  const request = {
    requestId: 'req-health',
    method: 'GET',
    path: '/health',
    originalUrl: '/health',
  };
  const response = new MockResponse();

  let nextCalled = false;
  requestLogging(request as never, response as never, () => {
    nextCalled = true;
  });

  response.emit('finish');

  assert.equal(nextCalled, true);
  assert.equal(consoleLog.mock.calls.length, 0);
});

test('requestLogging keeps non-health requests at info level', (t) => {
  t.after(() => {
    mock.restoreAll();
  });

  const consoleLog = mock.method(console, 'log', () => {});
  const request = {
    requestId: 'req-audit',
    method: 'POST',
    path: '/audit',
    originalUrl: '/audit',
  };
  const response = new MockResponse();

  requestLogging(request as never, response as never, () => {});
  response.emit('finish');

  assert.equal(consoleLog.mock.calls.length, 1);
  assert.match(String(consoleLog.mock.calls[0]?.arguments[0]), /Request completed/);
  assert.match(String(consoleLog.mock.calls[0]?.arguments[0]), /"path":"\/audit"/);
});
