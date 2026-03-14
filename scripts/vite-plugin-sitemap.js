import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Vite plugin to generate sitemap.xml and sitemap.txt at build time
 */
export function sitemapPlugin(options = {}) {
  const {
    hostname = 'https://pickleballmatch.fun',
    routes = ['/'],
    outDir = 'dist'
  } = options;

  let config;

  return {
    name: 'vite-plugin-sitemap',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    closeBundle() {
      if (config.command !== 'build') return;

      const today = new Date().toISOString().split('T')[0];
      const outputDir = resolve(config.root, outDir);

      // Generate XML
      const urls = routes.map(route => {
        const loc = `${hostname}${route === '/' ? '' : route}`;
        const priority = route === '/' ? '1.0' : '0.8';
        
        return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority}</priority>
  </url>`;
      }).join('\n');

      const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

      // Generate TXT
      const txtContent = routes
        .map(route => `${hostname}${route === '/' ? '/' : route}`)
        .join('\n') + '\n';

      // Write files
      try {
        writeFileSync(resolve(outputDir, 'sitemap.xml'), xmlContent);
        writeFileSync(resolve(outputDir, 'sitemap.txt'), txtContent);
        console.log(`\n✅ Generated sitemaps with ${routes.length} route(s)`);
        console.log(`   - sitemap.xml`);
        console.log(`   - sitemap.txt`);
      } catch (error) {
        console.error('❌ Error writing sitemaps:', error.message);
      }
    }
  };
}

/**
 * Extract routes from App.tsx automatically
 */
export function extractRoutesFromApp(appPath = './src/App.tsx') {
  try {
    const appContent = readFileSync(appPath, 'utf-8');
    const routeRegex = /<Route\s+path="([^"]+)"/g;
    const routes = [];
    let match;

    while ((match = routeRegex.exec(appContent)) !== null) {
      const path = match[1];
      if (path !== '*' && !path.includes('*')) {
        routes.push(path);
      }
    }

    return routes.length > 0 ? routes : ['/'];
  } catch (error) {
    console.warn('⚠️  Could not extract routes from App.tsx, using default ["/"]');
    return ['/'];
  }
}
