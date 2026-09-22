import { Router } from 'express';
import { fileIntelligenceService } from '../services/fileIntelligenceService.js';

export const fileIntelligenceRouter = Router();

// GET /api/files/storage - Storage Overview & Category Distribution
fileIntelligenceRouter.get('/storage', (_req, res) => {
  try {
    const overview = fileIntelligenceService.getStorageOverview();
    return res.json(overview);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch storage overview' });
  }
});

// GET /api/files/declutter - Digital Declutter Summary
fileIntelligenceRouter.get('/declutter', (_req, res) => {
  try {
    const declutter = fileIntelligenceService.getDeclutterSummary();
    return res.json(declutter);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch declutter summary' });
  }
});

// GET /api/files/duplicates - Exact SHA-256 Duplicates
fileIntelligenceRouter.get('/duplicates', (_req, res) => {
  try {
    const duplicates = fileIntelligenceService.getDuplicates();
    return res.json(duplicates);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch duplicate files' });
  }
});

// GET /api/files/redundant - Redundant Files & Generated Build Output
fileIntelligenceRouter.get('/redundant', (_req, res) => {
  try {
    const redundant = fileIntelligenceService.getRedundantFiles();
    return res.json(redundant);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch redundant files' });
  }
});

// GET /api/files/developer-projects - Developer Project Cleanup
fileIntelligenceRouter.get('/developer-projects', (_req, res) => {
  try {
    const projects = fileIntelligenceService.getDeveloperProjectCleanup();
    return res.json(projects);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch developer projects' });
  }
});

// GET /api/files/large - Large Files Finder (?sort=size|oldest|recent)
fileIntelligenceRouter.get('/large', (req, res) => {
  try {
    const sort = (req.query.sort as 'size' | 'oldest' | 'recent') || 'size';
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const largeFiles = fileIntelligenceService.getLargeFiles(sort, limit);
    return res.json(largeFiles);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch large files' });
  }
});

// GET /api/files/old - Old File Intelligence (?days=30|90|180|365)
fileIntelligenceRouter.get('/old', (req, res) => {
  try {
    const days = parseInt(req.query.days as string, 10) || 90;
    const oldFiles = fileIntelligenceService.getOldFiles(days);
    return res.json(oldFiles);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch old files' });
  }
});

// GET /api/files/organization - Smart Organization Preview
fileIntelligenceRouter.get('/organization', (_req, res) => {
  try {
    const suggestions = fileIntelligenceService.getSmartOrganizationPreview();
    return res.json(suggestions);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch organization suggestions' });
  }
});

// GET /api/files/sensitive - Sensitive File Detection
fileIntelligenceRouter.get('/sensitive', (_req, res) => {
  try {
    const sensitive = fileIntelligenceService.getSensitiveFiles();
    return res.json(sensitive);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch sensitive files' });
  }
});

// GET /api/files/growth - Storage Growth & Pressure
fileIntelligenceRouter.get('/growth', (_req, res) => {
  try {
    const growth = fileIntelligenceService.getStorageGrowth();
    return res.json(growth);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to fetch storage growth data' });
  }
});

// GET & POST /api/files/exclusions - Excluded Folders
fileIntelligenceRouter.get('/exclusions', (_req, res) => {
  return res.json(fileIntelligenceService.getExcludedPaths());
});

fileIntelligenceRouter.post('/exclusions', (req, res) => {
  try {
    const { action, folderPath } = req.body;
    if (typeof folderPath !== 'string' || !folderPath.trim()) {
      return res.status(400).json({ error: 'Folder path is required' });
    }
    if (action === 'remove') {
      const paths = fileIntelligenceService.removeExcludedPath(folderPath);
      return res.json(paths);
    }
    const paths = fileIntelligenceService.addExcludedPath(folderPath);
    return res.json(paths);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to update exclusions' });
  }
});

// POST /api/files/action - Execute User Approved Safe Action (Recycle/Move)
fileIntelligenceRouter.post('/action', async (req, res) => {
  try {
    const { actionType, targetPaths, destinationPath } = req.body;
    if (!Array.isArray(targetPaths) || targetPaths.length === 0) {
      return res.status(400).json({ error: 'targetPaths array is required' });
    }
    if (actionType !== 'recycle' && actionType !== 'move') {
      return res.status(400).json({ error: 'actionType must be "recycle" or "move"' });
    }

    const result = await fileIntelligenceService.executeAction(actionType, targetPaths, destinationPath);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Action execution failed' });
  }
});

// POST /api/files/rescan - Force Rescan Filesystem
fileIntelligenceRouter.post('/rescan', (_req, res) => {
  try {
    fileIntelligenceService.forceRescan();
    return res.json({ success: true, message: 'Filesystem rescan initiated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Rescan failed' });
  }
});
