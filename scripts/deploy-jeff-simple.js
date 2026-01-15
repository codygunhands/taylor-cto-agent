/**
 * Deploy Jeff - Create app, then add databases
 */

const axios = require('axios');
const crypto = require('crypto');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';

function generateAPIKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function deployJeff() {
  console.log('🚀 Deploying Jeff AI Agent...\n');

  const apiKey = generateAPIKey();

  // Step 1: Create app with just API service (no databases)
  const spec = {
    name: 'jeff-ai-agent',
    region: 'nyc',
    services: [
      {
        name: 'api',
        github: {
          repo: 'codygunhands/jeff-ai-agent',
          branch: 'main',
          deploy_on_push: true,
        },
        dockerfile_path: 'Dockerfile.api',
        http_port: 3000,
        instance_count: 1,
        instance_size_slug: 'basic-xxs',
        envs: [
          { key: 'GRADIENT_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_API_KEY}' },
          { key: 'GRADIENT_BASE_URL', scope: 'RUN_TIME', value: 'https://api.gradient.ai/api/v1' },
          { key: 'GRADIENT_MODEL', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_MODEL}' },
          { key: 'API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: apiKey },
          { key: 'INTERNAL_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: apiKey },
          { key: 'PORT', scope: 'RUN_TIME', value: '3000' },
          { key: 'HOST', scope: 'RUN_TIME', value: '0.0.0.0' },
          { key: 'LOG_LEVEL', scope: 'RUN_TIME', value: 'info' },
          { key: 'NODE_ENV', scope: 'RUN_TIME', value: 'production' },
        ],
        health_check: {
          http_path: '/healthz',
          initial_delay_seconds: 30,
          period_seconds: 10,
          timeout_seconds: 5,
          success_threshold: 1,
          failure_threshold: 3,
        },
      },
    ],
  };

  try {
    console.log('📦 Creating app...');
    const createResponse = await axios.post(
      `${DO_API_BASE}/apps`,
      { spec },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const appId = createResponse.data.app.id;
    console.log(`✅ App created! ID: ${appId}\n`);

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Get app and add worker + databases
    console.log('📦 Adding worker and databases...');
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${appId}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const currentSpec = appResponse.data.app.spec;

    // Add worker
    currentSpec.services.push({
      name: 'worker',
      github: {
        repo: 'codygunhands/jeff-ai-agent',
        branch: 'main',
        deploy_on_push: true,
      },
      dockerfile_path: 'Dockerfile.worker',
      instance_count: 1,
      instance_size_slug: 'basic-xxs',
      envs: [
        { key: 'GRADIENT_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_API_KEY}' },
        { key: 'GRADIENT_BASE_URL', scope: 'RUN_TIME', value: 'https://api.gradient.ai/api/v1' },
        { key: 'GRADIENT_MODEL', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_MODEL}' },
        { key: 'LOG_LEVEL', scope: 'RUN_TIME', value: 'info' },
        { key: 'NODE_ENV', scope: 'RUN_TIME', value: 'production' },
      ],
    });

    // Add databases - let App Platform create them
    currentSpec.databases = [
      {
        name: 'db',
        engine: 'PG',
        version: '15',
        production: false,
      },
    ];

    // Update app
    await axios.put(
      `${DO_API_BASE}/apps/${appId}`,
      { spec: currentSpec },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Worker and database added!\n');

    // Wait and add Redis separately
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const appResponse2 = await axios.get(`${DO_API_BASE}/apps/${appId}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const spec2 = appResponse2.data.app.spec;
    spec2.databases.push({
      name: 'redis',
      engine: 'REDIS',
      version: '7',
      production: true,
      cluster_name: 'jeff-redis-cluster',
    });

    await axios.put(
      `${DO_API_BASE}/apps/${appId}`,
      { spec: spec2 },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Redis added!\n');

    const final = await axios.get(`${DO_API_BASE}/apps/${appId}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPLOYMENT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${appId}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${appId}`);
    console.log(`Live URL: ${final.data.app.live_url || 'Pending...'}\n`);
    console.log(`API Key: ${apiKey}\n`);
    console.log('⚠️  Set GRADIENT_API_KEY and GRADIENT_MODEL in dashboard\n');

    return { appId, apiKey };

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

deployJeff().catch(() => process.exit(1));

