/**
 * Deploy Jeff AI Agent to DigitalOcean via API (Fixed)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const yaml = require('js-yaml');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';

function generateAPIKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function deployViaAPI() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 DEPLOYING JEFF AI AGENT TO DIGITALOCEAN');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Read and parse app.yaml
    const appYamlPath = path.join(__dirname, '..', '.do', 'app.yaml');
    const appYamlContent = fs.readFileSync(appYamlPath, 'utf-8');
    
    // Parse YAML to JSON
    let appSpec;
    try {
      appSpec = yaml.load(appYamlContent);
    } catch (yamlError) {
      // If yaml parsing fails, use manual structure
      console.log('⚠️  Could not parse YAML, using manual structure...\n');
      appSpec = {
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
              { key: 'API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '${API_KEY}' },
              { key: 'INTERNAL_API_KEY', scope: 'RUN_TIME', type: 'SECRET', value: '${INTERNAL_API_KEY}' },
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
            },
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
    }

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

    // Generate API keys
    const apiKey = generateAPIKey();
    const internalKey = apiKey;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 NEXT STEPS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('1. Go to: https://cloud.digitalocean.com/apps/' + appId);
    console.log('2. Set environment variables:');
    console.log(`   - GRADIENT_API_KEY: (get from https://cloud.digitalocean.com/gradient)`);
    console.log(`   - GRADIENT_MODEL: (e.g., llama2-7b-chat)`);
    console.log(`   - API_KEY: ${apiKey}`);
    console.log(`   - INTERNAL_API_KEY: ${internalKey}`);
    console.log('');
    console.log('3. Wait for deployment to complete (2-3 minutes)');
    console.log('4. Run migrations after deployment:');
    console.log('   npm run prisma:migrate deploy');
    console.log('');
    console.log('📝 Save these API keys securely!\n');

    // Save keys to file
    const keysPath = path.join(__dirname, '..', 'JEFF_DEPLOYMENT_KEYS.json');
    fs.writeFileSync(keysPath, JSON.stringify({
      appId,
      apiKey,
      internalKey,
      createdAt: new Date().toISOString(),
      note: 'Keep these keys secure!',
    }, null, 2));
    console.log(`💾 Keys saved to: ${keysPath}\n`);

  } catch (error) {
    console.error('❌ Deployment error:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('\n⚠️  Authentication failed. Check your DO_API_TOKEN.');
    }
    if (error.response?.data?.message) {
      console.error('\n💡 Try deploying via dashboard:');
      console.error('   1. Go to: https://cloud.digitalocean.com/apps');
      console.error('   2. Click "Create App"');
      console.error('   3. Connect GitHub repo: codygunhands/jeff-ai-agent');
      console.error('   4. Use the app.yaml spec\n');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  deployViaAPI();
}

module.exports = { deployViaAPI };

