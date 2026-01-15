#!/usr/bin/env node

/**
 * Wait for Jeff to deploy and update all URLs automatically
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const DO_API_TOKEN = process.env.DO_API_TOKEN || 'process.env.DO_API_TOKEN || ""';
const DO_API_BASE = 'https://api.digitalocean.com/v2';
const APP_ID = 'f9d379c9-9bd3-40f8-9ff0-a33cbbd4926b';

const FILES_TO_UPDATE = [
  { path: '../index.html', pattern: /window\.JEFF_API_URL\s*=\s*['"]([^'"]+)['"]/ },
  { path: '../shopware/components/JeffChat.tsx', pattern: /const JEFF_API_URL\s*=\s*process\.env\.NEXT_PUBLIC_JEFF_API_URL\s*\|\|\s*['"]([^'"]+)['"]/ },
  { path: '../rfq-app/components/JeffChat.tsx', pattern: /const JEFF_API_URL\s*=\s*process\.env\.NEXT_PUBLIC_JEFF_API_URL\s*\|\|\s*['"]([^'"]+)['"]/ },
  { path: '../assets/jeff-chat-widget.js', pattern: /const JEFF_API_URL\s*=\s*window\.JEFF_API_URL\s*\|\|\s*['"]([^'"]+)['"]/ },
  { path: 'jeff-marketing.sh', pattern: /JEFF_URL=.*ondigitalocean\.app/ },
  { path: 'jeff-marketing.js', pattern: /const JEFF_URL\s*=\s*process\.env\.JEFF_API_URL\s*\|\|\s*['"]([^'"]+)['"]/ },
];

async function checkDeployment() {
  try {
    // Check latest deployment
    const deploymentsRes = await axios.get(`${DO_API_BASE}/apps/${APP_ID}/deployments`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` },
      params: { page: 1, per_page: 1 }
    });
    
    const deployments = deploymentsRes.data.deployments || [];
    if (deployments.length === 0) {
      return { phase: 'unknown', url: null };
    }
    
    const latest = deployments[0];
    const phase = latest.phase || 'unknown';
    
    // Check app for live URL
    const appRes = await axios.get(`${DO_API_BASE}/apps/${APP_ID}`, {
      headers: { 'Authorization': `Bearer ${DO_API_TOKEN}` }
    });
    
    const liveUrl = appRes.data.app.live_url || null;
    
    return { phase, url: liveUrl, deploymentId: latest.id };
  } catch (error) {
    console.error('Error checking deployment:', error.message);
    return { phase: 'error', url: null };
  }
}

function updateFile(filePath, pattern, newUrl) {
  const fullPath = path.join(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    const updated = content.replace(pattern, (match) => {
      if (filePath.includes('.sh')) {
        return `JEFF_URL="${newUrl}"`;
      }
      return match.replace(/https:\/\/jeff-ai-agent-[^'"]+/, newUrl);
    });
    
    if (content !== updated) {
      fs.writeFileSync(fullPath, updated, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

async function updateAllUrls(url) {
  console.log(`\n📝 Updating URLs to: ${url}\n`);
  
  let updated = 0;
  for (const file of FILES_TO_UPDATE) {
    if (updateFile(file.path, file.pattern, url)) {
      updated++;
    }
  }
  
  console.log(`\n✅ Updated ${updated} files\n`);
  return updated > 0;
}

async function main() {
  console.log('🔍 Waiting for Jeff to deploy...\n');
  console.log('This may take 5-10 minutes. Checking every 15 seconds...\n');
  
  let attempts = 0;
  const maxAttempts = 120; // 30 minutes max
  
  while (attempts < maxAttempts) {
    attempts++;
    const status = await checkDeployment();
    
    if (status.url) {
      console.log(`\n🎉🎉🎉 JEFF IS DEPLOYED! 🎉🎉🎉\n`);
      console.log(`URL: ${status.url}`);
      console.log(`Phase: ${status.phase}\n`);
      
      // Update all URLs
      const hasChanges = await updateAllUrls(status.url);
      
      if (hasChanges) {
        console.log('✅ All URLs updated! Ready to commit.');
      }
      
      // Test the URL
      try {
        const healthCheck = await axios.get(`${status.url}/healthz`, { timeout: 5000 });
        console.log(`✅ Health check passed: ${healthCheck.data.status}`);
      } catch (error) {
        console.log(`⚠️  Health check failed (may need a moment): ${error.message}`);
      }
      
      return;
    }
    
    if (status.phase === 'ERROR' || status.phase === 'FAILED') {
      console.log(`\n❌ Deployment failed! Phase: ${status.phase}`);
      console.log('Check DigitalOcean dashboard for build logs.');
      return;
    }
    
    if (attempts % 4 === 0) {
      console.log(`[${attempts}/${maxAttempts}] Phase: ${status.phase} - Still waiting...`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 15000));
  }
  
  console.log('\n⏱️  Timeout waiting for deployment. Check manually.');
}

main().catch(console.error);

