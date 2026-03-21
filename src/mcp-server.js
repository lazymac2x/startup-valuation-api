#!/usr/bin/env node
/**
 * MCP (Model Context Protocol) Server for Startup Valuation API
 * Exposes valuation tools via stdio JSON-RPC for LLM integration
 */

const readline = require('readline');
const valuation = require('./valuation');
const { resolveIndustry, resolveIndustryKey, listIndustries, INDUSTRY_BENCHMARKS } = require('./benchmarks');

const SERVER_INFO = {
  name: 'startup-valuation-mcp',
  version: '1.0.0',
  description: 'Startup valuation estimation — multiple methodologies',
};

const TOOLS = [
  {
    name: 'revenue_multiple',
    description: 'Calculate startup valuation using industry-specific revenue multipliers. Supports SaaS, Fintech, E-commerce, AI/ML, Healthcare, Marketplace, Gaming, Crypto/Web3.',
    inputSchema: {
      type: 'object',
      properties: {
        annualRevenue: { type: 'number', description: 'Annual revenue (ARR) in USD' },
        industry: { type: 'string', description: 'Industry (saas, fintech, ecommerce, ai_ml, healthcare, marketplace, gaming, crypto_web3)' },
        growthRate: { type: 'number', description: 'Annual growth rate as decimal (e.g., 0.5 for 50%)' },
        grossMargin: { type: 'number', description: 'Gross margin as decimal (e.g., 0.75 for 75%)' },
        netRetention: { type: 'number', description: 'Net revenue retention as decimal (e.g., 1.15 for 115%)' },
      },
      required: ['annualRevenue', 'industry'],
    },
  },
  {
    name: 'dcf_analysis',
    description: 'Discounted Cash Flow analysis — project future cash flows and discount to present value.',
    inputSchema: {
      type: 'object',
      properties: {
        currentRevenue: { type: 'number', description: 'Current annual revenue in USD' },
        growthRates: { description: 'Annual growth rate (number) or array of yearly rates' },
        profitMargin: { type: 'number', description: 'Expected profit margin as decimal' },
        discountRate: { type: 'number', description: 'Discount rate (WACC) as decimal. Defaults to industry typical.' },
        terminalGrowthRate: { type: 'number', description: 'Long-term growth rate for terminal value. Default 3%.' },
        projectionYears: { type: 'number', description: 'Number of years to project. Default 5.' },
        industry: { type: 'string', description: 'Industry for default discount rate' },
      },
      required: ['currentRevenue', 'growthRates', 'profitMargin'],
    },
  },
  {
    name: 'scorecard_method',
    description: 'Angel investor scorecard valuation — evaluates team, market, product, competition, marketing, and investment need.',
    inputSchema: {
      type: 'object',
      properties: {
        industry: { type: 'string', description: 'Industry sector' },
        region: { type: 'string', description: 'Region (US, europe, asia, latam). Default: US' },
        scores: {
          type: 'object',
          description: 'Scores from 0.0 to 2.0 (1.0 = average) for: team, market, product, competition, marketing, needForInvestment, other',
        },
      },
      required: ['industry', 'scores'],
    },
  },
  {
    name: 'berkus_method',
    description: 'Pre-revenue startup valuation using the Berkus method — rates sound idea, prototype, team quality, relationships, and rollout.',
    inputSchema: {
      type: 'object',
      properties: {
        soundIdea: { type: 'number', description: 'Score 0.0-1.0 for basic value of the idea' },
        prototype: { type: 'number', description: 'Score 0.0-1.0 for working prototype' },
        qualityTeam: { type: 'number', description: 'Score 0.0-1.0 for management team quality' },
        strategicRelationships: { type: 'number', description: 'Score 0.0-1.0 for partnerships/relationships' },
        productRollout: { type: 'number', description: 'Score 0.0-1.0 for product rollout/sales progress' },
        maxValuation: { type: 'number', description: 'Maximum possible valuation. Default $2.5M' },
      },
      required: ['soundIdea', 'qualityTeam'],
    },
  },
  {
    name: 'rule_of_40',
    description: 'SaaS health check — Revenue Growth % + Profit Margin % should exceed 40 for a healthy SaaS business.',
    inputSchema: {
      type: 'object',
      properties: {
        annualRevenue: { type: 'number', description: 'Annual revenue in USD' },
        revenueGrowthRate: { type: 'number', description: 'Revenue growth rate as decimal' },
        profitMargin: { type: 'number', description: 'Profit margin as decimal' },
        industry: { type: 'string', description: 'Industry (defaults to saas)' },
      },
      required: ['annualRevenue', 'revenueGrowthRate', 'profitMargin'],
    },
  },
  {
    name: 'comprehensive_valuation',
    description: 'Run ALL available valuation methods and return a blended valuation range with confidence scores.',
    inputSchema: {
      type: 'object',
      properties: {
        annualRevenue: { type: 'number', description: 'Annual revenue in USD' },
        industry: { type: 'string', description: 'Industry sector' },
        growthRate: { type: 'number', description: 'Annual growth rate as decimal' },
        profitMargin: { type: 'number', description: 'Profit margin as decimal' },
        grossMargin: { type: 'number', description: 'Gross margin as decimal' },
        netRetention: { type: 'number', description: 'Net revenue retention as decimal' },
        ebitda: { type: 'number', description: 'EBITDA in USD' },
        stage: { type: 'string', description: 'Funding stage (pre-seed, seed, series-a, etc.)' },
        region: { type: 'string', description: 'Region for scorecard' },
        scores: { type: 'object', description: 'Scorecard scores' },
        berkusScores: { type: 'object', description: 'Berkus method scores' },
      },
      required: ['annualRevenue', 'industry'],
    },
  },
  {
    name: 'get_benchmarks',
    description: 'Get industry benchmark data including median valuations, multiples, growth rates, and comparable companies.',
    inputSchema: {
      type: 'object',
      properties: {
        industry: { type: 'string', description: 'Industry to get benchmarks for' },
      },
      required: ['industry'],
    },
  },
  {
    name: 'list_industries',
    description: 'List all supported industries with summary data.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// Tool handler dispatch
function handleTool(name, args) {
  switch (name) {
    case 'revenue_multiple':
      return valuation.revenueMultiple(args);
    case 'dcf_analysis':
      return valuation.dcf(args);
    case 'scorecard_method':
      return valuation.scorecard(args);
    case 'berkus_method':
      return valuation.berkus(args);
    case 'rule_of_40':
      return valuation.ruleOf40(args);
    case 'comprehensive_valuation':
      return valuation.comprehensive(args);
    case 'get_benchmarks': {
      const key = resolveIndustryKey(args.industry);
      if (!key) throw new Error(`Industry not found: ${args.industry}`);
      return { industry: key, ...INDUSTRY_BENCHMARKS[key] };
    }
    case 'list_industries':
      return { industries: listIndustries() };
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─── JSON-RPC over stdio ────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, terminal: false });
let buffer = '';

rl.on('line', (line) => {
  buffer += line;
  try {
    const msg = JSON.parse(buffer);
    buffer = '';
    handleMessage(msg);
  } catch {
    // Incomplete JSON, keep buffering
  }
});

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: SERVER_INFO,
          capabilities: { tools: {} },
        },
      });
      break;

    case 'notifications/initialized':
      // No response needed
      break;

    case 'tools/list':
      send({
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      });
      break;

    case 'tools/call': {
      const { name, arguments: args } = params;
      try {
        const result = handleTool(name, args || {});
        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        });
      } catch (err) {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Error: ${err.message}` }],
            isError: true,
          },
        });
      }
      break;
    }

    default:
      send({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${method}` },
      });
  }
}

process.stderr.write('Startup Valuation MCP Server running on stdio\n');
