const axios = require('axios');
const cheerio = require('cheerio');
const xml = require('xml');
const fs = require('fs-extra');

const baseURL = 'https://errnerr.co.uk'; // Change this to the website you want to crawl

async function fetchURL(url) {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${url}: ${error}`);
    return null;
  }
}

async function extractLinks(html) {
  const $ = cheerio.load(html);
  const links = new Set();
  $('a').each((i, link) => {
    const href = $(link).attr('href');
    if (href && href.startsWith('/') && href.length > 1) {
      links.add(new URL(href, baseURL).href);
    }
  });
  return links;
}

async function crawlSite(startURL) {
  const visited = new Set();
  const toVisit = [startURL];

  while (toVisit.length > 0) {
    const currentURL = toVisit.pop();
    if (!visited.has(currentURL)) {
      visited.add(currentURL);
      const html = await fetchURL(currentURL);
      if (html) {
        const links = await extractLinks(html);
        links.forEach(link => {
          if (!visited.has(link)) {
            toVisit.push(link);
          }
        });
      }
    }
  }
  return visited;
}

async function generateSitemap(urls) {
  const sitemap = {
    urlset: [
      { _attr: { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' } },
      ...Array.from(urls).map(url => ({
        url: [{ loc: url }]
      }))
    ]
  };
  return xml(sitemap, { declaration: true });
}

async function main() {
  const crawledUrls = await crawlSite(baseURL);
  const sitemapXml = await generateSitemap(crawledUrls);
  await fs.writeFile('./sitemap.xml', sitemapXml);
  console.log('Sitemap written successfully!');
}

main().catch(error => console.error('Error writing sitemap:', error));
