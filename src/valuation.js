/**
 * Startup Valuation Engine
 * Multiple methodologies for comprehensive startup & business valuation
 */

const { resolveIndustry, resolveIndustryKey, INDUSTRY_BENCHMARKS } = require('./benchmarks');

// ─── 1. Revenue Multiple Method ───────────────────────────────────────────────

function revenueMultiple({ annualRevenue, industry, growthRate, grossMargin, netRetention }) {
  const bench = resolveIndustry(industry);
  if (!bench) throw new ValuationError(`Unsupported industry: ${industry}`);
  if (!annualRevenue || annualRevenue <= 0) throw new ValuationError('annualRevenue must be a positive number');

  const { low, median, high } = bench.revenueMultiple;

  // Adjust multiple based on performance vs benchmarks
  let adjustedMultiple = median;
  let adjustments = [];

  if (growthRate !== undefined) {
    const growthDelta = growthRate - bench.medianGrowthRate;
    const growthAdj = growthDelta * 10; // +10% growth = +1x multiple
    adjustedMultiple += growthAdj;
    adjustments.push({
      factor: 'Growth Rate',
      input: `${(growthRate * 100).toFixed(1)}%`,
      benchmark: `${(bench.medianGrowthRate * 100).toFixed(1)}%`,
      impact: growthAdj > 0 ? `+${growthAdj.toFixed(1)}x` : `${growthAdj.toFixed(1)}x`,
    });
  }

  if (grossMargin !== undefined) {
    const marginDelta = grossMargin - bench.medianGrossMargin;
    const marginAdj = marginDelta * 5;
    adjustedMultiple += marginAdj;
    adjustments.push({
      factor: 'Gross Margin',
      input: `${(grossMargin * 100).toFixed(1)}%`,
      benchmark: `${(bench.medianGrossMargin * 100).toFixed(1)}%`,
      impact: marginAdj > 0 ? `+${marginAdj.toFixed(1)}x` : `${marginAdj.toFixed(1)}x`,
    });
  }

  if (netRetention !== undefined) {
    const nrrDelta = netRetention - bench.medianNetRetention;
    const nrrAdj = nrrDelta * 8;
    adjustedMultiple += nrrAdj;
    adjustments.push({
      factor: 'Net Revenue Retention',
      input: `${(netRetention * 100).toFixed(0)}%`,
      benchmark: `${(bench.medianNetRetention * 100).toFixed(0)}%`,
      impact: nrrAdj > 0 ? `+${nrrAdj.toFixed(1)}x` : `${nrrAdj.toFixed(1)}x`,
    });
  }

  // Clamp to range
  adjustedMultiple = Math.max(low * 0.8, Math.min(high * 1.2, adjustedMultiple));

  const valuationLow = annualRevenue * low;
  const valuationMedian = annualRevenue * adjustedMultiple;
  const valuationHigh = annualRevenue * high;

  return {
    method: 'Revenue Multiple',
    industry: bench.name,
    annualRevenue,
    baseMultipleRange: { low, median, high },
    adjustedMultiple: round(adjustedMultiple, 1),
    adjustments,
    valuation: {
      low: round(valuationLow),
      estimated: round(valuationMedian),
      high: round(valuationHigh),
    },
    confidence: computeConfidence(adjustments.length, 'revenue_multiple'),
  };
}

// ─── 2. DCF (Discounted Cash Flow) ───────────────────────────────────────────

