// The pending ghost belongs to the durable conversation, not to a Web origin
// (Desktop may choose a new loopback port on restart) or to the history panel.
import { randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const CACHE_VERSION = 1;
const ROUND_VERSION = 'surface-v1';
const MAX_SESSIONS = 256;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_SUGGESTION_LENGTH = 4096;

// Appends advance the last surface seq. Replaces (even away from the tail)
// and content projections advance contentGeneration. Both are replayed from
// the durable log; incidental log events and reloads do not change this key.
export function suggestionRound(session) {
  try {
    if (!validSessionId(session?.id)) return null;
    const surface = session.surface;
    const nodes = surface?.nodes;
    const generation = surface?.contentGeneration;
    const tail = Array.isArray(nodes) && nodes.length ? nodes[nodes.length - 1] : null;
    if (Number.isSafeInteger(tail) && tail >= 0 && Number.isSafeInteger(generation) && generation >= 0) {
      return `${ROUND_VERSION}:${tail}:${generation}`;
    }
  } catch { /* Without a reliable round, suggestions still work without caching. */ }
  return null;
}

function validSessionId(id) {
  return typeof id === 'string' && id.trim() !== '' && id.length <= 512;
}

export function validPendingText(text) {
  return typeof text === 'string' && text.length <= MAX_SUGGESTION_LENGTH && text.trim() !== '';
}

function decodeRecord(record) {
  if (!record || typeof record.round !== 'string' || !/^surface-v1:\d{1,16}:\d{1,16}$/.test(record.round)) return null;
  const rerollCount = Number.isSafeInteger(record.rerollCount) && record.rerollCount >= 0 ? record.rerollCount : 0;
  if (record.dismissed === true) return { round: record.round, dismissed: true, rerollCount };
  if (!validPendingText(record.suggestion)) return null;
  return { round: record.round, suggestion: record.suggestion, truncated: record.truncated === true, rerollCount };
}

export function createPendingStore({ path, mayPersist }) {
  const entries = new Map();
  const diskAllowed = () => Boolean(path) && mayPersist();
  let persistent = diskAllowed();
  let persistenceGeneration = 0;
  const put = (id, entry) => {
    entries.delete(id);
    entries.set(id, entry);
    if (entries.size > MAX_SESSIONS) entries.delete(entries.keys().next().value);
  };
  function removeFile() {
    if (!path) return;
    try { rmSync(path, { force: true }); } catch { /* A local I/O error must not stop predictions. */ }
  }
  if (persistent) {
    try {
      if (statSync(path).size <= MAX_FILE_BYTES) {
        const parsed = JSON.parse(readFileSync(path, 'utf8'));
        if (parsed?.version === CACHE_VERSION && Array.isArray(parsed.entries)) {
          for (const pair of parsed.entries.slice(-MAX_SESSIONS)) {
            if (!Array.isArray(pair) || !validSessionId(pair[0])) continue;
            const record = decodeRecord(pair[1]);
            if (record) put(pair[0], { record, disk: true });
          }
        }
      }
    } catch { /* A missing/corrupt local cache never blocks prediction. */ }
  } else removeFile();

  function refreshPolicy() {
    const allowed = diskAllowed();
    if (allowed === persistent) return;
    persistent = allowed;
    if (!allowed) {
      persistenceGeneration += 1;
      for (const entry of entries.values()) entry.disk = false;
      removeFile();
    }
  }

  function persist() {
    if (!persistent) return;
    const items = [];
    for (const [id, entry] of entries) if (entry.disk) items.push([id, entry.record]);
    if (!items.length) { removeFile(); return; }
    const tmp = `${path}.${randomUUID()}.tmp`;
    try {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      writeFileSync(tmp, JSON.stringify({ version: CACHE_VERSION, entries: items }), { mode: 0o600, flag: 'wx' });
      renameSync(tmp, path);
    } catch {
      // Both the live cache and model predictions remain usable if disk writes fail.
      try { rmSync(tmp, { force: true }); } catch { /* best effort */ }
    }
  }

  return {
    refreshPolicy,
    get(id) { return entries.get(id)?.record; },
    diskGeneration(id) {
      refreshPolicy();
      return persistent && (id === undefined || entries.get(id)?.disk) ? String(persistenceGeneration) : null;
    },
    set(id, value, { persistNew = true } = {}) {
      if (!validSessionId(id)) return;
      const record = decodeRecord(value);
      if (!record) return;
      refreshPolicy();
      put(id, { record, disk: persistent && persistNew });
      persist();
    },
    delete(id) {
      refreshPolicy();
      if (entries.delete(id)) persist();
    },
  };
}
