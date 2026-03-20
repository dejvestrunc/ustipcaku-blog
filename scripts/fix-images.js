import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');

const client = new Anthropic();

// Category mapping for matching
const categoryMap = {
  'WHITE_WINE': 'bile-vino',
  'RED_WINE': 'cervene-vino',
  'ROSE': 'rose',
  'SPARKLING': 'sumive',
  'FOOD_PAIRING': 'parovani-s-jidlem',
  'VINEYARD': 'vinarske-regiony',
  'TIPS': 'tipy-a-triky',
};

// Compatibility: which photo categories work for which article categories
const compatible = {
  'bile-vino': ['WHITE_WINE', 'VINEYARD', 'TIPS'],
  'cervene-vino': ['RED_WINE', 'VINEYARD'],
  'rose': ['ROSE', 'WHITE_WINE', 'VINEYARD'],
  'sumive': ['SPARKLING', 'WHITE_WINE'],
  'parovani-s-jidlem': ['FOOD_PAIRING', 'WHITE_WINE', 'RED_WINE'],
  'vinarske-regiony': ['VINEYARD', 'WHITE_WINE', 'RED_WINE'],
  'tipy-a-triky': ['TIPS', 'WHITE_WINE', 'RED_WINE', 'FOOD_PAIRING'],
};

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function categorizePhotos(photoIds) {
  const results = {};
  const batchSize = 8;

  for (let i = 0; i < photoIds.length; i += batchSize) {
    const batch = photoIds.slice(i, i + batchSize);
    console.log(`Kategorizuji fotky ${i + 1}-${i + batch.length} z ${photoIds.length}...`);

    const imageBlocks = [];
    const validIds = [];

    for (const id of batch) {
      const thumbUrl = `https://images.unsplash.com/${id}?w=400&h=300&fit=crop&q=60`;
      const base64 = await fetchImageAsBase64(thumbUrl);
      if (base64) {
        imageBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
        });
        imageBlocks.push({
          type: 'text',
          text: `Photo ID: ${id}`,
        });
        validIds.push(id);
      }
    }

    if (validIds.length === 0) continue;

    imageBlocks.push({
      type: 'text',
      text: `Categorize each photo above for a wine blog. For each photo ID, return EXACTLY one category:
- WHITE_WINE (white wine glass, white wine bottle, light colored wine)
- RED_WINE (red wine glass, red wine bottle, dark colored wine, wine barrel/cellar)
- ROSE (pink/rosé wine)
- SPARKLING (champagne, sparkling wine, bubbles)
- FOOD_PAIRING (food with wine, dinner setting, cheese board)
- VINEYARD (vineyard landscape, grape harvest, wine region scenery)
- TIPS (wine tools, corkscrew, thermometer, decanting)
- HONEY (honey jar, honeycomb - NOT wine related)
- UNKNOWN (cannot determine)

Return ONLY a JSON object: {"photo-id": "CATEGORY", ...}`,
    });

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: imageBlocks }],
    });

    try {
      const text = msg.content[0].text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        Object.assign(results, parsed);
      }
    } catch (e) {
      console.warn('  Parse error, skipping batch');
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 2000));
  }

  return results;
}

async function main() {
  // 1. Collect all articles and their current images
  const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  const articles = [];
  const allPhotoIds = new Set();

  for (const f of files) {
    const content = readFileSync(join(ARTICLES_DIR, f), 'utf8');
    const imgMatch = content.match(/^image:\s*"https:\/\/images\.unsplash\.com\/([^?]+)/m);
    const catMatch = content.match(/^category:\s*"(.+)"/m);
    const titleMatch = content.match(/^title:\s*"(.+)"/m);
    if (imgMatch && catMatch) {
      articles.push({
        file: f,
        photoId: imgMatch[1],
        category: catMatch[1],
        title: titleMatch?.[1] || f,
        content,
      });
      allPhotoIds.add(imgMatch[1]);
    }
  }

  console.log(`${articles.length} článků, ${allPhotoIds.size} unikátních fotek\n`);

  // 2. Categorize all photos via Claude Vision
  const photoCategories = await categorizePhotos([...allPhotoIds]);
  console.log('\nKategorizace fotek hotova.\n');

  // 3. Find mismatches
  const mismatches = [];
  for (const article of articles) {
    const photoCategory = photoCategories[article.photoId];
    if (!photoCategory) continue;
    if (photoCategory === 'HONEY' || photoCategory === 'UNKNOWN') {
      mismatches.push({ ...article, photoCategory, reason: 'irrelevant' });
      continue;
    }
    const validCategories = compatible[article.category] || [];
    if (!validCategories.includes(photoCategory)) {
      mismatches.push({ ...article, photoCategory, reason: 'mismatch' });
    }
  }

  console.log(`Nalezeno ${mismatches.length} nesprávně přiřazených fotek:\n`);
  for (const m of mismatches) {
    console.log(`  ${m.file}`);
    console.log(`    Článek: ${m.category} | Fotka: ${m.photoCategory} | ${m.reason}`);
  }

  if (mismatches.length === 0) {
    console.log('Všechny fotky odpovídají kategoriím!');
    return;
  }

  // 4. Build pool of correctly categorized photos per category
  const photoPool = {};
  for (const [photoId, category] of Object.entries(photoCategories)) {
    if (category === 'HONEY' || category === 'UNKNOWN') continue;
    if (!photoPool[category]) photoPool[category] = [];
    photoPool[category].push(photoId);
  }

  // 5. Track used images
  const usedImages = new Set(articles.map(a => a.photoId));

  // 6. Reassign mismatched photos
  let fixed = 0;
  for (const m of mismatches) {
    const validCategories = compatible[m.category] || [];
    let newPhotoId = null;

    // Try to find unused photo from compatible categories
    for (const cat of validCategories) {
      const pool = photoPool[cat] || [];
      for (const id of pool) {
        if (!usedImages.has(id) || id !== m.photoId) {
          // Check if not already used by checking all articles
          const alreadyUsed = articles.some(a => a.photoId === id && a.file !== m.file);
          if (!alreadyUsed) {
            newPhotoId = id;
            break;
          }
        }
      }
      if (newPhotoId) break;
    }

    if (newPhotoId) {
      const oldUrl = `https://images.unsplash.com/${m.photoId}?w=1200&h=720&fit=crop&q=80`;
      const newUrl = `https://images.unsplash.com/${newPhotoId}?w=1200&h=720&fit=crop&q=80`;
      const newContent = m.content.replace(oldUrl, newUrl);
      writeFileSync(join(ARTICLES_DIR, m.file), newContent, 'utf8');
      usedImages.add(newPhotoId);
      console.log(`\n  ✓ ${m.file}: ${m.photoId} → ${newPhotoId}`);
      fixed++;

      // Update article record
      const idx = articles.findIndex(a => a.file === m.file);
      if (idx >= 0) articles[idx].photoId = newPhotoId;
    } else {
      console.log(`\n  ✗ ${m.file}: Nenalezena vhodná náhrada pro kategorii ${m.category}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Opraveno: ${fixed}/${mismatches.length}`);
}

main().catch(err => {
  console.error('Chyba:', err);
  process.exit(1);
});