function dcf({ currentRevenue, growthRates, profitMargin, discountRate, terminalGrowthRate = 0.03, projectionYears = 5, industry }) {
  if (!currentRevenue || currentRevenue <= 0) throw new ValuationError('currentRevenue must be positive');
  if (!profitMargin) throw new ValuationError('profitMargin is required');

  // If growthRates is a single number, expand to array
  let rates = growthRates;
  if (typeof rates === 'number') {
    rates = Array(projectionYears).fill(rates);
  }
  if (!Array.isArray(rates) || rates.length === 0) {
    throw new ValuationError('growthRates must be a number or array of yearly rates');
  }
  // Pad to projectionYears if shorter
  while (rates.length < projectionYears) {
    const last = rates[rates.length - 1];
    rates.push(Math.max(last * 0.85, 0.02)); // Decay growth
  }

  // Resolve discount rate from industry if not provided
  let discount = discountRate;
  if (!discount && industry) {
    const bench = resolveIndustry(industry);
    if (bench) discount = bench.typicalDiscountRate;
  }
  if (!discount) discount = 0.25;

  const projections = [];
  let revenue = currentRevenue;

  for (let year = 1; year <= projectionYears; year++) {
    const growth = rates[year - 1];
    revenue = revenue * (1 + growth);
    const freeCashFlow = revenue * profitMargin;
    const discountFactor = Math.pow(1 + discount, year);
    const presentValue = freeCashFlow / discountFactor;

    projections.push({
      year,
      revenue: round(revenue),
      growthRate: `${(growth * 100).toFixed(1)}%`,
      freeCashFlow: round(freeCashFlow),
      discountFactor: round(discountFactor, 3),
      presentValue: round(presentValue),
    });
  }

  const sumPV = projections.reduce((s, p) => s + p.presentValue, 0);

  // Terminal value (Gordon Growth Model)
  const terminalFCF = projections[projections.length - 1].freeCashFlow * (1 + terminalGrowthRate);
  const terminalValue = terminalFCF / (discount - terminalGrowthRate);
  const terminalPV = terminalValue / Math.pow(1 + discount, projectionYears);

  const enterpriseValue = sumPV + terminalPV;

  return {
    method: 'Discounted Cash Flow (DCF)',
    assumptions: {
      currentRevenue,
      projectionYears,
      growthRates: rates.map(r => `${(r * 100).toFixed(1)}%`),
      profitMargin: `${(profitMargin * 100).toFixed(1)}%`,
      discountRate: `${(discount * 100).toFixed(1)}%`,
      terminalGrowthRate: `${(terminalGrowthRate * 100).toFixed(1)}%`,
    },
    projections,
    terminalValue: round(terminalPV),
    sumOfCashFlows: round(sumPV),
    valuation: {
      low: round(enterpriseValue * 0.8),
      estimated: round(enterpriseValue),
      high: round(enterpriseValue * 1.25),
    },
    terminalValuePct: `${((terminalPV / enterpriseValue) * 100).toFixed(1)}%`,
    confidence: computeConfidence(projectionYears >= 3 ? 4 : 2, 'dcf'),
  };
}

// ─── 3. Comparable Company Analysis ──────────────────────────────────────────

function comparableAnalysis({ annualRevenue, ebitda, industry, stage, growthRate }) {
  const bench = resolveIndustry(industry);
  if (!bench) throw new ValuationError(`Unsupported industry: ${industry}`);
  if (!annualRevenue || annualRevenue <= 0) throw new ValuationError('annualRevenue must be positive');

  const revMultiple = bench.revenueMultiple;
  const ebitdaMultiple = bench.ebitdaMultiple;

  // Revenue-based comps
  const revValuation = {
    low: annualRevenue * revMultiple.low,
    median: annualRevenue * revMultiple.median,
    high: annualRevenue * revMultiple.high,
  };

  // EBITDA-based comps (if available)
  let ebitdaValuation = null;
  if (ebitda && ebitda > 0) {
    ebitdaValuation = {
      low: ebitda * ebitdaMultiple.low,
      median: ebitda * ebitdaMultiple.median,
      high: ebitda * ebitdaMultiple.high,
    };
  }

  // Stage adjustment
  const stageMultiplier = getStageMultiplier(stage);

  // Find best comparable
  let bestComp = bench.comparables[0];
  if (growthRate !== undefined) {
    if (growthRate > 0.50) bestComp = bench.comparables[0]; // high growth
    else if (growthRate > 0.25) bestComp = bench.comparables[1]; // mid
    else bestComp = bench.comparables[bench.comparables.length - 1]; // mature
  }

  const compValuation = annualRevenue * bestComp.multiple * stageMultiplier;

  // Blended estimate
  const estimates = [revValuation.median];
  if (ebitdaValuation) estimates.push(ebitdaValuation.median);
  estimates.push(compValuation);
  const blended = estimates.reduce((a, b) => a + b, 0) / estimates.length;

  return {
    method: 'Comparable Company Analysis',
    industry: bench.name,
    revenueBasedValuation: {
      low: round(revValuation.low),
      median: round(revValuation.median),
      high: round(revValuation.high),
      multiplesUsed: revMultiple,
    },
    ebitdaBasedValuation: ebitdaValuation
      ? {
          low: round(ebitdaValuation.low),
          median: round(ebitdaValuation.median),
          high: round(ebitdaValuation.high),
          multiplesUsed: ebitdaMultiple,
        }
      : null,
    closestComparable: {
      category: bestComp.name,
      multiple: bestComp.multiple,
      valuation: round(compValuation),
    },
    stageAdjustment: { stage: stage || 'not specified', multiplier: stageMultiplier },
    valuation: {
      low: round(Math.min(revValuation.low, ebitdaValuation?.low || Infinity, compValuation * 0.8)),
      estimated: round(blended),
      high: round(Math.max(revValuation.high, ebitdaValuation?.high || 0, compValuation * 1.2)),
    },
    confidence: computeConfidence(ebitda ? 4 : 2, 'comparable'),
  };
}

