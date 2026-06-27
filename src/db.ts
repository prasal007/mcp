import mysql from 'mysql2/promise';
import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function loadEnvFile() {
  const envPath = 'D:/Prasad-Work/Study/repos/mcp/.env';
  loadEnv({ path: envPath });
  return envPath;
}

export function getDbConfig() {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'Samsung@14878',
    database: process.env.MYSQL_DATABASE || 'mcpdb',
  };
}

loadEnvFile();

export const pool = mysql.createPool({
  ...getDbConfig(),
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  enableKeepAlive: true,
});
