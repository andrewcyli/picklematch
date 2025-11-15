// Ping search engines with sitemap URL after deployment
const SITE_URL = 'https://pickleballmatch.fun';
const SITEMAP_URL = `${SITE_URL}/sitemap.xml`;

const searchEngines = [
  {
    name: 'Google',
    url: `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  },
  {
    name: 'Bing',
    url: `https://www.bing.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`
  }
];

async function pingSearchEngine(engine) {
  try {
    console.log(`📡 Pinging ${engine.name}...`);
    const response = await fetch(engine.url, {
      method: 'GET',
      headers: {
        'User-Agent': 'PickleballMatch-Sitemap-Pinger/1.0'
      }
    });

    if (response.ok) {
      console.log(`✅ ${engine.name} pinged successfully`);
      return { engine: engine.name, success: true };
    } else {
      console.warn(`⚠️  ${engine.name} returned status ${response.status}`);
      return { engine: engine.name, success: false, status: response.status };
    }
  } catch (error) {
    console.error(`❌ Failed to ping ${engine.name}:`, error.message);
    return { engine: engine.name, success: false, error: error.message };
  }
}

async function pingAll() {
  console.log('🔔 Notifying search engines about sitemap update...');
  console.log(`   Sitemap URL: ${SITEMAP_URL}\n`);

  const results = await Promise.all(
    searchEngines.map(engine => pingSearchEngine(engine))
  );

  console.log('\n📊 Summary:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`   ${status} ${result.engine}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n🎯 ${successCount}/${results.length} search engines notified`);

  // Don't fail the build if pings fail - it's not critical
  if (successCount === 0) {
    console.warn('\n⚠️  No search engines could be notified, but this is not critical.');
    console.warn('   You can manually submit your sitemap in Google Search Console.');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  pingAll().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { pingAll };