// ─── 4. Scorecard Method ─────────────────────────────────────────────────────

function scorecard({ industry, region = 'US', scores }) {
  const bench = resolveIndustry(industry);
  if (!bench) throw new ValuationError(`Unsupported industry: ${industry}`);
  if (!scores || typeof scores !== 'object') throw new ValuationError('scores object is required');

  // Scorecard criteria with weights (must sum to 1.0)
  const criteria = {
    team: { weight: 0.30, label: 'Strength of Team' },
    market: { weight: 0.25, label: 'Size of Market Opportunity' },
    product: { weight: 0.15, label: 'Product / Technology' },
    competition: { weight: 0.10, label: 'Competitive Environment' },
    marketing: { weight: 0.10, label: 'Marketing / Sales Channels' },
    needForInvestment: { weight: 0.05, label: 'Need for Additional Investment' },
    other: { weight: 0.05, label: 'Other Factors' },
  };

  // Regional median pre-money valuations
  const regionalMedian = {
    US: bench.medianSeedValuation,
    europe: bench.medianSeedValuation * 0.75,
    asia: bench.medianSeedValuation * 0.65,
    latam: bench.medianSeedValuation * 0.50,
    other: bench.medianSeedValuation * 0.55,
  };

  const baseValuation = regionalMedian[region] || regionalMedian.US;

  // Each score should be 0.0 - 2.0 (1.0 = average)
  let totalWeight = 0;
  const breakdown = [];

  for (const [key, config] of Object.entries(criteria)) {
    const score = scores[key] !== undefined ? scores[key] : 1.0;
    if (score < 0 || score > 2) throw new ValuationError(`Score for ${key} must be between 0.0 and 2.0 (1.0 = average)`);
    totalWeight += config.weight * score;
    breakdown.push({
      criterion: config.label,
      weight: config.weight,
      score,
      weightedScore: round(config.weight * score, 3),
      assessment: score > 1.3 ? 'Strong' : score > 0.9 ? 'Average' : score > 0.5 ? 'Below Average' : 'Weak',
    });
  }

  const adjustedValuation = baseValuation * totalWeight;

  return {
    method: 'Scorecard Method',
    industry: bench.name,
    region,
    baseValuation: round(baseValuation),
    comparisonFactor: round(totalWeight, 3),
    breakdown,
    valuation: {
      low: round(adjustedValuation * 0.85),
      estimated: round(adjustedValuation),
      high: round(adjustedValuation * 1.15),
    },
    confidence: computeConfidence(Object.keys(scores).length, 'scorecard'),
  };
}

// ─── 5. Berkus Method ────────────────────────────────────────────────────────

function berkus({ soundIdea, prototype, qualityTeam, strategicRelationships, productRollout, maxValuation = 2_500_000 }) {
  // Each factor contributes up to maxValuation/5 (classic: $500K each, total $2.5M)
  const perFactor = maxValuation / 5;

  const factors = [
    { name: 'Sound Idea (basic value)', score: clampScore(soundIdea) },
    { name: 'Prototype (reduces technology risk)', score: clampScore(prototype) },
    { name: 'Quality Management Team (reduces execution risk)', score: clampScore(qualityTeam) },
    { name: 'Strategic Relationships (reduces market risk)', score: clampScore(strategicRelationships) },
    { name: 'Product Rollout / Sales (reduces production risk)', score: clampScore(productRollout) },
  ];

  const breakdown = factors.map(f => ({
    factor: f.name,
    score: f.score,
    maxValue: round(perFactor),
    assignedValue: round(perFactor * f.score),
    rating: f.score >= 0.8 ? 'Excellent' : f.score >= 0.6 ? 'Good' : f.score >= 0.4 ? 'Fair' : f.score >= 0.2 ? 'Weak' : 'None',
  }));

  const totalValue = breakdown.reduce((sum, b) => sum + b.assignedValue, 0);

  return {
    method: 'Berkus Method',
    description: 'Pre-revenue startup valuation based on qualitative risk factors',
    maxPossibleValuation: round(maxValuation),
    perFactorMax: round(perFactor),
    breakdown,
    valuation: {
      low: round(totalValue * 0.8),
      estimated: round(totalValue),
      high: round(totalValue * 1.2),
    },
    confidence: computeConfidence(factors.filter(f => f.score > 0).length, 'berkus'),
  };
}

