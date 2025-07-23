export interface PageData {
  id?: string;
  url: string;
  title?: string;
  content?: string;
  rawHtml?: string;
  rawPageContent?: string; // Store raw page content for model reuse
  category?: string;
  scraped?: boolean;
  scrapedAt?: Date;
}

export interface EmbeddingData {
  id?: string;
  pageId: string;
  content: string;
  vector: number[];
  metadata?: Record<string, any>;
}

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}