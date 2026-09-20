import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';

const require = createRequire(import.meta.url);
const T = require('../assets/testimonials.js');

const valid = () => ({
  quote: 'Exact approved wording.',
  name: 'Sample Person',
  title: 'Head of Something',
  company: 'Sample Co',
  permission: { date: '2026-09-01', source: 'Email approval stored in the client folder' },
  allowedChannels: ['website']
});

test('the shipped testimonials file is empty, so nothing renders', () => {
  const entries = JSON.parse(fs.readFileSync(new URL('../testimonials.json', import.meta.url), 'utf8'));
  assert.deepEqual(entries, []);
  assert.equal(T.authorized(entries, 'website').length, 0);
});

test('a fully authorized website entry is accepted', () => {
  assert.equal(T.authorized([valid()], 'website').length, 1);
});

test('entries missing permission, or approved for other channels, are rejected', () => {
  const noPermission = valid(); delete noPermission.permission;
  const noDate = valid(); noDate.permission = { source: 'x' };
  const privateOnly = valid(); privateOnly.allowedChannels = ['proposal'];
  const noChannels = valid(); delete noChannels.allowedChannels;
  assert.equal(T.authorized([noPermission, noDate, privateOnly, noChannels], 'website').length, 0);
});

test('every required field must be present and non-empty', () => {
  for (const field of ['quote', 'name', 'title', 'company']) {
    const e = valid(); e[field] = '   ';
    assert.equal(T.isAuthorized(e, 'website'), false, field);
    const missing = valid(); delete missing[field];
    assert.equal(T.isAuthorized(missing, 'website'), false, field + ' missing');
  }
});

test('optional headshot and link must be safe when supplied', () => {
  const ok = valid(); ok.headshot = 'assets/people/sample.jpg'; ok.link = 'https://example.com/profile';
  assert.equal(T.isAuthorized(ok, 'website'), true);
  const badLink = valid(); badLink.link = 'javascript:alert(1)';
  const badHead = valid(); badHead.headshot = 'http://insecure.example/x.jpg';
  assert.equal(T.isAuthorized(badLink, 'website'), false);
  assert.equal(T.isAuthorized(badHead, 'website'), false);
});

test('non-array input is treated as no entries', () => {
  assert.equal(T.authorized(null, 'website').length, 0);
  assert.equal(T.authorized({}, 'website').length, 0);
});
