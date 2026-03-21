# Startup Valuation API

Premium startup & business valuation estimation API. Multiple methodologies for VCs, founders, and finance professionals.

**No public API exists for this.** This is a unique, premium product.

## Valuation Methods

| Method | Endpoint | Use Case |
|--------|----------|----------|
| Revenue Multiple | `POST /api/v1/revenue-multiple` | Revenue-stage startups with industry-specific multipliers |
| DCF | `POST /api/v1/dcf` | Detailed cash flow projection & present value |
| Comparable Analysis | `POST /api/v1/comparable` | Benchmark against industry peers |
| Scorecard | `POST /api/v1/scorecard` | Angel investor methodology (team, market, product) |
| Berkus | `POST /api/v1/berkus` | Pre-revenue startup valuation |
| Rule of 40 | `POST /api/v1/rule-of-40` | SaaS health check |
| Comprehensive | `POST /api/v1/comprehensive` | Run ALL methods, get blended range |

## Supported Industries

- **SaaS** — 8-15x ARR
- **Fintech** — 6-12x revenue
- **E-commerce** — 2-4x revenue
- **AI/ML** — 15-25x revenue
- **Healthcare** — 5-10x revenue
- **Marketplace** — 5-8x revenue
- **Gaming** — 3-6x revenue
- **Crypto/Web3** — 5-15x revenue

## Quick Start

```bash
npm install
npm start
# Server runs on http://localhost:5100
```

## Example: Revenue Multiple

```bash
curl -X POST http://localhost:5100/api/v1/revenue-multiple \
  -H "Content-Type: application/json" \
  -d '{
    "annualRevenue": 5000000,
    "industry": "saas",
    "growthRate": 0.8,
    "grossMargin": 0.82,
    "netRetention": 1.25
  }'
```

## Example: Comprehensive Valuation

```bash
curl -X POST http://localhost:5100/api/v1/comprehensive \
  -H "Content-Type: application/json" \
  -d '{
    "annualRevenue": 10000000,
    "industry": "ai_ml",
    "growthRate": 0.6,
    "profitMargin": 0.15,
    "grossMargin": 0.75,
    "ebitda": 1500000,
    "stage": "series-a",
    "scores": { "team": 1.5, "market": 1.8, "product": 1.3 }
  }'
```

## Example: Berkus (Pre-Revenue)

```bash
curl -X POST http://localhost:5100/api/v1/berkus \
  -H "Content-Type: application/json" \
  -d '{
    "soundIdea": 0.8,
    "prototype": 0.6,
    "qualityTeam": 0.9,
    "strategicRelationships": 0.4,
    "productRollout": 0.2
  }'
```

## Benchmarks

```bash
# Get industry benchmarks
curl http://localhost:5100/api/v1/benchmarks/saas

# List all industries
curl http://localhost:5100/api/v1/industries
```

## MCP Server

For LLM integration via Model Context Protocol:

```bash
node src/mcp-server.js
```

Add to your MCP config:

```json
{
  "mcpServers": {
    "startup-valuation": {
      "command": "node",
      "args": ["/path/to/startup-valuation-api/src/mcp-server.js"]
    }
  }
}
```

## Docker

```bash
docker build -t startup-valuation-api .
docker run -p 5100:5100 startup-valuation-api
```

## License

MIT
