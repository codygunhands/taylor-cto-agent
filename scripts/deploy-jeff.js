/**
 * Deploy Jeff AI Agent to DigitalOcean
 * Sets up Gradient AI and deploys the app
 */

const axios = require('axios');
const { execSync } = require('child_process');
require('dotenv').config();

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';

async function setupGradientAI() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 SETTING UP GRADIENT AI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 Gradient AI Setup Instructions:');
  console.log('');
  console.log('1. Go to: https://cloud.digitalocean.com/gradient');
  console.log('2. Create a model access key');
  console.log('3. Note your model name (e.g., llama2-7b-chat)');
  console.log('4. Set environment variables:');
  console.log('   export GRADIENT_API_KEY=your_key_here');
  console.log('   export GRADIENT_MODEL=your_model_name');
  console.log('');
  console.log('⚠️  Gradient AI Platform is in beta - you may need to request access first.\n');
}

async function deployApp() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 DEPLOYING JEFF AI AGENT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check if doctl is installed
    try {
      execSync('which doctl', { stdio: 'ignore' });
    } catch {
      console.log('❌ doctl CLI not found. Install it:');
      console.log('   brew install doctl');
      console.log('   doctl auth init\n');
      return;
    }

    // Check if authenticated
    try {
      execSync('doctl auth list', { stdio: 'ignore' });
    } catch {
      console.log('❌ doctl not authenticated. Run:');
      console.log('   doctl auth init\n');
      return;
    }

    console.log('📦 Creating DigitalOcean App from app.yaml...\n');
    
    const appYamlPath = require('path').join(__dirname, '..', '.do', 'app.yaml');
    const output = execSync(`doctl apps create --spec ${appYamlPath}`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log(output);

    // Extract app ID from output
    const appIdMatch = output.match(/ID:\s+([a-f0-9-]+)/i);
    if (appIdMatch) {
      const appId = appIdMatch[1];
      console.log(`\n✅ App created! ID: ${appId}`);
      console.log(`\n📋 Next steps:`);
      console.log(`1. Go to: https://cloud.digitalocean.com/apps/${appId}`);
      console.log(`2. Set environment variables:`);
      console.log(`   - GRADIENT_API_KEY`);
      console.log(`   - GRADIENT_MODEL`);
      console.log(`   - API_KEY (generate a secure random key)`);
      console.log(`   - INTERNAL_API_KEY (can be same as API_KEY)`);
      console.log(`3. Wait for deployment to complete`);
      console.log(`4. Run migrations: npm run prisma:migrate deploy\n`);
    }

  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    console.log('\n💡 Manual deployment:');
    console.log('   doctl apps create --spec .do/app.yaml\n');
  }
}

async function generateAPIKey() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

async function main() {
  await setupGradientAI();
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Generate API keys
  const apiKey = await generateAPIKey();
  const internalKey = apiKey; // Can be same
  
  console.log('🔑 Generated API Keys (save these):');
  console.log(`   API_KEY: ${apiKey}`);
  console.log(`   INTERNAL_API_KEY: ${internalKey}\n`);
  
  await deployApp();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { setupGradientAI, deployApp, generateAPIKey };

