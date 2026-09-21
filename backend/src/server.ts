import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import { telemetryRouter } from './routes/telemetry.js';
import { appsRouter } from './routes/apps.js';
import { predictionsRouter } from './routes/predictions.js';
import { simulatedRunsRouter } from './routes/simulatedRuns.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Database & Tables
initDatabase();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/telemetry', telemetryRouter);
app.use('/api/apps', appsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/simulated-runs', simulatedRunsRouter);

app.get('/api', (_req, res) => {
  res.json({ status: 'ok', name: 'AI Phone Copilot API', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
