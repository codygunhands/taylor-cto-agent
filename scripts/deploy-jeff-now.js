/**
 * Deploy Jeff AI Agent to DigitalOcean - Complete Setup
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
  console.log('🚀 DEPLOYING JEFF AI AGENT TO DIGITALOCEAN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const apiKey = generateAPIKey();
  const internalKey = apiKey;

  const appSpec = {
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
      {
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
      },
    ],
    databases: [
      {
        name: 'db',
        engine: 'PG',
        version: '15',
        production: false,
        cluster_name: 'jeff-db',
        db_name: 'jeff_prod',
        db_user: 'jeff_user',
      },
      {
        name: 'redis',
        engine: 'REDIS',
        version: '7',
        production: false,
        cluster_name: 'jeff-redis',
      },
    ],
  };

  try {
    console.log('📦 Creating DigitalOcean App...\n');

    const response = await axios.post(
      `${DO_API_BASE}/apps`,
      { spec: appSpec },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const app = response.data.app;
    const appId = app.id;

    console.log('✅ App created successfully!');
    console.log(`   App ID: ${appId}`);
    console.log(`   URL: https://cloud.digitalocean.com/apps/${appId}\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 DEPLOYMENT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🔑 Generated API Keys (already set in app):');
    console.log(`   API_KEY: ${apiKey}`);
    console.log(`   INTERNAL_API_KEY: ${internalKey}\n`);
    console.log('⚠️  IMPORTANT: You still need to set:');
    console.log('   1. GRADIENT_API_KEY - Get from https://cloud.digitalocean.com/gradient');
    console.log('   2. GRADIENT_MODEL - Your model name (e.g., llama2-7b-chat)\n');
    console.log('📝 To set these:');
    console.log(`   1. Go to: https://cloud.digitalocean.com/apps/${appId}`);
    console.log('   2. Click "Settings" → "App-Level Environment Variables"');
    console.log('   3. Add GRADIENT_API_KEY and GRADIENT_MODEL');
    console.log('   4. Save and wait for redeployment\n');
    console.log('⏳ Deployment will start automatically...');
    console.log('   Check status: https://cloud.digitalocean.com/apps/' + appId + '\n');

    return { appId, apiKey, internalKey };

  } catch (error) {
    console.error('❌ Deployment error:', error.response?.data || error.message);
    if (error.response?.data?.message) {
      console.error('\nError details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

if (require.main === module) {
  deployJeff()
    .then(({ appId, apiKey, internalKey }) => {
      const fs = require('fs');
      const path = require('path');
      const keysPath = path.join(__dirname, '..', 'JEFF_DEPLOYMENT_KEYS.json');
      fs.writeFileSync(keysPath, JSON.stringify({
        appId,
        apiKey,
        internalKey,
        createdAt: new Date().toISOString(),
        note: 'Keep these keys secure!',
      }, null, 2));
      console.log(`💾 Keys saved to: ${keysPath}\n`);
    })
    .catch(error => {
      console.error('\n❌ Deployment failed');
      process.exit(1);
    });
}

module.exports = { deployJeff };

