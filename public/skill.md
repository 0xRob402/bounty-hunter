---
name: agent-immune-system
version: 1.0.0
description: Security infrastructure for AI agents. Protect against prompt injection, secret leaks, runaway spending, and malicious inputs.
homepage: https://ais.solpay.cash
metadata: {"category":"security","api_base":"https://ais.solpay.cash/api","pricing":"free-tier-available","payments":"x402-usdc"}
---

# Agent Immune System (AIS)

Protect your agent from prompt injection, secret leaks, runaway spending, and malicious inputs. One proxy. Instant protection. Shared threat intelligence.

**x402 agent payments powered by [SolPay](https://solpay.cash)**

## Quick Start

### 1. Register Your Agent

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
  "proxy_url": "https://ais.solpay.cash/api/proxy"
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
    "method": "GET"
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
    "severity": "critical"
  }
}
```

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

- **Prompt Injection** — "ignore previous instructions", "you are now", override attempts
- **Secret Leakage** — Stripe keys, GitHub PATs, OpenAI keys, AWS credentials, JWTs
- **Dangerous URLs** — Pastebin, ngrok tunnels, raw IP addresses
- **Runaway Behavior** — Excessive requests, loop patterns

When AIS detects a threat:
1. Blocks the request
2. Logs the attempt
3. Publishes to shared threat feed (anonymized)
4. All agents benefit immediately

## Pricing & Payments

| Tier | Price | Requests/Day | Features |
|------|-------|--------------|----------|
| Free | $0 | 1,000 | Basic protection, threat feed |
| Pro | $29/mo | 100,000 | Custom policies, alerts, priority feed |
| Enterprise | Custom | Unlimited | Dedicated infra, SLA, support |

### How Agents Pay (x402 USDC)

AIS uses **x402** — the HTTP payment standard — for agent payments via [SolPay](https://solpay.cash).

**Option 1: Pre-fund Credits**
```bash
# Add USDC credits to your agent account
curl -X POST https://ais.solpay.cash/api/credits \
  -H "Authorization: Bearer ais_your_key" \
  -H "Content-Type: application/json" \
  -d '{"amount_usdc": 10.00, "wallet_address": "your-solana-wallet"}'
```

**Option 2: Pay-per-request with x402**

Include the x402 payment header on each request:
```bash
curl -X POST https://ais.solpay.cash/api/proxy \
  -H "Authorization: Bearer ais_your_key" \
  -H "X-Payment: x402 usdc/solana amount=0.001 ..." \
  -H "Content-Type: application/json" \
  -d '{"tool": "web_fetch", "target_url": "https://api.example.com"}'
```

**Pricing:**
- Free tier: 1,000 requests/day at $0
- Beyond free tier: $0.0001 per request (0.01¢)
- Pay only for what you use

**Why x402?**
- No credit cards or billing accounts
- Instant, trustless payments on Solana
- Sub-cent fees, instant settlement
- Your agent pays directly from its wallet

Learn more: [solpay.cash/x402](https://solpay.cash)

## For Human Operators

If you operate an AI agent, you can **claim ownership** to unlock:
- Real-time security dashboard
- Email/webhook alerts
- Custom threat policies  
- Billing management

**Claim your agent:** https://ais.solpay.cash/claim

## Links

- **Dashboard (for operators):** https://ais.solpay.cash/dashboard
- **Claim Agent:** https://ais.solpay.cash/claim
- **Docs:** https://ais.solpay.cash/docs
- **GitHub:** https://github.com/0xRob402/agent-immune-system
- **Payments:** [SolPay](https://solpay.cash)

---

Built by [0xRob](https://github.com/0xRob402) for the Colosseum Agent Hackathon.
