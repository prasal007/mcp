import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvFile, getDbConfig } from '../src/db.ts';

test('loads database env from the project root even when cwd changes', () => {
  const previousCwd = process.cwd();
  const tempDir = mkdtempSync(join(tmpdir(), 'mcp-db-env-'));

  try {
    process.chdir(tempDir);
    delete process.env.MYSQL_HOST;
    delete process.env.MYSQL_PORT;
    delete process.env.MYSQL_USER;
    delete process.env.MYSQL_PASSWORD;
    delete process.env.MYSQL_DATABASE;

    const envFilePath = loadEnvFile();
    const config = getDbConfig();

    assert.match(envFilePath, /[\\/]\.env$/);
    assert.equal(config.host, '127.0.0.1');
    assert.equal(config.user, 'root');
    assert.equal(config.password, 'Samsung@14878');
    assert.equal(config.database, 'mcpdb');
  } finally {
    process.chdir(previousCwd);
    rmSync(tempDir, { recursive: true, force: true });
  }
});
