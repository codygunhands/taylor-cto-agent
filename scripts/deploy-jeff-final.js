/**
 * Deploy Jeff - Create app then add worker
 */

const axios = require('axios');
const crypto = require('crypto');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';

function generateAPIKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function deployJeff() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 DEPLOYING JEFF AI AGENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const apiKey = generateAPIKey();
  const internalKey = apiKey;

  // Create app with API service and databases first
  const initialSpec = {
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
          { key: 'DATABASE_URL', scope: 'RUN_TIME', type: 'SECRET', value: '${db.DATABASE_URL}' },
          { key: 'REDIS_URL', scope: 'RUN_TIME', type: 'SECRET', value: '${redis.REDIS_URL}' },
          { key: 'GRADIENT_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_API_KEY}' },
          { key: 'GRADIENT_BASE_URL', scope: 'RUN_TIME', value: 'https://api.gradient.ai/api/v1' },
          { key: 'GRADIENT_MODEL', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_MODEL}' },
          { key: 'API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: apiKey },
          { key: 'INTERNAL_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: internalKey },
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
    databases: [
      {
        name: 'db',
        engine: 'PG',
        version: '15',
        production: false,
      },
      {
        name: 'redis',
        engine: 'REDIS',
        version: '7',
        production: false,
      },
    ],
  };

  try {
    console.log('📦 Step 1: Creating app with API service...\n');

    const createResponse = await axios.post(
      `${DO_API_BASE}/apps`,
      { spec: initialSpec },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const appId = createResponse.data.app.id;
    console.log(`✅ App created! ID: ${appId}\n`);

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get current app spec
    console.log('📦 Step 2: Adding worker service...\n');
    const appResponse = await axios.get(
      `${DO_API_BASE}/apps/${appId}`,
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
        },
      }
    );

    const currentSpec = appResponse.data.app.spec;

    // Add worker service
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
        { key: 'DATABASE_URL', scope: 'RUN_TIME', type: 'SECRET', value: '${db.DATABASE_URL}' },
        { key: 'REDIS_URL', scope: 'RUN_TIME', type: 'SECRET', value: '${redis.REDIS_URL}' },
        { key: 'GRADIENT_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_API_KEY}' },
        { key: 'GRADIENT_BASE_URL', scope: 'RUN_TIME', value: 'https://api.gradient.ai/api/v1' },
        { key: 'GRADIENT_MODEL', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_MODEL}' },
        { key: 'LOG_LEVEL', scope: 'RUN_TIME', value: 'info' },
        { key: 'NODE_ENV', scope: 'RUN_TIME', value: 'production' },
      ],
    });

    // Update app with worker
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

    console.log('✅ Worker service added!\n');

    // Get final status
    const finalApp = await axios.get(
      `${DO_API_BASE}/apps/${appId}`,
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
        },
      }
    );

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPLOYMENT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${appId}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${appId}`);
    console.log(`Live URL: ${finalApp.data.app.live_url || 'Pending deployment...'}\n`);

    console.log('🔑 Generated API Keys:');
    console.log(`   API_KEY: ${apiKey}`);
    console.log(`   INTERNAL_API_KEY: ${internalKey}\n`);

    console.log('⚠️  Set these environment variables:');
    console.log('   1. GRADIENT_API_KEY - https://cloud.digitalocean.com/gradient');
    console.log('   2. GRADIENT_MODEL - (e.g., llama2-7b-chat)\n');
    console.log(`   Go to: https://cloud.digitalocean.com/apps/${appId}/settings\n`);

    // Save keys
    const fs = require('fs');
    const path = require('path');
    const keysPath = path.join(__dirname, '..', 'JEFF_DEPLOYMENT_KEYS.json');
    fs.writeFileSync(keysPath, JSON.stringify({
      appId,
      apiKey,
      internalKey,
      liveUrl: finalApp.data.app.live_url,
      createdAt: new Date().toISOString(),
    }, null, 2));
    console.log(`💾 Keys saved to: ${keysPath}\n`);

    return { appId, apiKey, internalKey };

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('\nDetails:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

if (require.main === module) {
  deployJeff()
    .then(() => console.log('✅ Done!\n'))
    .catch(() => process.exit(1));
}

module.exports = { deployJeff };

