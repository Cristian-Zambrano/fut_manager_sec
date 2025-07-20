# FutManager Backend

Backend API for the FutManager application, deployed on Cloudflare Workers.

## Development

### Prerequisites
- Node.js 18+
- Wrangler CLI installed globally: `npm install -g wrangler`
- Cloudflare account with Workers enabled

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.dev.vars` file with your environment variables:
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Environment
ENVIRONMENT=development
```

3. Start development server:
```bash
npm run start:dev
```

The API will be available at `http://localhost:8787`

## Deployment

### Option 1: Using the deployment script (Recommended)
```bash
npm run deploy
```

This script will:
- Ask if you want to update secrets
- Deploy the worker to Cloudflare

### Option 2: Manual deployment

1. First, set up the secrets (only needed once or when secrets change):
```bash
npm run deploy:secrets
```

2. Deploy the worker:
```bash
npm run start:prod
```

### Environment Variables

The following environment variables are required:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (for admin operations)
- `ENVIRONMENT`: Set to "production" for deployed version

**Important**: Never commit `.dev.vars` to version control. Use Cloudflare Workers secrets for production.

## Scripts

- `npm run start:dev`: Start development server
- `npm run start:prod`: Deploy to production
- `npm run build`: Compile TypeScript
- `npm run deploy`: Complete deployment (with secrets)
- `npm run deploy:secrets`: Only update secrets
- `npm run lint`: Run ESLint
- `npm run type-check`: Check TypeScript types

## API Endpoints

- `POST /api/auth/register`: User registration
- `GET /api/teams`: Get teams
- `POST /api/teams`: Create team
- `PATCH /api/teams/:id/verify`: Verify team (admin only)
- `DELETE /api/teams/:id`: Delete team (admin only)
- `GET /api/players`: Get players
- `POST /api/players`: Create player
- `PATCH /api/players/:id/verify`: Verify player (admin only)
- `DELETE /api/players/:id`: Delete player (admin only)
- `GET /api/sanctions`: Get sanctions
- `POST /api/sanctions`: Create sanction
- `DELETE /api/sanctions/:id`: Delete sanction

## Security

All endpoints (except registration) require authentication via Bearer token in the Authorization header.

Role-based access control:
- **Admin**: Full access to all resources
- **Team Owner**: Can manage their own teams and players
- **Vocal**: Can create sanctions and view verified resources
