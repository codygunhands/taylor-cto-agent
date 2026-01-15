/**
 * Deploy Jeff - Simplified approach
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';

async function deploy() {
  console.log('🚀 Deploying Jeff AI Agent...\n');

  // Read app.yaml and convert to JSON
  const yamlPath = path.join(__dirname, '..', '.do', 'app.yaml');
  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
  
  // Simple YAML to JSON conversion for our specific file
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
          { key: 'DATABASE_URL', scope: 'RUN_TIME', type: 'SECRET', value: '${db.DATABASE_URL}' },
          { key: 'REDIS_URL', scope: 'RUN_TIME', type: 'SECRET', value: '${redis.REDIS_URL}' },
          { key: 'GRADIENT_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_API_KEY}' },
          { key: 'GRADIENT_BASE_URL', scope: 'RUN_TIME', value: 'https://api.gradient.ai/api/v1' },
          { key: 'GRADIENT_MODEL', scope: 'RUN_TIME', type: 'SECRET', value: '${GRADIENT_MODEL}' },
          { key: 'API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '485cabb25244073a3c877e2ee7459ea50ecf2de9f86ffa0e8f455d3935f22417' },
          { key: 'INTERNAL_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '485cabb25244073a3c877e2ee7459ea50ecf2de9f86ffa0e8f455d3935f22417' },
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
    const response = await axios.post(
      `${DO_API_BASE}/apps`,
      { spec },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const appId = response.data.app.id;
    console.log(`✅ App created! ID: ${appId}`);
    console.log(`   Dashboard: https://cloud.digitalocean.com/apps/${appId}\n`);
    console.log('⚠️  Set these environment variables in the dashboard:');
    console.log('   - GRADIENT_API_KEY');
    console.log('   - GRADIENT_MODEL\n');

    return appId;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    // Try alternative: use dashboard link
    console.log('\n💡 Alternative: Deploy via dashboard:');
    console.log('   1. Go to: https://cloud.digitalocean.com/apps');
    console.log('   2. Click "Create App"');
    console.log('   3. Connect GitHub: codygunhands/jeff-ai-agent');
    console.log('   4. Use app.yaml spec\n');
    
    throw error;
  }
}

deploy().catch(() => process.exit(1));

