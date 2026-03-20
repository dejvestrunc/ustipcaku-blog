import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');
const IMAGES_DIR = join(__dirname, '..', 'public', 'images', 'articles');

const categories = [
  { slug: 'bile-vino', label: 'Bílé víno' },
  { slug: 'cervene-vino', label: 'Červené víno' },
  { slug: 'rose', label: 'Rosé' },
  { slug: 'sumive', label: 'Frizzante a šumivé' },
  { slug: 'parovani-s-jidlem', label: 'Párování s jídlem' },
  { slug: 'vinarske-regiony', label: 'Vinařské regiony' },
  { slug: 'tipy-a-triky', label: 'Tipy a triky' },
];

// Real products from ustipcaku.cz eshop
const products = {
  'bile-vino': [
    { title: 'Ryzlink rýnský 2023', url: 'https://www.ustipcaku.cz/ryzlink-rynsky-2023/' },
    { title: 'Ryzlink vlašský 2024', url: 'https://www.ustipcaku.cz/ryzlink-vlassky-2024/' },
    { title: 'Pálava 2024', url: 'https://www.ustipcaku.cz/palava-2024/' },
    { title: 'Veltlínské zelené 2022', url: 'https://www.ustipcaku.cz/veltlinske-zelene-2022-2/' },
    { title: 'Rulandské bílé 2024', url: 'https://www.ustipcaku.cz/rulandske-bile-2024/' },
    { title: 'Rulandské šedé 2024', url: 'https://www.ustipcaku.cz/rulandske-sede-2024/' },
    { title: 'Chardonnay 2023', url: 'https://www.ustipcaku.cz/chardonnay-2023/' },
    { title: 'Tramín červený 2024', url: 'https://www.ustipcaku.cz/tramin-cerveny-2024/' },
    { title: 'Sylvánské zelené 2024', url: 'https://www.ustipcaku.cz/sylvanske-zelene-2024/' },
    { title: 'Neuburské + Aurelius 2024', url: 'https://www.ustipcaku.cz/neuburske-aurelius-2024/' },
    { title: 'Hibernal slamovka 2021', url: 'https://www.ustipcaku.cz/hibernal-slamovka-2021/' },
    { title: 'Devín', url: 'https://www.ustipcaku.cz/devin/' },
  ],
  'cervene-vino': [
    { title: 'Frankovka 2022+2023', url: 'https://www.ustipcaku.cz/frankovka-2022/' },
    { title: 'Dornfelder 2022+2023', url: 'https://www.ustipcaku.cz/dornfelder-2022-2023/' },
    { title: 'Merlot 2022', url: 'https://www.ustipcaku.cz/merlot-2022/' },
    { title: 'Cabernet Moravia 2022', url: 'https://www.ustipcaku.cz/cabernet-moravia-2022/' },
    { title: 'Frankovka + Merlot + Cabernet Moravia', url: 'https://www.ustipcaku.cz/frankovka-merlot--cabernet-moravia/' },
  ],
  'rose': [
    { title: 'Frankovka rosé 2019', url: 'https://www.ustipcaku.cz/frankovka-rose-2019/' },
    { title: 'Frizzante 2024', url: 'https://www.ustipcaku.cz/frizzante-2024/' },
    { title: 'Frizzante 2023', url: 'https://www.ustipcaku.cz/frizzante-2023/' },
  ],
  'sumive': [
    { title: 'Frizzante 2024', url: 'https://www.ustipcaku.cz/frizzante-2024/' },
    { title: 'Frizzante 2023', url: 'https://www.ustipcaku.cz/frizzante-2023/' },
    { title: 'Pét-Nat', url: 'https://www.ustipcaku.cz/pet-nat/' },
  ],
  'parovani-s-jidlem': [
    { title: 'Ryzlink rýnský 2023', url: 'https://www.ustipcaku.cz/ryzlink-rynsky-2023/' },
    { title: 'Frankovka 2022+2023', url: 'https://www.ustipcaku.cz/frankovka-2022/' },
    { title: 'Pálava 2024', url: 'https://www.ustipcaku.cz/palava-2024/' },
    { title: 'Veltlínské zelené 2022', url: 'https://www.ustipcaku.cz/veltlinske-zelene-2022-2/' },
    { title: 'Ryzlink vlašský 2024', url: 'https://www.ustipcaku.cz/ryzlink-vlassky-2024/' },
  ],
  'vinarske-regiony': [
    { title: 'Pálava 2024', url: 'https://www.ustipcaku.cz/palava-2024/' },
    { title: 'Ryzlink rýnský 2023', url: 'https://www.ustipcaku.cz/ryzlink-rynsky-2023/' },
    { title: 'Frankovka 2022+2023', url: 'https://www.ustipcaku.cz/frankovka-2022/' },
    { title: 'Tramín červený 2024', url: 'https://www.ustipcaku.cz/tramin-cerveny-2024/' },
  ],
  'tipy-a-triky': [
    { title: 'Ryzlink rýnský 2023', url: 'https://www.ustipcaku.cz/ryzlink-rynsky-2023/' },
    { title: 'Frankovka 2022+2023', url: 'https://www.ustipcaku.cz/frankovka-2022/' },
    { title: 'Pálava 2024', url: 'https://www.ustipcaku.cz/palava-2024/' },
    { title: 'Neuburské + Aurelius 2024', url: 'https://www.ustipcaku.cz/neuburske-aurelius-2024/' },
  ],
};

