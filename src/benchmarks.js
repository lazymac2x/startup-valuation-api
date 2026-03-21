/**
 * Industry Benchmark Data
 * Median valuations, typical multiples, growth rates, and comparable metrics
 * Sources: aggregated from PitchBook, CB Insights, and public market data
 */

const INDUSTRY_BENCHMARKS = {
  saas: {
    name: 'SaaS / Software-as-a-Service',
    revenueMultiple: { low: 8, median: 12, high: 15 },
    ebitdaMultiple: { low: 20, median: 30, high: 50 },
    medianGrowthRate: 0.35,
    medianGrossMargin: 0.75,
    medianNetRetention: 1.15,
    medianCAC_LTV: 3.0,
    typicalDiscountRate: 0.25,
    medianSeedValuation: 8_000_000,
    medianSeriesA: 30_000_000,
    medianSeriesB: 80_000_000,
    medianSeriesC: 200_000_000,
    keyMetrics: ['ARR', 'MRR', 'Net Revenue Retention', 'CAC/LTV', 'Churn Rate', 'Rule of 40'],
    exitMultiples: { acquisition: { low: 5, median: 8, high: 20 }, ipo: { low: 10, median: 15, high: 40 } },
    comparables: [
      { name: 'High-growth SaaS (>50% growth)', multiple: 18 },
      { name: 'Mid-growth SaaS (25-50% growth)', multiple: 12 },
      { name: 'Mature SaaS (<25% growth)', multiple: 7 },
    ],
  },

  fintech: {
    name: 'Fintech',
    revenueMultiple: { low: 6, median: 9, high: 12 },
    ebitdaMultiple: { low: 15, median: 25, high: 40 },
    medianGrowthRate: 0.40,
    medianGrossMargin: 0.65,
    medianNetRetention: 1.10,
    medianCAC_LTV: 2.5,
    typicalDiscountRate: 0.28,
    medianSeedValuation: 10_000_000,
    medianSeriesA: 35_000_000,
    medianSeriesB: 100_000_000,
    medianSeriesC: 300_000_000,
    keyMetrics: ['TPV', 'Take Rate', 'Net Revenue', 'Regulatory Compliance', 'Default Rate'],
    exitMultiples: { acquisition: { low: 4, median: 7, high: 15 }, ipo: { low: 8, median: 12, high: 30 } },
    comparables: [
      { name: 'Payments / Infrastructure', multiple: 12 },
      { name: 'Lending / Insurance', multiple: 7 },
      { name: 'Banking / Neobank', multiple: 9 },
    ],
  },

  ecommerce: {
    name: 'E-commerce',
    revenueMultiple: { low: 2, median: 3, high: 4 },
    ebitdaMultiple: { low: 8, median: 12, high: 20 },
    medianGrowthRate: 0.25,
    medianGrossMargin: 0.45,
    medianNetRetention: 0.85,
    medianCAC_LTV: 2.0,
    typicalDiscountRate: 0.22,
    medianSeedValuation: 5_000_000,
    medianSeriesA: 15_000_000,
    medianSeriesB: 50_000_000,
    medianSeriesC: 120_000_000,
    keyMetrics: ['GMV', 'AOV', 'Repeat Purchase Rate', 'CAC', 'Contribution Margin'],
    exitMultiples: { acquisition: { low: 1.5, median: 3, high: 6 }, ipo: { low: 3, median: 5, high: 10 } },
    comparables: [
      { name: 'D2C Brand', multiple: 3 },
      { name: 'Marketplace (3P)', multiple: 5 },
      { name: 'Subscription Commerce', multiple: 4 },
    ],
  },

  ai_ml: {
    name: 'AI / Machine Learning',
    revenueMultiple: { low: 15, median: 20, high: 25 },
    ebitdaMultiple: { low: 30, median: 50, high: 80 },
    medianGrowthRate: 0.60,
    medianGrossMargin: 0.70,
    medianNetRetention: 1.25,
    medianCAC_LTV: 4.0,
    typicalDiscountRate: 0.30,
    medianSeedValuation: 15_000_000,
    medianSeriesA: 50_000_000,
    medianSeriesB: 150_000_000,
    medianSeriesC: 500_000_000,
    keyMetrics: ['ARR', 'Model Performance', 'Data Moat', 'Compute Costs', 'Enterprise Pipeline'],
    exitMultiples: { acquisition: { low: 10, median: 18, high: 40 }, ipo: { low: 15, median: 25, high: 60 } },
    comparables: [
      { name: 'AI Infrastructure / Foundation', multiple: 25 },
      { name: 'Vertical AI (domain-specific)', multiple: 18 },
      { name: 'AI-enhanced SaaS', multiple: 14 },
    ],
  },

  healthcare: {
    name: 'Healthcare / Healthtech',
    revenueMultiple: { low: 5, median: 7, high: 10 },
    ebitdaMultiple: { low: 12, median: 18, high: 30 },
    medianGrowthRate: 0.30,
    medianGrossMargin: 0.65,
    medianNetRetention: 1.05,
    medianCAC_LTV: 3.5,
    typicalDiscountRate: 0.25,
    medianSeedValuation: 8_000_000,
    medianSeriesA: 25_000_000,
    medianSeriesB: 70_000_000,
    medianSeriesC: 180_000_000,
    keyMetrics: ['Patient Volume', 'Revenue per Patient', 'Regulatory Approvals', 'Clinical Outcomes', 'Payer Mix'],
    exitMultiples: { acquisition: { low: 4, median: 6, high: 12 }, ipo: { low: 6, median: 10, high: 20 } },
    comparables: [
      { name: 'Digital Health / Telehealth', multiple: 8 },
      { name: 'Health Insurance / Payer', multiple: 5 },
      { name: 'Biotech (revenue-stage)', multiple: 10 },
    ],
  },

  marketplace: {
    name: 'Marketplace',
    revenueMultiple: { low: 5, median: 6.5, high: 8 },
    ebitdaMultiple: { low: 15, median: 22, high: 35 },
    medianGrowthRate: 0.35,
    medianGrossMargin: 0.60,
    medianNetRetention: 1.0,
    medianCAC_LTV: 2.5,
    typicalDiscountRate: 0.25,
    medianSeedValuation: 7_000_000,
    medianSeriesA: 25_000_000,
    medianSeriesB: 65_000_000,
    medianSeriesC: 160_000_000,
    keyMetrics: ['GMV', 'Take Rate', 'Liquidity', 'Supply/Demand Balance', 'Repeat Rate'],
    exitMultiples: { acquisition: { low: 3, median: 6, high: 12 }, ipo: { low: 6, median: 10, high: 20 } },
    comparables: [
      { name: 'B2B Marketplace', multiple: 7 },
      { name: 'B2C Marketplace', multiple: 6 },
      { name: 'Services Marketplace', multiple: 5 },
    ],
  },

  gaming: {
    name: 'Gaming',
    revenueMultiple: { low: 3, median: 4.5, high: 6 },
    ebitdaMultiple: { low: 10, median: 15, high: 25 },
    medianGrowthRate: 0.20,
    medianGrossMargin: 0.70,
    medianNetRetention: 0.75,
    medianCAC_LTV: 1.8,
    typicalDiscountRate: 0.30,
    medianSeedValuation: 5_000_000,
    medianSeriesA: 15_000_000,
    medianSeriesB: 40_000_000,
    medianSeriesC: 100_000_000,
    keyMetrics: ['DAU/MAU', 'ARPDAU', 'D1/D7/D30 Retention', 'LTV', 'CPI'],
    exitMultiples: { acquisition: { low: 2, median: 4, high: 10 }, ipo: { low: 4, median: 7, high: 15 } },
    comparables: [
      { name: 'Mobile Gaming', multiple: 4 },
      { name: 'PC/Console (IP-driven)', multiple: 5 },
      { name: 'Gaming Infrastructure', multiple: 7 },
    ],
  },

  crypto_web3: {
    name: 'Crypto / Web3',
    revenueMultiple: { low: 5, median: 10, high: 15 },
    ebitdaMultiple: { low: 15, median: 25, high: 45 },
    medianGrowthRate: 0.50,
    medianGrossMargin: 0.65,
    medianNetRetention: 0.90,
    medianCAC_LTV: 2.0,
    typicalDiscountRate: 0.35,
    medianSeedValuation: 12_000_000,
    medianSeriesA: 40_000_000,
    medianSeriesB: 100_000_000,
    medianSeriesC: 250_000_000,
    keyMetrics: ['TVL', 'Protocol Revenue', 'Active Wallets', 'Transaction Volume', 'Token Velocity'],
    exitMultiples: { acquisition: { low: 3, median: 8, high: 20 }, ipo: { low: 6, median: 12, high: 25 } },
    comparables: [
      { name: 'DeFi Protocol', multiple: 12 },
      { name: 'Exchange / Infrastructure', multiple: 10 },
      { name: 'NFT / Gaming (Web3)', multiple: 6 },
    ],
  },
};

