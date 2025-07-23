import * as cheerio from 'cheerio';
import * as xml2js from 'xml2js';
import { PrismaClient } from '@prisma/client';
import { PageData, SitemapUrl } from '../src/types';

const prisma = new PrismaClient();

// Throttling: max 15 pages per minute
const PAGES_PER_MINUTE = 15;
const DELAY_BETWEEN_PAGES = (60 * 1000) / PAGES_PER_MINUTE; // 4 seconds between pages

async function fetchSitemap(): Promise<SitemapUrl[]> {
  console.log('Fetching sitemap...');
  
  const response = await fetch('https://www.unloan.com.au/sitemap.xml');
  const xmlData = await response.text();
  
  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(xmlData);
  
  const urls: SitemapUrl[] = result.urlset.url.map((item: any) => ({
    loc: item.loc[0].trim(),
    lastmod: item.lastmod?.[0],
    changefreq: item.changefreq?.[0],
    priority: item.priority?.[0]
  }));
  
  console.log(`Found ${urls.length} URLs in sitemap`);
  return urls;
}

async function scrapePage(url: string): Promise<PageData | null> {
  try {
    // Add UTM parameters to the URL
    const urlObj = new URL(url);
    urlObj.searchParams.set('utm_source', 'grayson-campbell');
    urlObj.searchParams.set('utm_medium', 'scraper');
    urlObj.searchParams.set('utm_campaign', 'grayson-wants-a-job');
    const urlWithUTM = urlObj.toString();
    
    console.log(`Scraping: ${urlWithUTM}`);
    
    const response = await fetch(urlWithUTM, {
      headers: {
        'User-Agent': 'Grayson Campbell Research Bot - Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    // Handle rate limiting and IP bans
    if (response.status === 429) {
      console.error('🚨 RATE LIMITED! The server is blocking requests due to too many requests.');
      console.error('⚠️  PLEASE CHANGE YOUR CONNECTION/IP ADDRESS and restart the scraper.');
      throw new Error('RATE_LIMITED');
    }
    
    if (response.status === 403) {
      console.error('🚨 ACCESS FORBIDDEN! Your IP may be banned or blocked.');
      console.error('⚠️  PLEASE CHANGE YOUR CONNECTION/IP ADDRESS and restart the scraper.');
      throw new Error('IP_BANNED');
    }
    
    if (response.status === 503) {
      console.error('🚨 SERVICE UNAVAILABLE! The server may be temporarily blocking requests.');
      console.error('⚠️  PLEASE CHANGE YOUR CONNECTION/IP ADDRESS and restart the scraper.');
      throw new Error('SERVICE_UNAVAILABLE');
    }
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const html = await response.text();
    
    // Check if we got a captcha or block page
    if (html.includes('captcha') || html.includes('blocked') || html.includes('Access Denied')) {
      console.error('🚨 CAPTCHA/BLOCK PAGE DETECTED! Your IP may be flagged.');
      console.error('⚠️  PLEASE CHANGE YOUR CONNECTION/IP ADDRESS and restart the scraper.');
      throw new Error('CAPTCHA_DETECTED');
    }
    
    const $ = cheerio.load(html);
    
    // Remove script and style elements
    $('script, style, nav, footer, .cookie-banner, .navigation').remove();
    
    // Extract meaningful content
    const title = $('title').text().trim() || $('h1').first().text().trim();
    const content = $('main, article, .content, [role="main"]').first().text().trim() || 
                   $('body').text().trim();
    
    // Clean up content - remove extra whitespace
    const cleanContent = content.replace(/\s+/g, ' ').trim();
    const rawPageContent = cleanContent; // Store for model reuse
    
    // Categorize based on URL
    let category = 'general';
    if (url.includes('/learn/')) category = 'learn';
    else if (url.includes('/home-loans/')) category = 'home-loans';
    else if (url.includes('/benefits/')) category = 'benefits';
    else if (url.includes('/important-information/')) category = 'important-info';
    
    return {
      url,
      title,
      content: cleanContent.substring(0, 10000), // Limit for storage
      rawHtml: html.substring(0, 50000), // Limit HTML storage
      rawPageContent: rawPageContent.substring(0, 20000), // Store raw content
      category,
      scraped: true,
      scrapedAt: new Date()
    };
  } catch (error) {
    if (error instanceof Error && ['RATE_LIMITED', 'IP_BANNED', 'SERVICE_UNAVAILABLE', 'CAPTCHA_DETECTED'].includes(error.message)) {
      throw error; // Re-throw blocking errors to stop execution
    }
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

async function saveToDatabase(pageData: PageData) {
  try {
    await prisma.page.upsert({
      where: { url: pageData.url },
      update: {
        title: pageData.title,
        content: pageData.content,
        rawHtml: pageData.rawHtml,
        rawPageContent: pageData.rawPageContent,
        category: pageData.category,
        scraped: pageData.scraped,
        scrapedAt: pageData.scrapedAt
      },
      create: pageData as any
    });
    console.log(`✅ Saved: ${pageData.url}`);
  } catch (error) {
    console.error(`Error saving ${pageData.url}:`, error);
  }
}

async function main() {
  try {
    // Fetch sitemap URLs
    const urls = await fetchSitemap();
    
    // Initialize database - add URLs one by one to handle any errors
    for (const url of urls) {
      try {
        await prisma.page.upsert({
          where: { url: url.loc },
          update: {},
          create: { url: url.loc, scraped: false }
        });
      } catch (error) {
        console.log(`Skipping URL: ${url.loc} - ${error}`);
      }
    }
    
    console.log(`Starting to scrape ${urls.length} pages...`);
    console.log(`🐌 Throttling: max ${PAGES_PER_MINUTE} pages per minute (${DELAY_BETWEEN_PAGES/1000}s between pages)`);
    console.log('🔍 Monitoring for rate limits and IP blocks...\n');
    
    // Get pages that haven't been scraped yet
    const unscrapedPages = await prisma.page.findMany({
      where: { scraped: false },
      select: { url: true }
    });
    
    console.log(`Found ${unscrapedPages.length} pages left to scrape out of ${urls.length} total`);
    
    if (unscrapedPages.length === 0) {
      console.log('🎉 All pages have already been scraped!');
      return;
    }
    
    // Process unscraped pages one at a time with throttling
    for (let i = 0; i < unscrapedPages.length; i++) {
      const pageUrl = unscrapedPages[i].url;
      
      try {
        const pageData = await scrapePage(pageUrl);
        if (pageData) {
          await saveToDatabase(pageData);
        }
        
        console.log(`Progress: ${i + 1}/${unscrapedPages.length} (${Math.round(((i + 1) / unscrapedPages.length) * 100)}%)`);
        
        // Throttle: wait between pages
        if (i < unscrapedPages.length - 1) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_PAGES/1000}s before next page...`);
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES));
        }
        
      } catch (error) {
        if (error instanceof Error && ['RATE_LIMITED', 'IP_BANNED', 'SERVICE_UNAVAILABLE', 'CAPTCHA_DETECTED'].includes(error.message)) {
          console.error('\n❌ SCRAPING STOPPED DUE TO IP/RATE LIMITING');
          console.error('📝 Progress saved. You can resume by running the script again after changing your connection.');
          break;
        }
        console.error(`Error processing ${pageUrl}:`, error);
        // Continue with next URL on non-blocking errors
      }
    }
    
    console.log('✅ Scraping completed!');
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}