// Unsplash wine-related photo IDs per category
const unsplashPhotos = {
  'bile-vino': [
    'photo-1558642452-9d2a7deb7f62', 'photo-1474722883778-792e7990302f',
    'photo-1598306442928-4d90f32c6866', 'photo-1543286386-713bdd548da4',
    'photo-1485637701894-09ad422f6de6', 'photo-1504279577054-acfeccf8fc52',
    'photo-1518281361980-b26bfd556770', 'photo-1541899481282-d53bffe3c35d',
    'photo-1500917293891-ef795e70e1f6',
  ],
  'cervene-vino': [
    'photo-1606767351797-1664b860ae5a', 'photo-1510812431401-41d2bd2722f3',
    'photo-1553361371-9b22f78e8b1d', 'photo-1586370434639-0fe43b2d32e6',
    'photo-1567696911980-2eed69a46042', 'photo-1578911373434-0cb395d2cbfb',
    'photo-1516594915697-87eb3b1c14ea', 'photo-1423483641154-5411ec9c0ddf',
    'photo-1546944517-4f38480ff03c', 'photo-1551024709-8f23befc6f87',
    'photo-1507281549113-040fcfef650e',
  ],
  'rose': [
    'photo-1558001373-7b93ee48ffa0', 'photo-1560148218-1a83060f7b32',
    'photo-1563223771-5fe4038fbfc9', 'photo-1556012018-50c5c0da73bf',
    'photo-1568213816046-0ee1c42bd559', 'photo-1576867757603-05b134ebc379',
    'photo-1549289524-06cf8837ace5', 'photo-1507003211169-0a1dd7228f2d',
  ],
  'sumive': [
    'photo-1547595628-c61a29f496f0', 'photo-1571115177098-24ec42ed204d',
    'photo-1592483648228-b35146a4330c', 'photo-1470158499416-75be9aa0c4db',
    'photo-1546427660-eb346c344ba5', 'photo-1590608897129-79da98d15969',
    'photo-1531973576160-7125cd663d86',
  ],
  'parovani-s-jidlem': [
    'photo-1414235077428-338989a2e8c0', 'photo-1504674900247-0877df9cc836',
    'photo-1466637574441-749b8f19452f', 'photo-1559847844-5315695dadae',
    'photo-1473116763249-2faaef81ccda', 'photo-1542359649-31e03cd4d909',
    'photo-1498429089284-41f8cf3ffd39', 'photo-1507823690283-48b0929e727b',
  ],
  'vinarske-regiony': [
    'photo-1506377247377-2a5b3b417ebb', 'photo-1464638681273-0962e9b53566',
    'photo-1560493676-04071c5f467b', 'photo-1507434965515-61970f2bd7c6',
    'photo-1635321593217-40050ad13c74', 'photo-1584225064785-c62a8b43d148',
    'photo-1566552881560-0be862a7c445', 'photo-1516684732162-798a0062be99',
  ],
  'tipy-a-triky': [
    'photo-1528823872057-9c018a7a7553', 'photo-1574180045827-681f8a1a9622',
    'photo-1574071318508-1cdbab80d002', 'photo-1561461056-77634126673a',
    'photo-1505275350441-83dcda8eeef5', 'photo-1550985543-49bee3167284',
  ],
};

