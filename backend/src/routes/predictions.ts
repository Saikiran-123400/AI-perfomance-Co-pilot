import { Router } from 'express';
import { db } from '../database.js';

export const predictionsRouter = Router();

// POST /api/predictions
predictionsRouter.post('/', (req, res) => {
  const {
    appName,
    ramImpact,
    cpuImpact,
    storageImpact,
    batteryImpact,
    thermalImpact,
    overallImpact,
  } = req.body;

  if (!appName || !overallImpact) {
    return res.status(400).json({ error: 'Missing required prediction fields.' });
  }

  const stmt = db.prepare(`
    INSERT INTO predictions (
      app_name, ram_impact, cpu_impact, storage_impact, battery_impact, thermal_impact, overall_impact
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    appName,
    ramImpact || 'LOW',
    cpuImpact || 'LOW',
    storageImpact || 'LOW',
    batteryImpact || 'LOW',
    thermalImpact || 'LOW',
    overallImpact
  );

  return res.status(201).json({
    success: true,
    id: info.lastInsertRowid,
  });
});

// GET /api/predictions
predictionsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM predictions ORDER BY id DESC LIMIT 20').all() as Array<{
    id: number;
    app_name: string;
    ram_impact: string;
    cpu_impact: string;
    storage_impact: string;
    battery_impact: string;
    thermal_impact: string;
    overall_impact: string;
    created_at: string;
  }>;

  const predictions = rows.map((row) => ({
    id: row.id,
    appName: row.app_name,
    ramImpact: row.ram_impact,
    cpuImpact: row.cpu_impact,
    storageImpact: row.storage_impact,
    batteryImpact: row.battery_impact,
    thermalImpact: row.thermal_impact,
    overallImpact: row.overall_impact,
    createdAt: row.created_at,
  }));

  return res.json(predictions);
});
