import { Router } from 'express';
import { copilotService } from '../services/copilotService.js';
import { groqService } from '../services/groqService.js';

export const copilotRouter = Router();

// GET /api/copilot/groq-test - Diagnostic endpoint to test Groq connection directly
copilotRouter.get('/groq-test', async (_req, res) => {
  const result = await groqService.testDirectConnection();
  return res.json(result);
});

// POST /api/copilot/analyze
copilotRouter.post('/analyze', async (req, res) => {
  try {
    const question = typeof req.body.question === 'string' ? req.body.question : 'What should I do right now?';
    console.log('[Copilot] Request received:', question);
    
    const result = await copilotService.analyzeQuestion(question);
    return res.json(result);
  } catch (err: any) {
    console.error('[Copilot] Analysis error:', err?.message || err);
    return res.status(500).json({ error: err?.message || 'Copilot analysis failed' });
  }
});
