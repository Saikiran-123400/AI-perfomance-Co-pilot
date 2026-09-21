import { Router } from 'express';
import { db } from '../database.js';

export const simulatedRunsRouter = Router();

// POST /api/simulated-runs
simulatedRunsRouter.post('/', (req, res) => {
  const {
    appName,
    predictedRam,
    actualRam,
    predictedCpu,
    actualCpu,
    predictedBattery,
    actualBattery,
    predictedThermal,
    actualThermal,
    predictedStorage,
    actualStorage,
    predictedOverall,
    actualOverall,
    accuracyScore,
  } = req.body;

  if (!appName || typeof accuracyScore !== 'number') {
    return res.status(400).json({ error: 'Missing required simulated run fields.' });
  }

  const stmt = db.prepare(`
    INSERT INTO simulated_runs (
      app_name, predicted_ram, actual_ram, predicted_cpu, actual_cpu,
      predicted_battery, actual_battery, predicted_thermal, actual_thermal,
      predicted_storage, actual_storage, predicted_overall, actual_overall, accuracy_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = stmt.run(
    appName,
    predictedRam || 'LOW',
    actualRam ?? 0,
    predictedCpu || 'LOW',
    actualCpu ?? 0,
    predictedBattery || 'LOW',
    actualBattery ?? 0,
    predictedThermal || 'LOW',
    actualThermal ?? 0,
    predictedStorage || 'LOW',
    actualStorage ?? 0,
    predictedOverall || 'LOW',
    actualOverall || 'LOW',
    accuracyScore
  );

  return res.status(201).json({
    success: true,
    id: Number(info.lastInsertRowid),
  });
});

// GET /api/simulated-runs
simulatedRunsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM simulated_runs ORDER BY id DESC LIMIT 20').all() as Array<{
    id: number;
    app_name: string;
    predicted_ram: string;
    actual_ram: number;
    predicted_cpu: string;
    actual_cpu: number;
    predicted_battery: string;
    actual_battery: number;
    predicted_thermal: string;
    actual_thermal: number;
    predicted_storage: string;
    actual_storage: number;
    predicted_overall?: string;
    actual_overall?: string;
    accuracy_score: number;
    created_at: string;
  }>;

  const runs = rows.map((row) => ({
    id: row.id,
    appName: row.app_name,
    predictedRam: row.predicted_ram,
    actualRam: row.actual_ram,
    predictedCpu: row.predicted_cpu,
    actualCpu: row.actual_cpu,
    predictedBattery: row.predicted_battery,
    actualBattery: row.actual_battery,
    predictedThermal: row.predicted_thermal,
    actualThermal: row.actual_thermal,
    predictedStorage: row.predicted_storage,
    actualStorage: row.actual_storage,
    predictedOverall: row.predicted_overall || 'LOW',
    actualOverall: row.actual_overall || 'LOW',
    accuracyScore: row.accuracy_score,
    createdAt: row.created_at,
  }));

  return res.json(runs);
});
