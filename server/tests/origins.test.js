import {afterEach,it,expect,vi} from 'vitest';
import {env} from '../src/config/env.js';
import {isAllowedOrigin} from '../src/config/origins.js';
const original=env.clientUrl;
afterEach(()=>{env.clientUrl=original;vi.unstubAllEnvs();});
it('allows local preview aliases only on the configured protocol and port',()=>{
  env.clientUrl='http://localhost:5173';
  vi.stubEnv('NODE_ENV','development');
  expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
  for(const origin of [undefined,'null','https://evil.example','http://localhost:5174','https://127.0.0.1:5173','http://localhost.evil.example:5173'])expect(isAllowedOrigin(origin)).toBe(false);
});
it('keeps production restricted to the exact configured origin',()=>{
  env.clientUrl='http://localhost:5173';vi.stubEnv('NODE_ENV','production');
  expect(isAllowedOrigin(env.clientUrl)).toBe(true);
  expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(false);
});
it('does not grant loopback access for a deployed client',()=>{
  env.clientUrl='https://mokka.example';vi.stubEnv('NODE_ENV','development');
  expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(false);
});