// ─── 6. Rule of 40 ──────────────────────────────────────────────────────────

function ruleOf40({ annualRevenue, revenueGrowthRate, profitMargin, industry }) {
  if (!annualRevenue || annualRevenue <= 0) throw new ValuationError('annualRevenue must be positive');
  if (revenueGrowthRate === undefined) throw new ValuationError('revenueGrowthRate is required');
  if (profitMargin === undefined) throw new ValuationError('profitMargin is required');

  const bench = resolveIndustry(industry || 'saas');
  if (!bench) throw new ValuationError(`Unsupported industry: ${industry}`);

  const growthPct = revenueGrowthRate * 100;
  const marginPct = profitMargin * 100;
  const ruleOf40Score = growthPct + marginPct;
  const passes = ruleOf40Score >= 40;

  // Multiple adjustment based on Rule of 40 score
  let multipleAdjustment;
  if (ruleOf40Score >= 60) multipleAdjustment = 1.5;       // Elite
  else if (ruleOf40Score >= 40) multipleAdjustment = 1.0;   // Healthy
  else if (ruleOf40Score >= 25) multipleAdjustment = 0.7;   // Below
  else multipleAdjustment = 0.4;                            // Concerning

  const adjustedMultiple = bench.revenueMultiple.median * multipleAdjustment;
  const valuation = annualRevenue * adjustedMultiple;

  let grade;
  if (ruleOf40Score >= 60) grade = 'Elite';
  else if (ruleOf40Score >= 40) grade = 'Healthy';
  else if (ruleOf40Score >= 25) grade = 'Below Average';
  else grade = 'Concerning';

  return {
    method: 'Rule of 40',
    description: 'SaaS health metric: Revenue Growth % + Profit Margin % should exceed 40',
    industry: bench.name,
    inputs: {
      annualRevenue,
      revenueGrowthRate: `${growthPct.toFixed(1)}%`,
      profitMargin: `${marginPct.toFixed(1)}%`,
    },
    ruleOf40Score: round(ruleOf40Score, 1),
    passes,
    grade,
    analysis: {
      growthContribution: round(growthPct, 1),
      profitContribution: round(marginPct, 1),
      benchmark: 40,
      delta: round(ruleOf40Score - 40, 1),
    },
    multipleAdjustment,
    baseMultiple: bench.revenueMultiple.median,
    adjustedMultiple: round(adjustedMultiple, 1),
    valuation: {
      low: round(valuation * 0.85),
      estimated: round(valuation),
      high: round(valuation * 1.2),
    },
    recommendations: generateRuleOf40Recommendations(growthPct, marginPct, ruleOf40Score),
    confidence: computeConfidence(3, 'rule_of_40'),
  };
}

// ─── 7. Comprehensive (All Methods) ─────────────────────────────────────────

