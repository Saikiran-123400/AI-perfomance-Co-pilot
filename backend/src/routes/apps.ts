import { Router } from 'express';
import gplay from 'google-play-scraper';
import { db } from '../database.js';

export const appsRouter = Router();

function parseSizeToMB(sizeStr?: string | null): number | null {
  if (!sizeStr || typeof sizeStr !== 'string') return null;
  const upper = sizeStr.toUpperCase().trim();
  if (upper === 'VARY' || upper.includes('VARIES') || upper === 'N/A') return null;
  const match = upper.match(/([\d.]+)\s*([KMGkmg]?)/);
  if (!match) return null;
  const val = parseFloat(match[1]);
  if (isNaN(val)) return null;
  const unit = match[2];
  if (unit === 'G') return Math.round(val * 1024);
  if (unit === 'K') return Math.round((val / 1024) * 10) / 10;
  return Math.round(val);
}

// GET /api/apps/installed — List real installed Windows applications with live isRunning status
appsRouter.get('/installed', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    const row = db.prepare('SELECT active_apps, installed_apps FROM devices WHERE installed_apps IS NOT NULL ORDER BY id DESC LIMIT 1').get() as
      | { active_apps: string | null; installed_apps: string | null }
      | undefined;

    let installedList: Array<{ name: string; publisher?: string; version?: string; installLocation?: string }> = [];
    if (row?.installed_apps) {
      try { installedList = JSON.parse(row.installed_apps); } catch {}
    }

    let activeList: Array<{ name: string }> = [];
    if (row?.active_apps) {
      try { activeList = JSON.parse(row.active_apps); } catch {}
    }

    const activeNames = activeList.map((a) => a.name.toLowerCase());

    const result = installedList.map((app) => {
      const appNameLower = app.name.toLowerCase();
      const isRunning = activeNames.some((active) => {
        if (appNameLower.includes(active) || active.includes(appNameLower)) return true;
        if (active.includes('chrome') && appNameLower.includes('chrome')) return true;
        if (active.includes('edge') && (appNameLower.includes('edge') || appNameLower.includes('microsoft edge'))) return true;
        if (active.includes('code') && (appNameLower.includes('visual studio code') || appNameLower.includes('vscode'))) return true;
        if (active.includes('spotify') && appNameLower.includes('spotify')) return true;
        if (active.includes('discord') && appNameLower.includes('discord')) return true;
        if (active.includes('node') && appNameLower.includes('node')) return true;
        if (active.includes('python') && appNameLower.includes('python')) return true;
        return false;
      });

      return {
        name: app.name,
        publisher: app.publisher || 'Unknown Publisher',
        version: app.version || 'Unavailable',
        installLocation: app.installLocation || 'Unavailable',
        isRunning,
      };
    });

    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve installed apps', message: err?.message });
  }
});

// GET /api/apps — Default sample app profiles from DB
appsRouter.get('/', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM app_profiles ORDER BY id ASC').all() as Array<{
      id: number;
      app_name: string;
      app_size: number;
      ram_requirement: number;
      cpu_intensity: string;
    }>;

    const apps = rows.map((row) => ({
      id: String(row.id),
      name: row.app_name,
      sizeMB: row.app_size,
      ramRequirementMB: row.ram_requirement,
      cpuIntensity: row.cpu_intensity,
    }));

    return res.json(apps);
  } catch {
    return res.json([]);
  }
});

