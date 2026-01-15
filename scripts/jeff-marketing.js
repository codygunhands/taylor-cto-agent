#!/usr/bin/env node

/**
 * Jeff Marketing CLI - Node.js version
 * Usage: node jeff-marketing.js "Create a landing page draft for ShopLink"
 */

const axios = require('axios');
const readline = require('readline');

const JEFF_URL = process.env.JEFF_API_URL || 'https://jeff-ai-agent-xxxxx.ondigitalocean.app';
const API_KEY = process.env.JEFF_API_KEY || process.env.INTERNAL_API_KEY;

if (!API_KEY || API_KEY === 'your-api-key-here') {
  console.error('❌ Error: JEFF_API_KEY or INTERNAL_API_KEY not set!');
  console.error('Set it with: export JEFF_API_KEY=your-actual-key');
  process.exit(1);
}

async function askJeffMarketing(prompt) {
  const sessionId = `marketing-${Date.now()}`;
  
  try {
    console.log('📝 Sending to Jeff...\n');
    
    const response = await axios.post(
      `${JEFF_URL}/v1/agent`,
      {
        sessionId,
        mode: 'marketing',
        channel: 'marketing',
        message: prompt,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
      }
    );
    
    console.log('✅ Jeff\'s Response:\n');
    console.log(response.data.reply);
    console.log('');
    
    if (response.data.citations && response.data.citations.length > 0) {
      console.log('📚 Citations:');
      response.data.citations.forEach(citation => {
        console.log(`   - ${citation.doc}${citation.anchor ? ` (${citation.anchor})` : ''}`);
      });
    }
    
    if (response.data.actions && response.data.actions.length > 0) {
      console.log('\n🎯 Actions:');
      response.data.actions.forEach(action => {
        console.log(`   - ${action.type}`);
      });
    }
    
  } catch (error) {
    if (error.response) {
      console.error('❌ Error:', error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

// Get prompt from command line or prompt user
const prompt = process.argv.slice(2).join(' ');

if (prompt) {
  askJeffMarketing(prompt);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  rl.question('Enter your marketing request: ', (answer) => {
    askJeffMarketing(answer);
    rl.close();
  });
}

