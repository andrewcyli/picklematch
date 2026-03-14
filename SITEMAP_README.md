# Automated Sitemap Generation

This project automatically generates `sitemap.xml` and `sitemap.txt` during the build process.

## How It Works

### Automatic Generation (During Build)
The Vite plugin (`scripts/vite-plugin-sitemap.js`) automatically:
1. Extracts routes from `src/App.tsx`
2. Generates `sitemap.xml` and `sitemap.txt`
3. Places them in the `dist` folder during build

**No manual intervention needed** - just run your normal build command.

### Routes Detection
Routes are automatically detected from your `App.tsx` file:
- All `<Route path="..." />` declarations are scanned
- Catch-all routes (`*`) are excluded
- The homepage `/` gets priority 1.0, others get 0.8

### Configuration
Edit `vite.config.ts` to customize:
```typescript
sitemapPlugin({
  hostname: 'https://pickleballmatch.fun', // Your site URL
  routes: extractRoutesFromApp('./src/App.tsx'), // Auto-extract
  outDir: 'dist' // Build output directory
})
```

## Manual Scripts (Optional)

If you need to run sitemap generation manually:

### Generate Sitemaps Only
```bash
node scripts/generate-sitemap.js
```
Generates sitemaps in the `public` folder (for development preview).

### Ping Search Engines
```bash
node scripts/ping-search-engines.js
```
Notifies Google and Bing about sitemap updates.

### Build with Search Engine Ping
```bash
node scripts/build-with-sitemap.js --ping
```
Or set environment variable:
```bash
PING_SEARCH_ENGINES=true node scripts/build-with-sitemap.js
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Build with sitemap
  run: npm run build
  
- name: Notify search engines
  run: node scripts/ping-search-engines.js
  env:
    PING_SEARCH_ENGINES: true
```

### Vercel/Netlify
Add to your build settings:
- Build command: `npm run build` (sitemap auto-generated)
- Post-deploy: Add webhook or script to run `ping-search-engines.js`

## Sitemap URLs
After deployment, your sitemaps will be available at:
- XML: `https://pickleballmatch.fun/sitemap.xml`
- TXT: `https://pickleballmatch.fun/sitemap.txt`

Both are referenced in `robots.txt`.

## Adding New Routes
Simply add routes to `App.tsx`:
```tsx
<Route path="/new-page" element={<NewPage />} />
```

The sitemap will automatically include it on the next build.

## Troubleshooting

### Sitemap not updating
- Verify the build completed successfully
- Check that `dist/sitemap.xml` exists after build
- Ensure your hosting serves static files from the dist folder

### Search engines not finding sitemap
- Verify the sitemap is accessible at your domain URL
- Check robots.txt includes sitemap reference
- Manually submit in Google Search Console
- Run `node scripts/ping-search-engines.js` after deploy

### Route not appearing in sitemap
- Ensure the route doesn't use wildcards (`*`)
- Check the route is defined in `App.tsx` as `<Route path="..." />`
- Routes in other files won't be auto-detected (add manually to config)
