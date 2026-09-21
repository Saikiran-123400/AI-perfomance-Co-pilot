import { Router } from 'express';
import { db } from '../database.js';

export const telemetryRouter = Router();

// POST /api/telemetry
telemetryRouter.post('/', (req, res) => {
  const ramTotal = typeof req.body.ramTotal === 'number' ? req.body.ramTotal : (typeof req.body.ram_total === 'number' ? req.body.ram_total : null);
  const ramUsed = typeof req.body.ramUsed === 'number' ? req.body.ramUsed : (typeof req.body.ram_used === 'number' ? req.body.ram_used : null);
  const ramAvailable = typeof req.body.ramAvailable === 'number' ? req.body.ramAvailable : (typeof req.body.ram_available === 'number' ? req.body.ram_available : (ramTotal !== null && ramUsed !== null ? ramTotal - ramUsed : null));
  
  const storageTotal = typeof req.body.storageTotal === 'number' ? req.body.storageTotal : (typeof req.body.storage_total === 'number' ? req.body.storage_total : null);
  const storageUsed = typeof req.body.storageUsed === 'number' ? req.body.storageUsed : (typeof req.body.storage_used === 'number' ? req.body.storage_used : null);
  const storageAvailable = typeof req.body.storageAvailable === 'number' ? req.body.storageAvailable : (typeof req.body.storage_available === 'number' ? req.body.storage_available : (storageTotal !== null && storageUsed !== null ? storageTotal - storageUsed : null));
  
  const battery = typeof req.body.battery === 'number' ? req.body.battery : (typeof req.body.batteryLevel === 'number' ? req.body.batteryLevel : (typeof req.body.battery_level === 'number' ? req.body.battery_level : null));
  const charging = typeof req.body.charging === 'boolean' ? (req.body.charging ? 1 : 0) : null;
  const temperature = typeof req.body.temperature === 'number' ? req.body.temperature : (typeof req.body.temp === 'number' ? req.body.temp : null);
  const calculatedCpu = typeof req.body.cpuUsage === 'number' ? req.body.cpuUsage : (typeof req.body.cpu_usage === 'number' ? req.body.cpu_usage : (typeof req.body.cpu_percent === 'number' ? req.body.cpu_percent : null));
  
  const devicePlatform = req.body.platform || req.body.source || 'Windows PC';
  const dataSource = req.body.source || req.body.platform || 'Windows PC';
  const rawActiveApps = req.body.activeApplications || req.body.activeApps || req.body.active_apps;
  const activeAppsStr = Array.isArray(rawActiveApps) ? JSON.stringify(rawActiveApps) : (typeof rawActiveApps === 'string' ? rawActiveApps : null);

  const rawInstalledApps = req.body.installedApps || req.body.installed_apps;
  const installedAppsStr = Array.isArray(rawInstalledApps) ? JSON.stringify(rawInstalledApps) : (typeof rawInstalledApps === 'string' ? rawInstalledApps : null);

  try {
    const stmt = db.prepare(`
      INSERT INTO devices (
        ram_total, ram_used, ram_available, storage_total, storage_used, storage_available, battery, charging, temperature, cpu_usage, platform, source, active_apps, installed_apps
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      ramTotal,
      ramUsed,
      ramAvailable,
      storageTotal,
      storageUsed,
      storageAvailable,
      battery,
      charging,
      temperature,
      calculatedCpu,
      devicePlatform,
      dataSource,
      activeAppsStr,
      installedAppsStr
    );

    console.log(`[TELEMETRY RECEIVED] CPU: ${calculatedCpu}% | RAM: ${ramUsed}/${ramTotal} GB | Storage: ${storageAvailable} GB free | Battery: ${battery}% | Charging: ${charging} | Platform: ${devicePlatform}`);

    return res.status(201).json({
      success: true,
      id: Number(info.lastInsertRowid),
    });
  } catch (err: any) {
    console.error('Error inserting telemetry:', err);
    return res.status(500).json({ error: err?.message || 'Database insert failed' });
  }
});

// GET /api/telemetry/latest
telemetryRouter.get('/latest', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Query absolute newest telemetry record from devices table
  const row = db.prepare('SELECT * FROM devices ORDER BY id DESC LIMIT 1').get() as
    | {
        id: number;
        ram_total: number | null;
        ram_used: number | null;
        ram_available: number | null;
        storage_total: number | null;
        storage_used: number | null;
        storage_available: number | null;
        battery: number | null;
        charging: number | null;
        temperature: number | null;
        cpu_usage: number | null;
        platform?: string;
        source: string;
        active_apps?: string | null;
        installed_apps?: string | null;
        created_at: string;
      }
    | undefined;

  if (!row) {
    return res.status(404).json({ message: 'No device telemetry found.' });
  }

  // Parse SQLite created_at timestamp in UTC
  const rowTime = row.created_at ? new Date(row.created_at.includes('Z') ? row.created_at : row.created_at + ' Z').getTime() : Date.now();
  const isRecent = (Date.now() - rowTime) <= 20000;
  const isLiveDevice = isRecent && (row.source !== 'Simulator' && row.source !== 'Simulated Data' && row.source !== 'Simulator (Fallback)');

  let parsedActiveApps = null;
  if (row.active_apps) {
    try {
      parsedActiveApps = JSON.parse(row.active_apps);
    } catch {}
  }

  let parsedInstalledApps = null;
  if (row.installed_apps) {
    try {
      parsedInstalledApps = JSON.parse(row.installed_apps);
    } catch {}
  }

  return res.json({
    id: row.id,
    ramTotal: row.ram_total,
    ramUsed: row.ram_used,
    ramAvailable: row.ram_available,
    storageTotal: row.storage_total,
    storageUsed: row.storage_used,
    storageAvailable: row.storage_available,
    battery: row.battery,
    charging: row.charging !== null && row.charging !== undefined ? Boolean(row.charging) : null,
    temperature: row.temperature,
    cpuUsage: row.cpu_usage,
    platform: isLiveDevice ? (row.platform || row.source || 'Live Device Data') : 'Simulator (Fallback)',
    source: isLiveDevice ? (row.source || row.platform || 'Live Device Data') : 'Simulator (Fallback)',
    isLive: isLiveDevice,
    activeApps: parsedActiveApps,
    activeApplications: parsedActiveApps,
    installedApps: parsedInstalledApps,
    createdAt: row.created_at || new Date().toISOString(),
    timestamp: rowTime,
  });
});

// GET /api/telemetry/history?limit=50
telemetryRouter.get('/history', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const limitParam = Number(req.query.limit) || 50;
  const limit = Math.min(Math.max(limitParam, 5), 200);

  const rows = db.prepare(`
    SELECT * FROM (
      SELECT * FROM devices ORDER BY id DESC LIMIT ?
    ) ORDER BY id ASC
  `).all(limit) as Array<{
    id: number;
    ram_total: number;
    ram_used: number;
    ram_available: number;
    storage_total: number;
    storage_used: number;
    storage_available: number;
    battery: number;
    charging: number;
    temperature: number;
    cpu_usage?: number;
    platform?: string;
    source: string;
    created_at: string;
  }>;

  const samples = rows.map((row) => {
    const storageTot = row.storage_total || 128;
    const storageAvail = row.storage_available !== null && row.storage_available !== undefined ? row.storage_available : (storageTot - (row.storage_used || 64));
    const ramTot = row.ram_total || 16;
    const ramUsed = row.ram_used || (ramTot * 0.5);
    const sourceName = (row.source && row.source !== 'Simulator' && row.source !== 'Simulated Data' && row.source !== 'Simulator (Fallback)') ? row.source : (row.platform && row.platform !== 'Simulator' ? row.platform : 'Windows Laptop');
    return {
      id: row.id,
      timestamp: new Date(row.created_at || Date.now()).getTime(),
      cpuUsage: Math.round(row.cpu_usage ?? 0),
      ramUsage: Math.round((ramUsed / ramTot) * 100),
      ramTotal: ramTot,
      ramUsed: ramUsed,
      ramAvailable: row.ram_available ?? (ramTot - ramUsed),
      storageUsage: Math.round(((storageTot - storageAvail) / storageTot) * 100),
      storageTotal: storageTot,
      storageUsed: row.storage_used ?? (storageTot - storageAvail),
      storageAvailable: storageAvail,
      temperature: row.temperature,
      batteryLevel: row.battery,
      charging: row.charging !== null && row.charging !== undefined ? Boolean(row.charging) : null,
      batteryDrainRate: 8,
      source: sourceName,
      platform: sourceName,
    };
  });

  return res.json(samples);
});
