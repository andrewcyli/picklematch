import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Configuration
const SITE_URL = 'https://pickleballmatch.fun';
const APP_FILE = resolve(__dirname, '../src/App.tsx');
const OUTPUT_DIR = resolve(__dirname, '../public');

// Extract routes from App.tsx
function extractRoutes() {
  const appContent = readFileSync(APP_FILE, 'utf-8');
  const routeRegex = /<Route\s+path="([^"]+)"/g;
  const routes = [];
  let match;

  while ((match = routeRegex.exec(appContent)) !== null) {
    const path = match[1];
    // Skip catch-all routes
    if (path !== '*' && !path.includes('*')) {
      routes.push(path);
    }
  }

  return routes;
}

// Generate sitemap.xml
function generateXML(routes) {
  const today = new Date().toISOString().split('T')[0];
  
  const urls = routes.map(route => {
    const loc = `${SITE_URL}${route === '/' ? '' : route}`;
    const priority = route === '/' ? '1.0' : '0.8';
    
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
}

// Generate sitemap.txt
function generateTXT(routes) {
  return routes
    .map(route => `${SITE_URL}${route === '/' ? '/' : route}`)
    .join('\n') + '\n';
}

// Main execution
try {
  console.log('🗺️  Generating sitemaps...');
  
  const routes = extractRoutes();
  console.log(`   Found ${routes.length} route(s):`, routes);
  
  const xmlContent = generateXML(routes);
  const txtContent = generateTXT(routes);
  
  writeFileSync(resolve(OUTPUT_DIR, 'sitemap.xml'), xmlContent);
  writeFileSync(resolve(OUTPUT_DIR, 'sitemap.txt'), txtContent);
  
  console.log('✅ Sitemaps generated successfully!');
  console.log(`   - ${OUTPUT_DIR}/sitemap.xml`);
  console.log(`   - ${OUTPUT_DIR}/sitemap.txt`);
} catch (error) {
  console.error('❌ Error generating sitemaps:', error.message);
  process.exit(1);
}