function getRandomCategory() {
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getUsedImages() {
  try {
    const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
    const used = new Set();
    for (const f of files) {
      const content = readFileSync(join(ARTICLES_DIR, f), 'utf-8');
      const match = content.match(/^image:\s*"(.+)"/m);
      if (match) used.add(match[1]);
    }
    return used;
  } catch {
    return new Set();
  }
}

// All eshop products in a flat list for matching
const allEshopProducts = Object.values(products).flat()
  .filter((p, i, arr) => arr.findIndex(x => x.url === p.url) === i);

async function fetchProductImageUrl(productPageUrl) {
  try {
    const res = await fetch(productPageUrl);
    if (!res.ok) return null;
    const html = await res.text();
    // Look for the main product image on Shoptet CDN
    const match = html.match(/https:\/\/cdn\.myshoptet\.com\/usr\/www\.ustipcaku\.cz\/user\/shop\/big\/[^"'\s?]+\.(png|jpg|jpeg)/i);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

async function findMatchingProduct(client, articleContent, articleTitle, categorySlug) {
  const categoryProducts = products[categorySlug] || [];
  const allProducts = [...categoryProducts, ...allEshopProducts.filter(p => !categoryProducts.some(cp => cp.url === p.url))];

  const productList = allProducts.map(p => `- ${p.title} (${p.url})`).join('\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Na základě tohoto článku o víně urči, jestli se článek týká konkrétního vína nebo odrůdy, které máme v eshopu.

Titulek: ${articleTitle}
Začátek článku: ${articleContent.substring(0, 400)}

Dostupné produkty v eshopu:
${productList}

Pokud článek pojednává o konkrétním víně nebo odrůdě, která odpovídá některému produktu, vrať URL toho produktu.
Pokud ne (obecný článek, tipy, regiony bez konkrétní odrůdy), vrať "NONE".

Vrať POUZE jednu z těchto odpovědí:
- URL produktu (např. https://www.ustipcaku.cz/ryzlink-rynsky-2023/)
- NONE`
    }],
    system: 'Jsi vinařský expert. Odpovídej stručně — pouze URL nebo NONE.',
  });

  const answer = msg.content[0].text.trim();
  if (answer === 'NONE' || !answer.startsWith('http')) return null;

  const matchedProduct = allProducts.find(p => answer.includes(p.url) || p.url.includes(answer.replace(/\/$/, '')));
  return matchedProduct || null;
}

async function composeProductImage(productImageUrl, articleSlug) {
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  // Download product image
  const res = await fetch(productImageUrl);
  if (!res.ok) return null;
  const imageBuffer = Buffer.from(await res.arrayBuffer());

  // Trim white background from product photo and resize
  const trimmed = await sharp(imageBuffer)
    .trim({ threshold: 20 })
    .toBuffer();

  const maxHeight = 560;
  const maxWidth = 360;
  const resizedProduct = await sharp(trimmed)
    .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const resizedMeta = await sharp(resizedProduct).metadata();
  const productW = resizedMeta.width;
  const productH = resizedMeta.height;

  // Create drop shadow (slightly offset, blurred dark copy)
  const shadow = await sharp(resizedProduct)
    .modulate({ brightness: 0 })
    .blur(12)
    .ensureAlpha(0.4)
    .toBuffer();

  const offsetX = Math.round((1200 - productW) / 2);
  const offsetY = Math.round((720 - productH) / 2) - 10;

  // Create a wine-themed gradient background SVG
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

  // Compose: background + shadow + product image centered
  const outputPath = join(IMAGES_DIR, `${articleSlug}.jpg`);
  await sharp(Buffer.from(bgSvg))
    .composite([
      { input: shadow, left: offsetX + 8, top: offsetY + 8 },
      { input: resizedProduct, left: offsetX, top: offsetY },
    ])
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  console.log(`✓ Složený obrázek uložen: ${outputPath}`);
  return `/images/articles/${articleSlug}.jpg`;
}

async function verifyImageWithVision(client, imageUrl, categoryLabel, articleTitle) {
  try {
    const thumbUrl = imageUrl.replace('w=1200&h=720', 'w=400&h=300');
    const res = await fetch(thumbUrl);
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    const base64 = buffer.toString('base64');

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: `Tento obrázek bude použit jako hlavní fotka k článku "${articleTitle}" v kategorii "${categoryLabel}" na vinařském blogu. Odpovídá obrázek tematicky? Odpověz POUZE: OK nebo FAIL` }
        ]
      }],
    });

    const answer = msg.content[0].text.trim();
    console.log(`Vision check: ${answer}`);
    return answer.startsWith('OK');
  } catch (err) {
    console.warn(`Vision check selhal: ${err.message}`);
    return true; // Don't block on vision errors
  }
}

async function getValidPhoto(categorySlug, client, categoryLabel, articleTitle) {
  const usedImages = getUsedImages();
  // Combine category pool + all other pools as fallback
  const primaryPhotos = [...(unsplashPhotos[categorySlug] || unsplashPhotos['tipy-a-triky'])];
  const allPhotos = Object.values(unsplashPhotos).flat();
  const fallbackPhotos = allPhotos.filter(p => !primaryPhotos.includes(p));
  const photos = [...primaryPhotos, ...fallbackPhotos];
  const shuffled = photos.sort(() => Math.random() - 0.5);

  for (let attempt = 0; attempt < Math.min(shuffled.length, 10); attempt++) {
    const url = `https://images.unsplash.com/${shuffled[attempt]}?w=1200&h=720&fit=crop&q=80`;

    // Skip if already used by another article
    if (usedImages.has(url)) {
      console.log(`Obrázek ${shuffled[attempt]} už je použitý, přeskakuji...`);
      continue;
    }

    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        console.log(`Obrázek OK (pokus ${attempt + 1}): ${shuffled[attempt]}`);
        // Vision check - verify image matches article topic
        if (client && articleTitle) {
          const visionOk = await verifyImageWithVision(client, url, categoryLabel, articleTitle);
          if (!visionOk) {
            console.warn(`  ✗ Vision check: obrázek nesedí k článku, zkouším další...`);
            continue;
          }
        }
        return url;
      }
      console.warn(`Obrázek ${shuffled[attempt]} vrátil ${res.status}, zkouším další...`);
    } catch (err) {
      console.warn(`Obrázek ${shuffled[attempt]} selhal: ${err.message}, zkouším další...`);
    }
  }

  return null;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomPublishDate() {
  // Random day within the next 7 days
  const now = new Date();
  const daysAhead = Math.floor(Math.random() * 7);
  const date = new Date(now);
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

function getExistingTitles() {
  try {
    const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
    return files.map(f => f.replace('.md', ''));
  } catch {
    return [];
  }
}

async function generateArticle() {
  const client = new Anthropic();
  const category = getRandomCategory();
  const date = randomPublishDate();
  const existingTitles = getExistingTitles();

  const categoryProducts = products[category.slug] || products['tipy-a-triky'];
  const selectedProducts = getRandomItems(categoryProducts, Math.min(3, categoryProducts.length));

  const productLinksYaml = selectedProducts
    .map(p => `  - title: "${p.title}"\n    url: "${p.url}"`)
    .join('\n');

  const systemPrompt = `Jsi zkušený vinařský blogger píšící pro moravské vinařství U Štipčáků (ustipcaku.cz).
Píšeš odborné, ale přístupné články o víně v češtině. Zaměřuješ se na moravská vína,
ale máš přehled o vinařství celkově. Tvé články jsou informativní, praktické a čtivé.
Nikdy nepoužívej generické fráze ani klišé. Piš autenticky jako skutečný vinař.`;

  const userPrompt = `Napiš článek do kategorie "${category.label}" pro vinařský blog.

Tyto články už existují, NEOPAKUJ stejná témata:
${existingTitles.slice(-20).join(', ')}

Požadavky:
- Článek musí být unikátní a zajímavý, jiné téma než existující články
- Délka: 600–900 slov
- Používej nadpisy h2 a h3
- Zahrň praktické tipy
- Zmiň konkrétní odrůdy a vinařské termíny
- Zaměř se na moravské vinařství kde to dává smysl
- Na konci doporuč návštěvu eshopu ustipcaku.cz

Vrať POUZE obsah článku v Markdownu (BEZ frontmatter, začni rovnou textem článku).
Nezahrnuj title ani žádné YAML --- bloky.
První řádek by měl být úvodní odstavec, pak h2/h3 nadpisy.`;

  console.log(`Generuji článek v kategorii: ${category.label}...`);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: userPrompt }],
    system: systemPrompt,
  });

  const articleContent = message.content[0].text;

  // Generate title via a second short call
  const titleMessage = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Na základě tohoto článku vygeneruj:
1. Krátký, chytlavý český titulek (max 60 znaků)
2. SEO popis (max 155 znaků)
3. 3-4 relevantní tagy

Vrať PŘESNĚ v tomto formátu (nic jiného):
TITLE: titulek
DESC: popis
TAGS: tag1, tag2, tag3

Článek:
${articleContent.substring(0, 500)}`,
    }],
    system: 'Jsi SEO specialista pro vinařský blog. Odpovídej stručně a přesně v požadovaném formátu.',
  });

  const metaText = titleMessage.content[0].text;
  const titleLine = metaText.match(/TITLE:\s*(.+)/)?.[1]?.trim() || `Článek o víně ${date}`;
  const descLine = metaText.match(/DESC:\s*(.+)/)?.[1]?.trim() || 'Zajímavý článek o víně z moravského vinařství U Štipčáků.';
  const tagsLine = metaText.match(/TAGS:\s*(.+)/)?.[1]?.trim() || 'víno, morava';
  const tags = tagsLine.split(',').map(t => t.trim()).filter(Boolean);

  const slug = slugify(titleLine);

  // --- Image selection: try eshop product photo first, then Unsplash ---
  let image = null;

  // Step 1: Check if article is about a specific wine/variety from the eshop
  console.log('Hledám odpovídající produkt v eshopu...');
  const matchedProduct = await findMatchingProduct(client, articleContent, titleLine, category.slug);

  if (matchedProduct) {
    console.log(`  Nalezen produkt: ${matchedProduct.title} (${matchedProduct.url})`);
    const productImageUrl = await fetchProductImageUrl(matchedProduct.url);
    if (productImageUrl) {
      console.log(`  Fotka produktu: ${productImageUrl}`);
      try {
        image = await composeProductImage(productImageUrl, slug);
        if (image) {
          console.log(`  ✓ Obrázek složen z produktové fotky eshopu`);
        }
      } catch (err) {
        console.warn(`  ✗ Kompozice selhala: ${err.message}`);
      }
    } else {
      console.log('  ✗ Produktová fotka nenalezena na stránce');
    }
  } else {
    console.log('  Článek není o konkrétním produktu z eshopu');
  }

  // Step 2: Fallback to Unsplash with Vision check
  if (!image) {
    console.log('Hledám vhodný obrázek z Unsplash...');
    image = await getValidPhoto(category.slug, client, category.label, titleLine);
  }

  if (!image) {
    const errorMsg = `[${date}] Nepodařilo se najít funkční obrázek pro kategorii "${category.label}" po 10 pokusech. Článek nebyl publikován.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const filename = `${slug}.md`;
  const filepath = join(ARTICLES_DIR, filename);

  // Check for duplicate filename
  if (existingTitles.includes(slug)) {
    console.log(`Článek "${titleLine}" už existuje, přidávám datum...`);
    const uniqueFilename = `${slug}-${date}.md`;
    const uniqueFilepath = join(ARTICLES_DIR, uniqueFilename);
    const reviewedContent = await reviewArticle(client, titleLine, descLine, category.label, image, articleContent);
    writeArticle(uniqueFilepath, reviewedContent.title, reviewedContent.description, date, category, tags, image, productLinksYaml, reviewedContent.content);
    return { filepath: uniqueFilepath, filename: uniqueFilename, title: reviewedContent.title };
  }

  // Review article before saving
  const reviewedContent = await reviewArticle(client, titleLine, descLine, category.label, image, articleContent);

  writeArticle(filepath, reviewedContent.title, reviewedContent.description, date, category, tags, image, productLinksYaml, reviewedContent.content);
  return { filepath, filename, title: reviewedContent.title };
}

async function reviewArticle(client, title, description, categoryLabel, imageUrl, content) {
  console.log('Spouštím review článku...');

  const reviewPrompt = `Zkontroluj tento český článek o víně pro vinařský blog. Proveď tyto kontroly:

1. **Gramatika a pravopis**: Oprav všechny gramatické chyby, překlepy a špatnou diakritiku v češtině.
2. **Kontext a fakta**: Ověř, že vinařské informace jsou věcně správné (odrůdy, regiony, techniky).
3. **Kvalita textu**: Odstraň generické fráze, klišé a opakování. Text musí znít autenticky.
4. **YAML bezpečnost**: Zkontroluj, že title a description neobsahují znaky, které by rozbily YAML frontmatter (zejména uvozovky " uvnitř textu — nahraď je).
5. **Relevance obrázku**: Obrázek je z Unsplash s URL: ${imageUrl}
   - Kategorie článku: ${categoryLabel}
   - Zhodnoť, zda tematicky sedí k článku o víně v dané kategorii.

Titulek: ${title}
Popis: ${description}

Článek:
${content}

Vrať PŘESNĚ v tomto formátu:
IMAGE_OK: true/false
IMAGE_NOTE: (krátká poznámka proč obrázek sedí/nesedí)
TITLE: (opravený titulek, nebo původní pokud je OK)
DESC: (opravený popis, nebo původní pokud je OK)
CONTENT_START
(celý opravený text článku v Markdownu)
CONTENT_END`;

  const reviewMessage = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: reviewPrompt }],
    system: 'Jsi zkušený český korektor a vinařský expert. Opravuj pečlivě gramatiku, fakta a styl. Vracíš opravený text v požadovaném formátu.',
  });

  const reviewText = reviewMessage.content[0].text;

  const imageOk = reviewText.match(/IMAGE_OK:\s*(true|false)/)?.[1] === 'true';
  const imageNote = reviewText.match(/IMAGE_NOTE:\s*(.+)/)?.[1]?.trim() || '';
  const reviewedTitle = reviewText.match(/TITLE:\s*(.+)/)?.[1]?.trim() || title;
  const reviewedDesc = reviewText.match(/DESC:\s*(.+)/)?.[1]?.trim() || description;
  const contentMatch = reviewText.match(/CONTENT_START\n([\s\S]*?)\nCONTENT_END/);
  const reviewedContent = contentMatch?.[1]?.trim() || content;

  if (!imageOk) {
    console.warn(`⚠ Obrázek nemusí sedět k článku: ${imageNote}`);
  } else {
    console.log(`✓ Obrázek OK: ${imageNote}`);
  }

  console.log('✓ Review dokončeno');

  // Sanitize title and description for YAML safety
  const safeTitle = reviewedTitle.replace(/"/g, "'");
  const safeDesc = reviewedDesc.replace(/"/g, "'");

  return { title: safeTitle, description: safeDesc, content: reviewedContent, imageOk, imageNote };
}

function writeArticle(filepath, title, description, date, category, tags, image, productLinksYaml, content) {
  const tagsYaml = tags.map(t => `"${t}"`).join(', ');
  const frontmatter = `---
title: "${title}"
description: "${description}"
date: ${date}
category: "${category.slug}"
categoryLabel: "${category.label}"
tags: [${tagsYaml}]
image: "${image}"
productLinks:
${productLinksYaml}
---`;

  const fullContent = `${frontmatter}\n\n${content}`;
  writeFileSync(filepath, fullContent, 'utf-8');
  console.log(`Článek uložen: ${filepath}`);
}

generateArticle()
  .then(({ title, filename }) => {
    console.log(`Hotovo! "${title}" → ${filename}`);
  })
  .catch(err => {
    console.error('Chyba při generování:', err);
    process.exit(1);
  });
