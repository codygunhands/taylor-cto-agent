/**
 * Create GitHub Repository for Jeff AI Agent
 * Uses GitHub API to create repository and push code
 */

const axios = require('axios');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const GITHUB_USER = process.env.GITHUB_USER || 'codygunhands';
const REPO_NAME = 'jeff-ai-agent';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN or GH_TOKEN environment variable required');
  console.error('   Create a token at: https://github.com/settings/tokens');
  console.error('   Required scopes: repo');
  process.exit(1);
}

async function createGitHubRepo() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📦 CREATING GITHUB REPOSITORY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check if repo already exists
    console.log(`🔍 Checking if repository exists...`);
    try {
      const checkResponse = await axios.get(
        `https://api.github.com/repos/${GITHUB_USER}/${REPO_NAME}`,
        {
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      );
      
      console.log(`✅ Repository already exists: https://github.com/${GITHUB_USER}/${REPO_NAME}`);
      console.log(`   Updating remote and pushing code...\n`);
      
      // Set remote and push
      try {
        execSync(`git remote remove origin 2>/dev/null || true`, { stdio: 'ignore' });
        execSync(`git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git`, { stdio: 'ignore' });
        execSync(`git push -u origin main`, { stdio: 'inherit' });
        console.log(`\n✅ Code pushed successfully!`);
      } catch (gitError) {
        console.log(`⚠️  Could not push code automatically. You can push manually:`);
        console.log(`   git remote add origin https://github.com/${GITHUB_USER}/${REPO_NAME}.git`);
        console.log(`   git push -u origin main\n`);
      }
      
      return;
    } catch (error) {
      if (error.response?.status !== 404) {
        throw error;
      }
      // Repo doesn't exist, continue to create it
    }

    // Create repository
    console.log(`📦 Creating repository: ${GITHUB_USER}/${REPO_NAME}`);
    const createResponse = await axios.post(
      `https://api.github.com/user/repos`,
      {
        name: REPO_NAME,
        description: 'Jeff - AI Customer Success & Marketing Agent (DigitalOcean Native)',
        private: false,
        auto_init: false,
      },
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    );

    console.log(`✅ Repository created: ${createResponse.data.html_url}\n`);

    // Set remote and push
    console.log('📤 Pushing code to GitHub...');
    try {
      execSync(`git remote remove origin 2>/dev/null || true`, { stdio: 'ignore' });
      execSync(`git remote add origin https://${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git`, { stdio: 'ignore' });
      execSync(`git push -u origin main`, { stdio: 'inherit' });
      console.log(`\n✅ Code pushed successfully!`);
    } catch (gitError) {
      console.log(`⚠️  Could not push code automatically. You can push manually:`);
      console.log(`   git remote add origin https://github.com/${GITHUB_USER}/${REPO_NAME}.git`);
      console.log(`   git push -u origin main\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ REPOSITORY CREATED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log(`📦 Repository: https://github.com/${GITHUB_USER}/${REPO_NAME}`);
    console.log(`\nNext steps:`);
    console.log(`1. Update .do/app.yaml: Replace YOUR_GITHUB_USERNAME with ${GITHUB_USER}`);
    console.log(`2. Deploy: doctl apps create --spec .do/app.yaml\n`);

  } catch (error) {
    console.error('❌ Error creating repository:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.error('\n⚠️  Authentication failed. Please check your GITHUB_TOKEN.');
    }
    process.exit(1);
  }
}

if (require.main === module) {
  createGitHubRepo();
}

module.exports = { createGitHubRepo };

