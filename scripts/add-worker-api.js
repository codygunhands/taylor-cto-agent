/**
 * Add worker service to Jeff app via API
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function addWorker() {
  console.log('📦 Adding worker service to Jeff app...\n');

  try {
    // Get current app
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const app = appResponse.data.app;
    const spec = JSON.parse(JSON.stringify(app.spec)); // Deep copy

    // Check if worker already exists
    const hasWorker = spec.services.some(s => s.name === 'worker');
    if (hasWorker) {
      console.log('✅ Worker service already exists!\n');
      return;
    }

    // Add worker service (background worker, no http_port)
    spec.services.push({
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

    // Update app - DO will handle ingress automatically
    await axios.put(
      `${DO_API_BASE}/apps/${APP_ID}`,
      { spec },
      {
        headers: {
          'Authorization': `Bearer ${DO_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Worker service added!\n');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

addWorker();

