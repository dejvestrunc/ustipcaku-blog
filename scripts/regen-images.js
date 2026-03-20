import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');
const IMAGES_DIR = join(__dirname, '..', 'public', 'images', 'articles');

// Articles clearly about specific wines -> matching eshop product URLs
const articlesToFix = [
  { file: 'frankovka-kralovna-moravskych-cervenych.md', productUrl: 'https://www.ustipcaku.cz/frankovka-2022/' },
  { file: 'jak-parovat-moravsky-ryzlink-s-jidlem.md', productUrl: 'https://www.ustipcaku.cz/ryzlink-rynsky-2023/' },
  { file: 'palava-vinarska-oblast.md', productUrl: 'https://www.ustipcaku.cz/palava-2024/' },
  { file: 'frizzante-lehce-sumive-vino-bez-praskani-korku.md', productUrl: 'https://www.ustipcaku.cz/frizzante-2024/' },
  { file: 'pruvodce-bilymi-viny-od-ryzlinku-po-chardonnay.md', productUrl: 'https://www.ustipcaku.cz/chardonnay-2023/' },
  { file: 'moravske-sumive-vino-od-frizzante-po-sekty-metodou-klasik.md', productUrl: 'https://www.ustipcaku.cz/pet-nat/' },
  { file: 'dub-a-bila-vina-jak-dubovani-meni-moravske-vino.md', productUrl: 'https://www.ustipcaku.cz/veltlinske-zelene-2022-2/' },
  { file: 'malolakticka-fermentace-tajemstvi-kremovych-bilych-vin.md', productUrl: 'https://www.ustipcaku.cz/rulandske-bile-2024/' },
];

async function fetchProductImageUrl(productPageUrl) {
  const res = await fetch(productPageUrl);
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/https:\/\/cdn\.myshoptet\.com\/usr\/www\.ustipcaku\.cz\/user\/shop\/big\/[^"'\s?]+\.(png|jpg|jpeg)/i);
  return match ? match[0] : null;
}

async function composeProductImage(productImageUrl, slug) {
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  const res = await fetch(productImageUrl);
  if (!res.ok) return null;
  const imageBuffer = Buffer.from(await res.arrayBuffer());

  const trimmed = await sharp(imageBuffer).trim({ threshold: 20 }).toBuffer();

  const resized = await sharp(trimmed)
    .resize({ width: 360, height: 560, fit: 'inside', withoutEnlargement: true })
    .png().toBuffer();

  const meta = await sharp(resized).metadata();

  const shadow = await sharp(resized)
    .modulate({ brightness: 0 })
    .blur(12)
    .ensureAlpha(0.4)
    .toBuffer();

  const offsetX = Math.round((1200 - meta.width) / 2);
  const offsetY = Math.round((720 - meta.height) / 2) - 10;

  const bgSvg = `<svg width="1200" height="720" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#1a0a0e"/>
        <stop offset="40%" style="stop-color:#2d1018"/>
        <stop offset="100%" style="stop-color:#0d0508"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="45%">
        <stop offset="0%" style="stop-color:#722F37;stop-opacity:0.25"/>
        <stop offset="100%" style="stop-color:#1a0a0e;stop-opacity:0"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="720" fill="url(#bg)"/>
    <rect width="1200" height="720" fill="url(#glow)"/>
    <line x1="0" y1="700" x2="1200" y2="700" stroke="#722F37" stroke-width="2" opacity="0.3"/>
    <text x="1100" y="690" font-family="Georgia, serif" font-size="14" fill="#a88" opacity="0.4" text-anchor="end">ustipcaku.cz</text>
  </svg>`;

  const outputPath = join(IMAGES_DIR, `${slug}.jpg`);
  await sharp(Buffer.from(bgSvg))
    .composite([
      { input: shadow, left: offsetX + 8, top: offsetY + 8 },
      { input: resized, left: offsetX, top: offsetY },
    ])
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  return `/images/articles/${slug}.jpg`;
}

async function main() {
  let fixed = 0;
  for (const { file, productUrl } of articlesToFix) {
    const slug = file.replace('.md', '');
    console.log(`\n--- ${file} ---`);

    const productImageUrl = await fetchProductImageUrl(productUrl);
    if (!productImageUrl) {
      console.log('  ✗ Produktová fotka nenalezena');
      continue;
    }
    console.log(`  Fotka: ${productImageUrl}`);

    try {
      const imagePath = await composeProductImage(productImageUrl, slug);
      if (!imagePath) { console.log('  ✗ Kompozice selhala'); continue; }

      // Update article frontmatter
      const articlePath = join(ARTICLES_DIR, file);
      let content = readFileSync(articlePath, 'utf8');
      content = content.replace(/^image:\s*"[^"]+"/m, `image: "${imagePath}"`);
      writeFileSync(articlePath, content, 'utf8');

      console.log(`  ✓ Obrázek: ${imagePath}`);
      fixed++;
    } catch (err) {
      console.log(`  ✗ Chyba: ${err.message}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Pregenerováno: ${fixed}/${articlesToFix.length}`);
}

main().catch(console.error);
