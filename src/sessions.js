'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');

const UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
function parseLines(text) {
  return text.split('\n').flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
}
function parseHeader(text, file, modified, titles) {
  const rows = parseLines(text);
  const meta = rows.find(r => r.type === 'session_meta')?.payload;
  const id = meta?.id || meta?.session_id;
  if (!UUID.test(id || '') || typeof meta.cwd !== 'string' || !path.isAbsolute(meta.cwd)) return null;
  const message = rows.find(r => r.type === 'event_msg' && r.payload?.type === 'user_message')?.payload?.message;
  return { id, cwd: path.normalize(meta.cwd), file, updated: modified,
    title: titles.get(id) || (typeof message === 'string' ? message.replace(/\s+/g, ' ').slice(0, 120) : '') || `Session ${id.slice(0, 8)}` };
}
function belongs(cwd, root) {
  const relative = path.relative(root, cwd);
  return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}
function selectSessions(sessions, roots, all, query, annotations) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return sessions.filter(s => (all || roots.some(r => belongs(s.cwd, r))) &&
    words.every(w => `${annotations[s.id]?.name || ''} ${s.title} ${s.cwd} ${s.id}`.toLocaleLowerCase().includes(w)))
    .sort((a,b) => Number(!!annotations[b.id]?.favorite) - Number(!!annotations[a.id]?.favorite) || b.updated - a.updated);
}
async function* files(dir) {
  let entries;
  try { entries = await fs.readdir(dir, { withFileTypes: true }); }
  catch (e) { if (e.code === 'ENOENT') return; throw e; }
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* files(file);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) yield file;
  }
}
class SessionStore {
  constructor() { this.cache = new Map(); }
  async load(home) {
    const titles = new Map();
    try {
      for (const row of parseLines(await fs.readFile(path.join(home, 'session_index.jsonl'), 'utf8'))) {
        if (typeof row.thread_name === 'string' && row.thread_name.trim()) titles.set(row.id, row.thread_name);
      }
    } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const seen = new Set(), result = new Map();
    // Read only a bounded header, even when a conversation is hundreds of MB.
    for await (const file of files(path.join(home, 'sessions'))) {
      seen.add(file);
      try {
        const stat = await fs.stat(file), cached = this.cache.get(file);
        let session;
        if (cached && cached.mtime === stat.mtimeMs && cached.size === stat.size) {
          session = cached.session;
        } else {
          const handle = await fs.open(file, 'r');
          let text;
          try {
            const buffer = Buffer.alloc(Math.min(stat.size, 256 * 1024));
            const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
            text = buffer.subarray(0, bytesRead).toString('utf8');
          } finally { await handle.close(); }
          session = parseHeader(text, file, stat.mtimeMs, new Map());
          this.cache.set(file, { mtime: stat.mtimeMs, size: stat.size, session });
        }
        if (session) {
          const current = { ...session, title: titles.get(session.id) || session.title };
          if (!result.has(current.id) || result.get(current.id).updated < current.updated) result.set(current.id, current);
        }
      } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    for (const file of this.cache.keys()) if (!seen.has(file)) this.cache.delete(file);
    return [...result.values()];
  }
}
module.exports = { SessionStore, parseHeader, belongs, selectSessions, UUID };
