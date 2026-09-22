import { Router } from 'express';
import { adaptiveDayService } from '../services/adaptiveDayService.js';

export const adaptiveDayRouter = Router();

// GET current Adaptive Day state
adaptiveDayRouter.get('/', (_req, res) => {
  try {
    const state = adaptiveDayService.getState();
    res.json(state);
  } catch (err) {
    console.error('[AdaptiveDay Router] Error fetching state:', err);
    res.status(500).json({ error: 'Failed to fetch Adaptive Day state' });
  }
});

// POST dismiss pattern [Not My Routine]
adaptiveDayRouter.post('/dismiss-pattern', (req, res) => {
  try {
    const { contextType } = req.body || {};
    if (!contextType || typeof contextType !== 'string') {
      res.status(400).json({ error: 'Missing contextType string' });
      return;
    }

    adaptiveDayService.dismissCurrentPattern(contextType);
    res.json({ success: true, message: `Pattern for '${contextType}' dismissed.` });
  } catch (err) {
    console.error('[AdaptiveDay Router] Error dismissing pattern:', err);
    res.status(500).json({ error: 'Failed to dismiss pattern' });
  }
});

// POST apply recommended action (User confirmed)
adaptiveDayRouter.post('/apply-action', (req, res) => {
  try {
    const { actionId } = req.body || {};
    if (!actionId || typeof actionId !== 'string') {
      res.status(400).json({ error: 'Missing actionId string' });
      return;
    }

    const result = adaptiveDayService.applyAction(actionId);
    res.json(result);
  } catch (err) {
    console.error('[AdaptiveDay Router] Error applying action:', err);
    res.status(500).json({ error: 'Failed to apply action' });
  }
});

// POST update user preferences (Pause, Location Permission)
adaptiveDayRouter.post('/preferences', (req, res) => {
  try {
    const { isPaused, locationPermissionEnabled } = req.body || {};
    const updated = adaptiveDayService.updatePreferences({
      ...(typeof isPaused === 'boolean' ? { isPaused } : {}),
      ...(typeof locationPermissionEnabled === 'boolean' ? { locationPermissionEnabled } : {}),
    });

    res.json({ success: true, preferences: updated });
  } catch (err) {
    console.error('[AdaptiveDay Router] Error updating preferences:', err);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});