// GET /api/apps/search?q=:query — Search real Google Play Store metadata
appsRouter.get('/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) {
    return res.json([]);
  }

  try {
    const results = await gplay.search({ term: query, num: 10 });
    const apps = results.map((item: any) => {
      const scoreNum = typeof item.score === 'number' ? item.score : null;
      const scoreStr = item.scoreText || (scoreNum !== null ? scoreNum.toFixed(1) : null);
      const rawSize = item.size || item.maxInstalls || null;
      const parsedSizeMB = parseSizeToMB(item.size);

      return {
        appId: item.appId || item.id || String(Math.random()),
        title: item.title || item.appName || query,
        developer: item.developer || item.developerId || null,
        icon: item.icon || item.headerImage || null,
        scoreText: scoreStr,
        score: scoreNum,
        installs: item.installs || (item.minInstalls ? `${item.minInstalls.toLocaleString()}+` : null),
        size: item.size || null,
        sizeMB: parsedSizeMB,
        version: item.version || null,
        genre: item.genre || item.category || null,
        summary: item.summary || item.shortDescription || null,
        description: item.description || item.summary || null,
      };
    });

    return res.json(apps);
  } catch (err: any) {
    console.error('[PLAY STORE SEARCH ERROR]', err?.message || err);
    return res.status(500).json({
      error: 'Failed to search Google Play Store',
      message: err?.message || 'Network or scraper issue',
      apps: [],
    });
  }
});

// GET /api/apps/details?appId=:appId — Get detailed Play Store app info
appsRouter.get('/details', async (req, res) => {
  const appId = String(req.query.appId || '').trim();
  if (!appId) {
    return res.status(400).json({ error: 'appId parameter is required' });
  }

  try {
    const item: any = await gplay.app({ appId });
    const scoreNum = typeof item.score === 'number' ? item.score : null;
    const scoreStr = item.scoreText || (scoreNum !== null ? scoreNum.toFixed(1) : null);
    const parsedSizeMB = parseSizeToMB(item.size);

    return res.json({
      appId: item.appId,
      title: item.title,
      developer: item.developer || null,
      icon: item.icon || null,
      scoreText: scoreStr,
      score: scoreNum,
      installs: item.installs || null,
      size: item.size || null,
      sizeMB: parsedSizeMB,
      version: item.version || null,
      genre: item.genre || null,
      summary: item.summary || null,
      description: item.description || null,
    });
  } catch (err: any) {
    return res.status(404).json({ error: 'Play Store app details unavailable', message: err?.message });
  }
});

// GET /api/apps/sessions — Get stored app session analyses
appsRouter.get('/sessions', (_req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM app_sessions ORDER BY id DESC LIMIT 50').all() as Array<{
      id: number;
      app_name: string;
      pid: number | null;
      duration_seconds: number;
      avg_cpu: number;
      peak_cpu: number;
      avg_ram_mb: number;
      peak_ram_mb: number;
      battery_start: number | null;
      battery_end: number | null;
      temp_start: number | null;
      temp_end: number | null;
      created_at: string;
    }>;

    const sessions = rows.map((r) => ({
      id: r.id,
      appName: r.app_name,
      pid: r.pid || undefined,
      durationSeconds: r.duration_seconds,
      avgCpuPercent: r.avg_cpu,
      peakCpuPercent: r.peak_cpu,
      avgRamMb: r.avg_ram_mb,
      peakRamMb: r.peak_ram_mb,
      batteryStart: r.battery_start,
      batteryEnd: r.battery_end,
      tempStart: r.temp_start,
      tempEnd: r.temp_end,
      createdAt: r.created_at,
    }));

    return res.json(sessions);
  } catch {
    return res.json([]);
  }
});

// POST /api/apps/sessions — Save a completed app session analysis
appsRouter.post('/sessions', (req, res) => {
  const { appName, pid, durationSeconds, avgCpuPercent, peakCpuPercent, avgRamMb, peakRamMb, batteryStart, batteryEnd, tempStart, tempEnd } = req.body;

  if (!appName || typeof durationSeconds !== 'number') {
    return res.status(400).json({ error: 'Invalid app session data' });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO app_sessions (
        app_name, pid, duration_seconds, avg_cpu, peak_cpu, avg_ram_mb, peak_ram_mb, battery_start, battery_end, temp_start, temp_end
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      appName,
      pid || null,
      durationSeconds,
      avgCpuPercent || 0,
      peakCpuPercent || 0,
      avgRamMb || 0,
      peakRamMb || 0,
      batteryStart ?? null,
      batteryEnd ?? null,
      tempStart ?? null,
      tempEnd ?? null
    );

    return res.status(201).json({ success: true, id: Number(info.lastInsertRowid) });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to insert app session', message: err?.message });
  }
});

