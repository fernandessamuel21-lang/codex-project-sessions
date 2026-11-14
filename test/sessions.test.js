const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { SessionStore, belongs, selectSessions, parseHeader } = require('../src/sessions');
const id = '12345678-1234-1234-1234-123456789abc';
const line = payload => JSON.stringify({ type: 'session_meta', payload }) + '\n';
test('project boundaries do not confuse similarly named sibling folders', () => {
  assert.equal(belongs('/work/app/src', '/work/app'), true);
  assert.equal(belongs('/work/app-other', '/work/app'), false);
  assert.equal(belongs('/work/app', '/work/app'), true);
});
test('parses metadata despite damaged records, validates IDs and uses index title', () => {
  assert.equal(parseHeader('broken\n' + line({ id, cwd: '/work/app' }), 'file', 1, new Map([[id, 'Name']])).title, 'Name');
  assert.equal(parseHeader(line({ id: 'invalid', cwd: '/work/app' }), 'file', 1, new Map()), null);
});
test('search includes aliases and paths, filters workspace, and prioritizes favorites', () => {
  const sessions = [{ id: 'a', cwd: '/app', title: 'Bug', updated: 20 }, { id: 'b', cwd: '/app/sub', title: 'Other', updated: 10 }, { id: 'c', cwd: '/app-other', title: 'Bug', updated: 30 }];
  const annotations = { b: { name: 'Fix bug', favorite: true } };
  assert.deepEqual(selectSessions(sessions, ['/app'], false, 'bug', annotations).map(s => s.id), ['b', 'a']);
  assert.equal(selectSessions(sessions, [], true, '', annotations).length, 3);
});
test('loads sessions, refreshes titles and handles appended or deleted files', async t => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'codex-sessions-test-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const dir = path.join(home, 'sessions', '2026', '11');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'rollout.jsonl');
  await fs.writeFile(file, line({ id, cwd: '/work/app' }) + '{"incomplete":');
  const store = new SessionStore();
  assert.equal((await store.load(home)).length, 1);
  await fs.writeFile(path.join(home, 'session_index.jsonl'), JSON.stringify({ id, thread_name: 'Updated' }) + '\n{');
  assert.equal((await store.load(home))[0].title, 'Updated');
  await fs.appendFile(file, '\n{}\n');
  assert.equal((await store.load(home))[0].title, 'Updated');
  await fs.unlink(file);
  assert.equal((await store.load(home)).length, 0);
});
