/* eslint-disable @typescript-eslint/no-require-imports -- Node --require audit preload patches builtins before application imports. */
// Audit-only preload. Never imported by the application.
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const childProcess = require('node:child_process');
const { syncBuiltinESMExports } = require('node:module');
const privateEnv = value => typeof value !== 'number' && /^\.env(?:\.|$)/.test(path.basename(String(value)));
const empty = options => (typeof options === 'string' || options?.encoding) ? '' : Buffer.alloc(0);
const readSync = fs.readFileSync;
fs.readFileSync = function (file, ...args) { if (privateEnv(file)) return empty(args[0]); return readSync.call(this, file, ...args); };
const read = fs.readFile;
fs.readFile = function (file, ...args) { if (privateEnv(file)) { queueMicrotask(() => args.at(-1)(null, empty(args[0]))); return; } return read.call(this, file, ...args); };
const readPromise = fs.promises.readFile;
fs.promises.readFile = function (file, ...args) { if (privateEnv(file)) return Promise.resolve(empty(args[0])); return readPromise.call(this, file, ...args); };
const allowed = host => ['localhost', '127.0.0.1', '::1', '[::1]', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(host);
const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = first && typeof first === 'object' ? first : { host: typeof args[1] === 'string' ? args[1] : 'localhost' };
  if (options.path) {
    if (!String(options.path).startsWith('\\\\.\\pipe\\')) throw new Error('Unexpected socket path blocked by security audit.');
  } else if (!allowed(options.host || options.hostname || 'localhost')) throw new Error('Unexpected outbound socket blocked by security audit.');
  return connect.apply(this, args);
};
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (!allowed(url.hostname)) throw new Error('Unexpected outbound fetch blocked by security audit.');
  return originalFetch(input, init);
};
const spawn = childProcess.spawn;
childProcess.spawn = function (command, args, options) {
  if (args?.includes('vitest.integration.config.ts')) args = args.map(arg => arg === 'vitest.integration.config.ts' ? 'tests/security/integration.config.ts' : arg);
  if (args?.some(arg => String(arg).endsWith('@playwright/test/cli.js')) && !args.includes('--config')) {
    args = [...args, '--config', 'tests/security/playwright.config.ts'];
  }
  return spawn.call(this, command, args, options);
};
syncBuiltinESMExports();
