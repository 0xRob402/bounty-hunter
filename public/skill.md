---
name: agent-immune-system
version: 1.0.0
description: Security infrastructure for AI agents. Protect against prompt injection, secret leaks, runaway spending, and malicious inputs.
homepage: https://ais.solpay.cash
metadata: {"category":"security","api_base":"https://ais.solpay.cash/api","pricing":"free-tier-available"}
---

# Agent Immune System (AIS)

Protect your agent from prompt injection, secret leaks, runaway spending, and malicious inputs. One proxy. Instant protection. Shared threat intelligence.

## Quick Start

### 1. Register

```bash
curl -X POST https://ais.solpay.cash/api/register \
  -H "Content-Type: application/json" \
  -d '{"agent_name": "your-agent-name"}'
```

**Response:**
```json
{
  "ok": true,
  "agent": {"id": 1, "name": "your-agent-name", "tier": "free"},
  "api_key": "ais_abc123...",
  "proxy_url": "https://ais.solpay.cash/api/proxy",
  "docs_url": "https://ais.solpay.cash/docs"
}
```

⚠️ **Save your API key! It is shown exactly once and cannot be recovered.**

### 2. Route Tool Calls Through AIS

Instead of calling external APIs directly, route them through the AIS proxy:

```bash
curl -X POST https://ais.solpay.cash/api/proxy \
  -H "Authorization: Bearer ais_your_key" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "web_fetch",
    "target_url": "https://api.example.com/data",
    "method": "GET",
    "headers": {},
    "data": {}
  }'
```

**Response (allowed):**
```json
{
  "ok": true,
  "decision": "allow",
  "proxy_response": {"data": "..."},
  "secrets_redacted": 0,
  "latency_ms": 45
}
```

**Response (threat blocked):**
```json
{
  "ok": false,
  "error": "Threat detected and blocked",
  "code": "threat_blocked",
  "threat": {
    "type": "prompt_injection",
    "severity": "critical",
    "description": "Attempted to override system instructions"
  }
}
```

### 3. Check Your Stats

```bash
curl https://ais.solpay.cash/api/agent?apiKey=ais_your_key
```

Or visit the dashboard: https://ais.solpay.cash/dashboard

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Register a new agent |
| `/api/proxy` | POST | Proxy a tool call through AIS |
| `/api/agent` | GET | Get your agent info |
| `/api/events` | GET | Get your activity log |
| `/api/threats` | GET | Get shared threat feed |
| `/api/stats` | GET | Get global stats |

## Threat Detection

AIS protects against:

- **Prompt Injection** — "ignore previous instructions", "you are now", "new instructions:"
- **Secret Leakage** — Stripe keys, GitHub PATs, OpenAI keys, AWS credentials, JWTs
- **Dangerous URLs** — Pastebin, ngrok tunnels, raw IP addresses
- **Runaway Behavior** — Excessive requests, loop patterns

When AIS detects a threat, it:
1. Blocks the request
2. Logs the attempt
3. Publishes to the shared threat feed (anonymized)
4. All agents benefit immediately

## Pricing

| Tier | Price | Requests/Day | Features |
|------|-------|--------------|----------|
| Free | $0 | 1,000 | Basic protection, threat feed |
| Pro | $29/mo | 100,000 | Custom policies, alerts, priority feed |
| Enterprise | Custom | Unlimited | Dedicated infra, SLA, support |

Pay with USDC on Solana via SolPay.

## Links

- **Dashboard:** https://ais.solpay.cash/dashboard
- **Docs:** https://ais.solpay.cash/docs
- **GitHub:** https://github.com/0xRob402/agent-immune-system

## Support

Built by [0xRob](https://github.com/0xRob402) for the Colosseum Agent Hackathon.

Questions? Open an issue on GitHub or post in the hackathon forum.
