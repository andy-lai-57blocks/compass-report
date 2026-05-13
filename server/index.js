import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchAndCompute } from './fetchRepo.js';
import { analyzeAllUnits } from './deepseekAnalysis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'report.json');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ───────────────────────────────────────────
// Status tracking
// ───────────────────────────────────────────

let analysisStatus = {
  lastRun: null,
  running: false,
  progress: '',
  error: null,
  totalFiles: 0,
};

// ───────────────────────────────────────────
// Load/save report
// ───────────────────────────────────────────

function loadReport() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
  } catch (err) {
    console.error('Error loading report:', err.message);
  }
  return null;
}

function saveReport(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    // Write to a temp file first, then rename atomically
    // This ensures old report is never corrupted during write
    const tmpFile = DATA_FILE + '.tmp';
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
    fs.renameSync(tmpFile, DATA_FILE);
    console.log(`📝 Report saved to ${DATA_FILE}`);
  } catch (err) {
    console.error('Error saving report:', err.message);
  }
}

// ───────────────────────────────────────────
// Main analysis pipeline
// ───────────────────────────────────────────

async function runFullAnalysis(isManual = false) {
  if (analysisStatus.running) {
    console.log('Analysis already in progress, skipping...');
    return;
  }

  analysisStatus.running = true;
  analysisStatus.error = null;
  analysisStatus.lastRun = null;

  try {
    // Step 1: Fetch repository data
    analysisStatus.progress = 'Fetching Compass repository from GitHub...';
    console.log('\n=== 📡 Starting Analysis ===');
    const rawData = await fetchAndCompute();
    analysisStatus.totalFiles = rawData.summary.totalFiles;

    // Step 2: Run AI analysis
    analysisStatus.progress = 'Running DeepSeek AI analysis...';
    const unitsWithAI = await analyzeAllUnits(rawData.analysisUnits);

    // Step 3: Map AI results back to trees
    const aiAnalysisMap = {};
    for (const unit of unitsWithAI) {
      aiAnalysisMap[unit.path] = {
        ...unit.aiResult,
        topDir: unit.topDir,
        parent: unit.parent,
        name: unit.name,
        stats: unit.stats,
      };

      // Also update the tree node's stats
      function updateNodeStats(node) {
        if (node.path === unit.path) {
          node.stats = { ...node.stats, ...unit.stats };
          node.aiResult = unit.aiResult;
          return true;
        }
        for (const child of (node.children || [])) {
          if (updateNodeStats(child)) return true;
        }
        return false;
      }
      for (const tree of rawData.trees) {
        updateNodeStats(tree);
      }
    }

    // Step 4: Build final report
    const report = {
      generatedAt: new Date().toISOString(),
      generatedAtFormatted: new Date().toLocaleString(),
      summary: rawData.summary,
      trees: rawData.trees,
      files: rawData.files,
      analysisUnits: unitsWithAI,
      aiAnalysisMap,
    };

    // Step 5: Save
    saveReport(report);

    analysisStatus.lastRun = report.generatedAt;
    analysisStatus.progress = 'Analysis complete!';
    analysisStatus.error = null;
    console.log(`=== ✅ Analysis Complete (${new Date().toLocaleString()}) ===\n`);
  } catch (err) {
    console.error('❌ Analysis failed:', err);
    analysisStatus.error = err.message;
    analysisStatus.progress = 'Analysis failed';
  } finally {
    analysisStatus.running = false;
  }
}

// ───────────────────────────────────────────
// API Routes
// ───────────────────────────────────────────

// GET /api/report - Get the latest cached report
app.get('/api/report', (req, res) => {
  const report = loadReport();
  if (!report) {
    return res.json({
      status: 'not_ready',
      message: 'Report not yet generated. Trigger analysis via POST /api/analyze',
      analysisStatus,
    });
  }
  res.json({
    status: 'ready',
    report,
    analysisStatus,
  });
});

// GET /api/status - Get current analysis status
app.get('/api/status', (req, res) => {
  res.json(analysisStatus);
});

// POST /api/analyze - Trigger a manual full re-analysis
app.post('/api/analyze', async (req, res) => {
  if (analysisStatus.running) {
    return res.status(409).json({ error: 'Analysis already in progress' });
  }

  // Run in background
  runFullAnalysis(true).catch(err => console.error(err));

  res.json({
    message: 'Analysis started',
    status: analysisStatus,
  });
});

// GET /api/analyze/progress - SSE endpoint for progress streaming
app.get('/api/analyze/progress', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const interval = setInterval(() => {
    res.write(`data: ${JSON.stringify(analysisStatus)}\n\n`);
    if (!analysisStatus.running) {
      clearInterval(interval);
      res.end();
    }
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// ───────────────────────────────────────────
// Start server
// ───────────────────────────────────────────

async function start() {
  // Run initial analysis on startup if no cached report
  const existingReport = loadReport();
  if (!existingReport) {
    console.log('📄 No cached report found. Running initial analysis...');
    // Don't await - let it run in background while server starts
    runFullAnalysis(false);
  } else {
    console.log(`📄 Cached report found (${existingReport.generatedAtFormatted})`);
    analysisStatus.lastRun = existingReport.generatedAt;
    analysisStatus.totalFiles = existingReport.summary?.totalFiles || 0;
  }

  // Schedule daily cron (default: 3am)
  const cronSchedule = process.env.CRON_SCHEDULE || '0 3 * * *';
  cron.schedule(cronSchedule, () => {
    console.log(`⏰ Cron triggered (${cronSchedule})`);
    runFullAnalysis(false);
  });
  console.log(`⏰ Cron scheduled: ${cronSchedule}`);

  app.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}`);
    console.log(`   API Endpoints:`);
    console.log(`   GET  /api/report     - Get cached report`);
    console.log(`   GET  /api/status     - Get analysis status`);
    console.log(`   POST /api/analyze    - Trigger re-analysis`);
    console.log(`   GET  /api/analyze/progress - SSE progress stream\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
