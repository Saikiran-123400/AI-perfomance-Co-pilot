import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'copilot.db');
export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS devices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ram_total REAL,
      ram_used REAL,
      ram_available REAL DEFAULT 0,
      storage_total REAL DEFAULT 128,
      storage_used REAL DEFAULT 64,
      storage_available REAL,
      battery REAL,
      charging INTEGER,
      temperature REAL,
      cpu_usage REAL DEFAULT 0,
      platform TEXT DEFAULT 'Windows PC',
      source TEXT DEFAULT 'Windows PC',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate table if old schema had NOT NULL constraints
  try {
    const tableInfo = db.prepare("PRAGMA table_info(devices)").all() as Array<{ name: string; notnull: number }>;
    const hasNotNull = tableInfo.some((col) => col.notnull === 1 && ['battery', 'temperature', 'storage_available', 'charging'].includes(col.name));
    if (hasNotNull) {
      db.exec(`
        CREATE TABLE devices_migration (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          ram_total REAL,
          ram_used REAL,
          ram_available REAL DEFAULT 0,
          storage_total REAL DEFAULT 128,
          storage_used REAL DEFAULT 64,
          storage_available REAL,
          battery REAL,
          charging INTEGER,
          temperature REAL,
          cpu_usage REAL DEFAULT 0,
          platform TEXT DEFAULT 'Windows PC',
          source TEXT DEFAULT 'Windows PC',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO devices_migration (id, ram_total, ram_used, ram_available, storage_total, storage_used, storage_available, battery, charging, temperature, cpu_usage, platform, source, created_at)
        SELECT id, ram_total, ram_used, ram_available, storage_total, storage_used, storage_available, battery, charging, temperature, cpu_usage, platform, source, created_at FROM devices;
        DROP TABLE devices;
        ALTER TABLE devices_migration RENAME TO devices;
      `);
    }
  } catch (err) {
    console.error('Migration note:', err);
  }

  try { db.exec("ALTER TABLE devices ADD COLUMN ram_available REAL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN storage_total REAL DEFAULT 128"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN storage_used REAL DEFAULT 64"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN cpu_usage REAL DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN platform TEXT DEFAULT 'Windows PC'"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN source TEXT DEFAULT 'Windows PC'"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN active_apps TEXT"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN installed_apps TEXT"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN gpu_usage REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN gpu_vram_total REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN gpu_vram_used REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN gpu_temp REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN network_latency REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN packet_loss REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN download_kbps REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN upload_kbps REAL"); } catch {}
  try { db.exec("ALTER TABLE devices ADD COLUMN charging_status TEXT"); } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS app_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT UNIQUE NOT NULL,
      app_size REAL NOT NULL,
      ram_requirement REAL NOT NULL,
      cpu_intensity TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      ram_impact TEXT NOT NULL,
      cpu_impact TEXT NOT NULL,
      storage_impact TEXT NOT NULL,
      battery_impact TEXT NOT NULL,
      thermal_impact TEXT NOT NULL,
      overall_impact TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS simulated_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      predicted_ram TEXT NOT NULL,
      actual_ram REAL NOT NULL,
      predicted_cpu TEXT NOT NULL,
      actual_cpu REAL NOT NULL,
      predicted_battery TEXT NOT NULL,
      actual_battery REAL NOT NULL,
      predicted_thermal TEXT NOT NULL,
      actual_thermal REAL NOT NULL,
      predicted_storage TEXT NOT NULL,
      actual_storage REAL NOT NULL,
      predicted_overall TEXT DEFAULT 'LOW',
      actual_overall TEXT DEFAULT 'LOW',
      accuracy_score REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      pid INTEGER,
      duration_seconds INTEGER NOT NULL,
      avg_cpu REAL NOT NULL,
      peak_cpu REAL NOT NULL,
      avg_ram_mb REAL NOT NULL,
      peak_ram_mb REAL NOT NULL,
      battery_start REAL,
      battery_end REAL,
      temp_start REAL,
      temp_end REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed app profiles if table is empty
  const countRow = db.prepare('SELECT COUNT(*) as count FROM app_profiles').get() as { count: number };
  if (countRow.count === 0) {
    const insertApp = db.prepare(`
      INSERT INTO app_profiles (app_name, app_size, ram_requirement, cpu_intensity)
      VALUES (?, ?, ?, ?)
    `);

    const defaultApps = [
      { app_name: 'BGMI (Battlegrounds Mobile India)', app_size: 3200, ram_requirement: 3000, cpu_intensity: 'high' },
      { app_name: 'Genshin Impact', app_size: 18500, ram_requirement: 4500, cpu_intensity: 'extreme' },
      { app_name: 'Adobe Lightroom Mobile', app_size: 1400, ram_requirement: 2200, cpu_intensity: 'high' },
      { app_name: 'Spotify', app_size: 220, ram_requirement: 450, cpu_intensity: 'low' },
      { app_name: 'WhatsApp Messenger', app_size: 150, ram_requirement: 350, cpu_intensity: 'low' },
    ];

    for (const app of defaultApps) {
      insertApp.run(app.app_name, app.app_size, app.ram_requirement, app.cpu_intensity);
    }
  }
}