function comprehensive(params) {
  const { annualRevenue, industry, growthRate, profitMargin, grossMargin, netRetention, ebitda, stage, region, scores, berkusScores } = params;

  const results = [];
  const errors = [];

  // 1. Revenue Multiple
  if (annualRevenue && industry) {
    try {
      results.push(revenueMultiple({ annualRevenue, industry, growthRate, grossMargin, netRetention }));
    } catch (e) { errors.push({ method: 'Revenue Multiple', error: e.message }); }
  }

  // 2. DCF
  if (annualRevenue && growthRate && profitMargin) {
    try {
      results.push(dcf({ currentRevenue: annualRevenue, growthRates: growthRate, profitMargin, industry }));
    } catch (e) { errors.push({ method: 'DCF', error: e.message }); }
  }

  // 3. Comparable Analysis
  if (annualRevenue && industry) {
    try {
      results.push(comparableAnalysis({ annualRevenue, ebitda, industry, stage, growthRate }));
    } catch (e) { errors.push({ method: 'Comparable Analysis', error: e.message }); }
  }

  // 4. Scorecard
  if (industry && scores) {
    try {
      results.push(scorecard({ industry, region, scores }));
    } catch (e) { errors.push({ method: 'Scorecard', error: e.message }); }
  }

  // 5. Berkus (pre-revenue)
  if (berkusScores) {
    try {
      results.push(berkus(berkusScores));
    } catch (e) { errors.push({ method: 'Berkus', error: e.message }); }
  }

  // 6. Rule of 40
  if (annualRevenue && growthRate !== undefined && profitMargin !== undefined) {
    try {
      results.push(ruleOf40({ annualRevenue, revenueGrowthRate: growthRate, profitMargin, industry }));
    } catch (e) { errors.push({ method: 'Rule of 40', error: e.message }); }
  }

  if (results.length === 0) {
    throw new ValuationError('Could not run any valuation method with the provided inputs. Provide at least annualRevenue and industry.');
  }

  // Aggregate
  const allEstimates = results.map(r => r.valuation.estimated);
  const allLows = results.map(r => r.valuation.low);
  const allHighs = results.map(r => r.valuation.high);

  const median = computeMedian(allEstimates);
  const mean = allEstimates.reduce((a, b) => a + b, 0) / allEstimates.length;

  return {
    method: 'Comprehensive Analysis',
    methodsRun: results.length,
    summary: {
      valuationRange: {
        low: round(Math.min(...allLows)),
        median: round(median),
        mean: round(mean),
        high: round(Math.max(...allHighs)),
      },
      recommendedValuation: round(median),
      spread: round(Math.max(...allHighs) - Math.min(...allLows)),
      spreadPct: `${(((Math.max(...allHighs) - Math.min(...allLows)) / median) * 100).toFixed(1)}%`,
    },
    methodResults: results.map(r => ({
      method: r.method,
      estimated: r.valuation.estimated,
      range: `${formatCurrency(r.valuation.low)} - ${formatCurrency(r.valuation.high)}`,
      confidence: r.confidence,
    })),
    detailedResults: results,
    errors: errors.length > 0 ? errors : undefined,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

class ValuationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValuationError';
    this.statusCode = 400;
  }
}

function round(n, decimals = 0) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function clampScore(score) {
  if (score === undefined || score === null) return 0;
  return Math.max(0, Math.min(1, score));
}

function getStageMultiplier(stage) {
  const multipliers = {
    'pre-seed': 0.5,
    seed: 0.7,
    'series-a': 1.0,
    'series-b': 1.15,
    'series-c': 1.25,
    'growth': 1.3,
    'pre-ipo': 1.4,
  };
  if (!stage) return 1.0;
  return multipliers[stage.toLowerCase()] || 1.0;
}

function computeMedian(arr) {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function computeConfidence(dataPoints, method) {
  const base = { revenue_multiple: 0.7, dcf: 0.65, comparable: 0.7, scorecard: 0.6, berkus: 0.5, rule_of_40: 0.75 };
  const b = base[method] || 0.6;
  const bonus = Math.min(dataPoints * 0.05, 0.25);
  const confidence = Math.min(b + bonus, 0.95);
  return `${(confidence * 100).toFixed(0)}%`;
}

function formatCurrency(n) {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function generateRuleOf40Recommendations(growth, margin, score) {
  const recs = [];
  if (score < 40) {
    if (growth < 25) recs.push('Prioritize revenue growth — current growth rate is below SaaS benchmarks');
    if (margin < 10) recs.push('Improve unit economics and path to profitability');
    recs.push(`Need to improve combined score by ${(40 - score).toFixed(1)} points to reach Rule of 40 threshold`);
  } else {
    recs.push('Passing Rule of 40 — company demonstrates balanced growth and efficiency');
    if (growth > 50) recs.push('Exceptional growth — consider investing more in expansion while maintaining efficiency');
    if (margin > 20) recs.push('Strong margins — evaluate opportunities to reinvest in growth');
  }
  return recs;
}

module.exports = {
  revenueMultiple,
  dcf,
  comparableAnalysis,
  scorecard,
  berkus,
  ruleOf40,
  comprehensive,
  ValuationError,
};
