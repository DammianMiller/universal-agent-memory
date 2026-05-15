import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const rootDir = join(dirname(__filename), '..', '..');
const script = join(rootDir, 'scripts', 'run-anthropic-proxy-continuity.sh');

// The proxy wrapper ends with `exec python3 ...`, so it can't be run in
// isolation like the llama wrapper. These are content checks on the
// exported defaults instead.
describe('run-anthropic-proxy-continuity.sh slot save/restore defaults', () => {
  const content = readFileSync(script, 'utf-8');

  it('enables slot save/restore by default (PROXY_SLOT_SAVE_RESTORE:-on)', () => {
    // UAP PR #179 + #180: cross-session slot save/restore is the default
    // for this deployment's proxy service.
    expect(content).toContain('PROXY_SLOT_SAVE_RESTORE="${PROXY_SLOT_SAVE_RESTORE:-on}"');
  });

  it('defaults the slot dir under $HOME/.cache/uap/llama-slots', () => {
    // Must match llama-server LLAMA_SLOT_SAVE_PATH default — the proxy
    // sends a filename the server resolves relative to its --slot-save-path.
    expect(content).toContain(
      'PROXY_SLOT_SAVE_DIR="${PROXY_SLOT_SAVE_DIR:-${HOME}/.cache/uap/llama-slots}"'
    );
  });

  it('sets an LRU file cap default', () => {
    expect(content).toContain(
      'PROXY_SLOT_CACHE_MAX_FILES="${PROXY_SLOT_CACHE_MAX_FILES:-12}"'
    );
  });
});
