#!/usr/bin/env node

// Combined build script that generates sitemap and optionally pings search engines
import { execSync } from 'child_process';

const shouldPing = process.env.PING_SEARCH_ENGINES === 'true' || process.argv.includes('--ping');

console.log('🚀 Starting build process...\n');

try {
  // Step 1: Generate sitemaps before build
  console.log('📋 Step 1: Generating sitemaps...');
  execSync('node scripts/generate-sitemap.js', { stdio: 'inherit' });
  console.log('');

  // Step 2: Build the application
  console.log('🏗️  Step 2: Building application...');
  execSync('vite build', { stdio: 'inherit' });
  console.log('');

  // Step 3: Ping search engines (only in production/CI)
  if (shouldPing) {
    console.log('🔔 Step 3: Pinging search engines...');
    execSync('node scripts/ping-search-engines.js', { stdio: 'inherit' });
  } else {
    console.log('ℹ️  Step 3: Skipping search engine ping (use --ping flag or set PING_SEARCH_ENGINES=true to enable)');
  }

  console.log('\n✨ Build completed successfully!');
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