// Aliases for flexible lookup
const INDUSTRY_ALIASES = {
  saas: 'saas',
  software: 'saas',
  fintech: 'fintech',
  finance: 'fintech',
  ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  retail: 'ecommerce',
  ai: 'ai_ml',
  ai_ml: 'ai_ml',
  ml: 'ai_ml',
  'artificial-intelligence': 'ai_ml',
  healthcare: 'healthcare',
  healthtech: 'healthcare',
  biotech: 'healthcare',
  marketplace: 'marketplace',
  gaming: 'gaming',
  games: 'gaming',
  crypto: 'crypto_web3',
  crypto_web3: 'crypto_web3',
  web3: 'crypto_web3',
  blockchain: 'crypto_web3',
};

function resolveIndustry(input) {
  if (!input) return null;
  const key = input.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
  const resolved = INDUSTRY_ALIASES[key] || INDUSTRY_ALIASES[key.replace(/_/g, '')] || null;
  return resolved ? INDUSTRY_BENCHMARKS[resolved] : null;
}

function resolveIndustryKey(input) {
  if (!input) return null;
  const key = input.toLowerCase().replace(/[\s\/]+/g, '_').replace(/-/g, '_');
  return INDUSTRY_ALIASES[key] || INDUSTRY_ALIASES[key.replace(/_/g, '')] || null;
}

function listIndustries() {
  return Object.entries(INDUSTRY_BENCHMARKS).map(([key, data]) => ({
    id: key,
    name: data.name,
    revenueMultipleRange: `${data.revenueMultiple.low}x - ${data.revenueMultiple.high}x`,
    medianGrowthRate: `${(data.medianGrowthRate * 100).toFixed(0)}%`,
    medianSeedValuation: data.medianSeedValuation,
  }));
}

module.exports = {
  INDUSTRY_BENCHMARKS,
  INDUSTRY_ALIASES,
  resolveIndustry,
  resolveIndustryKey,
  listIndustries,
};
