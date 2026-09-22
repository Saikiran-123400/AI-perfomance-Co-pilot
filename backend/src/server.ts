import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDatabase } from './database.js';
import { telemetryRouter } from './routes/telemetry.js';
import { appsRouter } from './routes/apps.js';
import { predictionsRouter } from './routes/predictions.js';
import { simulatedRunsRouter } from './routes/simulatedRuns.js';
import { copilotRouter } from './routes/copilot.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Initialize Database & Tables
initDatabase();

// Safe Groq Startup Diagnostic (NEVER prints API key)
const hasGroqKey = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
console.log(`[Groq Diagnostic] GROQ_API_KEY loaded: ${hasGroqKey}`);
console.log(`[Groq Diagnostic] GROQ_MODEL: ${groqModel}`);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/telemetry', telemetryRouter);
app.use('/api/apps', appsRouter);
app.use('/api/predictions', predictionsRouter);
app.use('/api/simulated-runs', simulatedRunsRouter);
app.use('/api/copilot', copilotRouter);

app.get('/api', (_req, res) => {
  res.json({ status: 'ok', name: 'AI Phone Copilot API', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
});
