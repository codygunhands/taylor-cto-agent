# Jeff - AI Customer Success & Marketing Agent

Jeff is an AI agent service built exclusively on DigitalOcean-native services. He operates in two modes:

1. **OPERATOR mode** (customer-facing): Handles sales, onboarding, and support with strict guardrails
2. **MARKETING mode** (internal-only): Creates marketing drafts and analysis

## Architecture

- **API**: Fastify server handling agent requests
- **Worker**: BullMQ workers for background jobs
- **Database**: PostgreSQL (Prisma ORM)
- **Queue**: Redis (BullMQ)
- **LLM**: DigitalOcean Gradient AI Platform (serverless inference)

## Tech Stack

- Node.js 20
- TypeScript
- Fastify (API framework)
- Prisma (ORM)
- BullMQ (job queue)
- Zod (validation)
- Pino (logging)

## Local Development

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- DigitalOcean Gradient API key

### Setup

1. **Clone and install**:
```bash
git clone <repo-url>
cd jeff-ai-agent
npm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your values
```

Required environment variables:
- `GRADIENT_API_KEY`: Your DigitalOcean Gradient API key
- `GRADIENT_MODEL`: Model name (e.g., "llama2-7b-chat")
- `API_KEY`: Internal API key for protected endpoints
- `INTERNAL_API_KEY`: Internal API key (can be same as API_KEY)

3. **Start local services**:
```bash
docker-compose up -d postgres redis
```

4. **Run migrations**:
```bash
npm run prisma:generate
npm run prisma:migrate
```

5. **Start development server**:
```bash
npm run dev
```

6. **Start worker** (in separate terminal):
```bash
npm run worker
```

## API Endpoints

### Public Endpoints

#### POST /v1/agent
Process an agent request.

**Request**:
```json
{
  "sessionId": "uuid",
  "mode": "operator" | "marketing",
  "channel": "sales" | "onboarding" | "support" | "marketing",
  "message": "User message",
  "metadata": {}
}
```

**Response**:
```json
{
  "reply": "Agent response",
  "actions": [
    {
      "type": "action_type",
      "payload": {}
    }
  ],
  "confidence": 0.8,
  "citations": [
    {
      "doc": "filename.md",
      "anchor": "heading-anchor"
    }
  ]
}
```

#### GET /healthz
Health check endpoint.

### Internal Endpoints (require X-API-Key header)

#### POST /internal/v1/leads
Create a lead.

#### PATCH /internal/v1/leads/:id
Update lead status.

#### POST /internal/v1/tickets
Create a support ticket.

#### GET /internal/v1/sessions/:id/audit
Get audit logs for a session.

## Example Usage

### Operator Mode - Sales

```bash
curl -X POST http://localhost:3000/v1/agent \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "mode": "operator",
    "channel": "sales",
    "message": "I need a custom integration with our ERP system"
  }'
```

Expected: Refusal template response (no customization allowed)

### Operator Mode - Customization Request

```bash
curl -X POST http://localhost:3000/v1/agent \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "mode": "operator",
    "channel": "sales",
    "message": "Can you customize the platform for our industry?"
  }'
```

Expected: Hard refusal with template response

### Marketing Mode - Landing Page Draft

```bash
curl -X POST http://localhost:3000/v1/agent \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-internal-api-key" \
  -d '{
    "sessionId": "123e4567-e89b-12d3-a456-426614174000",
    "mode": "marketing",
    "channel": "marketing",
    "message": "Create a landing page draft for ShopLink free tier launch"
  }'
```

Expected: Content draft with claims checklist

## DigitalOcean Deployment

### Prerequisites

1. DigitalOcean account
2. `doctl` CLI installed and authenticated
3. GitHub repository created
4. Gradient AI Platform access

### Setup Gradient AI

1. Go to DigitalOcean → Gradient AI Platform
2. Create a model access key
3. Note your model name (e.g., "llama2-7b-chat")

### Deploy

1. **Update app.yaml**:
   - Replace `YOUR_GITHUB_USERNAME` with your GitHub username
   - Update repository name if different

2. **Create app**:
```bash
doctl apps create --spec .do/app.yaml
```

3. **Set environment variables** in DigitalOcean dashboard:
   - `GRADIENT_API_KEY`: Your Gradient API key
   - `GRADIENT_MODEL`: Your model name
   - `API_KEY`: Generate a secure random key
   - `INTERNAL_API_KEY`: Can be same as API_KEY

4. **Attach databases**:
   - The app.yaml references `${db.DATABASE_URL}` and `${redis.REDIS_URL}`
   - DigitalOcean will create these automatically, or you can attach existing ones

5. **Run migrations**:
   - Connect to your database
   - Run: `npm run prisma:migrate deploy`

### Update App

```bash
doctl apps update <app-id> --spec .do/app.yaml
```

## Configuration Files

### config/pricing.json
Source of truth for all pricing. OPERATOR mode must quote only from this file.

### config/policy.operator.json
Policy for operator mode - strict rules, no customization.

### config/policy.marketing.json
Policy for marketing mode - internal-only, drafts only.

### kb/*.md
Knowledge base documents. Versioned and cited in responses.

## Guardrails

### Pre-LLM
- Checks for customization/roadmap/timeline requests
- Blocks and returns template responses if detected
- Loads appropriate policy and KB

### Post-LLM
- Scans for banned phrases
- Validates pricing claims against pricing.json
- Strips invalid content
- Logs violations

### Action Validation
- Only allows actions from policy allowlist
- Validates action payloads with Zod schemas
- Drops invalid actions

## Worker Jobs

- `lead_scoring`: Rules-based lead qualification
- `ticket_enrichment`: Summarizes conversations, suggests repro steps
- `followup_draft`: Creates follow-up email drafts (operator only)
- `marketing_batch`: Creates content calendars or multi-asset batches

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check database is accessible from app
- Run `npm run prisma:studio` to inspect database

### Redis Connection Issues
- Verify `REDIS_URL` is set correctly
- Check Redis is accessible
- Test with `redis-cli ping`

### Gradient API Issues
- Verify `GRADIENT_API_KEY` is correct
- Check `GRADIENT_MODEL` matches available models
- Verify API endpoint is correct
- Check rate limits

### Mode Enforcement
- Marketing mode requires `X-API-Key` header
- Check `INTERNAL_API_KEY` matches header value
- Verify mode is set correctly in request

## Security

- Rate limiting: 60 requests/minute per IP
- API key required for internal endpoints
- Marketing mode requires internal API key
- All actions validated before execution
- Audit logs for all agent interactions

## License

MIT
