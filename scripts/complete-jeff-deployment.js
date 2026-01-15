/**
 * Complete Jeff deployment - Try all approaches
 */

const axios = require('axios');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

async function completeDeployment() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 COMPLETING JEFF DEPLOYMENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Get current app
    const appResponse = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    const app = appResponse.data.app;
    const spec = JSON.parse(JSON.stringify(app.spec));

    console.log('Current Status:');
    console.log(`  Services: ${spec.services.length}`);
    console.log(`  Databases: ${spec.databases.length}`);
    console.log(`  Has GRADIENT_API_KEY: ${spec.services[0].envs.some(e => e.key === 'GRADIENT_API_KEY')}`);
    console.log(`  Has GRADIENT_MODEL: ${spec.services[0].envs.some(e => e.key === 'GRADIENT_MODEL')}\n`);

    // Try approach: Use workers array if it exists, otherwise add to services
    if (!spec.services.some(s => s.name === 'worker')) {
      console.log('📦 Attempting to add worker service...\n');
      
      // Try with workers array (if supported)
      if (!spec.workers) {
        spec.workers = [];
      }
      
      spec.workers.push({
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

      // Remove ingress to avoid validation issues
      delete spec.ingress;

      try {
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
        console.log('✅ Worker added via workers array!\n');
      } catch (error) {
        console.log('⚠️  Workers array approach failed, trying services array...\n');
        
        // Fallback: Add to services
        delete spec.workers;
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

        delete spec.ingress;

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
        console.log('✅ Worker added via services array!\n');
      }
    } else {
      console.log('✅ Worker service already exists!\n');
    }

    // Check Redis
    const hasRedis = spec.databases.some(d => d.engine === 'REDIS');
    if (!hasRedis) {
      console.log('📦 Adding Redis database...\n');
      
      // First, check if we have a Redis cluster
      const dbResponse = await axios.get(`${DO_API_BASE}/databases`, {
        headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
      });
      
      const redisClusters = dbResponse.data.databases.filter(d => d.engine === 'redis');
      let redisClusterId = null;
      
      if (redisClusters.length > 0) {
        redisClusterId = redisClusters[0].id;
        console.log(`✅ Found existing Redis cluster: ${redisClusters[0].name}\n`);
      } else {
        console.log('📦 Creating Redis cluster...\n');
        // Create Redis cluster
        const createRedisResponse = await axios.post(
          `${DO_API_BASE}/databases`,
          {
            name: 'jeff-redis',
            engine: 'redis',
            version: '7',
            region: 'nyc1',
            size: 'db-s-1vcpu-1gb',
            num_nodes: 1,
          },
          {
            headers: {
              'Authorization': `Bearer ${DO_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        redisClusterId = createRedisResponse.data.database.id;
        console.log(`✅ Redis cluster created: ${redisClusterId}\n`);
      }

      // Add Redis to app spec
      spec.databases.push({
        name: 'redis',
        engine: 'REDIS',
        version: '7',
        production: true,
        cluster_name: redisClusterId,
      });

      delete spec.ingress;

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

      console.log('✅ Redis database added!\n');
    } else {
      console.log('✅ Redis database already exists!\n');
    }

    // Final status
    const finalApp = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
    });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DEPLOYMENT COMPLETE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`App ID: ${APP_ID}`);
    console.log(`Dashboard: https://cloud.digitalocean.com/apps/${APP_ID}`);
    console.log(`Live URL: ${finalApp.data.app.live_url || 'Pending deployment...'}\n`);
    console.log(`Services: ${finalApp.data.app.spec.services.length}`);
    console.log(`Databases: ${finalApp.data.app.spec.databases.length}\n`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    }
  }
}

completeDeployment();

