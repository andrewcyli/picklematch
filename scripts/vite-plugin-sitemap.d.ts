import { Plugin } from 'vite';

export interface SitemapPluginOptions {
  hostname?: string;
  routes?: string[];
  outDir?: string;
}

export function sitemapPlugin(options?: SitemapPluginOptions): Plugin;
export function extractRoutesFromApp(appPath?: string): string[];
