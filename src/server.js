const express = require('express');
const cors = require('cors');
const valuation = require('./valuation');
const { resolveIndustry, resolveIndustryKey, listIndustries, INDUSTRY_BENCHMARKS } = require('./benchmarks');

const app = express();
const PORT = process.env.PORT || 5100;

app.use(cors());
app.use(express.json());

// ─── Health & Info ───────────────────────────────────────────────────────────

app.get('/', (_req, res) => {
  res.json({
    name: 'Startup Valuation API',
    version: '1.0.0',
    description: 'Premium startup & business valuation estimation — multiple methodologies for VCs, founders, and finance professionals',
    endpoints: {
      'POST /api/v1/revenue-multiple': 'Revenue-based valuation with industry-specific multipliers',
      'POST /api/v1/dcf': 'Discounted Cash Flow analysis',
      'POST /api/v1/scorecard': 'Scorecard method (angel investor methodology)',
      'POST /api/v1/berkus': 'Berkus method (pre-revenue startups)',
      'POST /api/v1/rule-of-40': 'SaaS health check (Rule of 40)',
      'POST /api/v1/comprehensive': 'Run ALL methods, return valuation range',
      'GET /api/v1/benchmarks/:industry': 'Industry benchmark data',
      'GET /api/v1/industries': 'List supported industries',
    },
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ─── Industries ──────────────────────────────────────────────────────────────

app.get('/api/v1/industries', (_req, res) => {
  res.json({ industries: listIndustries() });
});

// ─── Benchmarks ──────────────────────────────────────────────────────────────

app.get('/api/v1/benchmarks/:industry', (req, res) => {
  const key = resolveIndustryKey(req.params.industry);
  if (!key) {
    return res.status(404).json({ error: `Industry not found: ${req.params.industry}`, supported: Object.keys(INDUSTRY_BENCHMARKS) });
  }
  const bench = INDUSTRY_BENCHMARKS[key];
  res.json({ industry: key, ...bench });
});

// ─── Revenue Multiple ────────────────────────────────────────────────────────

app.post('/api/v1/revenue-multiple', wrap((req) => {
  return valuation.revenueMultiple(req.body);
}));

// ─── DCF ─────────────────────────────────────────────────────────────────────

app.post('/api/v1/dcf', wrap((req) => {
  return valuation.dcf(req.body);
}));

// ─── Comparable Company Analysis (via comprehensive with single method) ──────

app.post('/api/v1/comparable', wrap((req) => {
  return valuation.comparableAnalysis(req.body);
}));

// ─── Scorecard ───────────────────────────────────────────────────────────────

app.post('/api/v1/scorecard', wrap((req) => {
  return valuation.scorecard(req.body);
}));

// ─── Berkus ──────────────────────────────────────────────────────────────────

app.post('/api/v1/berkus', wrap((req) => {
  return valuation.berkus(req.body);
}));

// ─── Rule of 40 ─────────────────────────────────────────────────────────────

app.post('/api/v1/rule-of-40', wrap((req) => {
  return valuation.ruleOf40(req.body);
}));

// ─── Comprehensive ──────────────────────────────────────────────────────────

app.post('/api/v1/comprehensive', wrap((req) => {
  return valuation.comprehensive(req.body);
}));

// ─── Error-handling wrapper ─────────────────────────────────────────────────

function wrap(fn) {
  return (req, res) => {
    try {
      const result = fn(req);
      res.json(result);
    } catch (err) {
      const status = err.statusCode || 500;
      res.status(status).json({ error: err.message });
    }
  };
}

// ─── Start ──────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Startup Valuation API running on http://localhost:${PORT}`);
});

module.exports = app;
