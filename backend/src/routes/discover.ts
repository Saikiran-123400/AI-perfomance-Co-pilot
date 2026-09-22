import { Router } from 'express';
import { discoverService } from '../services/discoverService.js';

export const discoverRouter = Router();

// GET /api/discover - Get personalized discovery feed
discoverRouter.get('/', async (_req, res) => {
  try {
    const feed = await discoverService.getDiscoverFeed();
    return res.json(feed);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to generate discovery feed' });
  }
});

// GET /api/discover/videos - Fetch YouTube search results
discoverRouter.get('/videos', async (req, res) => {
  try {
    const stack = typeof req.query.stack === 'string' ? req.query.stack : 'Software Development';
    const videos = await discoverService.fetchYouTubeVideos(stack);
    return res.json(videos);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch YouTube recommendations' });
  }
});

// GET /api/discover/updates - Fetch verified software updates
discoverRouter.get('/updates', (_req, res) => {
  try {
    const updates = discoverService.fetchSoftwareUpdates([]);
    return res.json(updates);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch software updates' });
  }
});
