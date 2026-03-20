import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');
const IMAGES_DIR = join(__dirname, '..', 'public', 'images', 'articles');

const FAL_KEY = process.env.FAL_KEY;

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

// Unsplash fallback photo IDs per category
const unsplashPhotos = {
  'bile-vino': ['photo-1558642452-9d2a7deb7f62', 'photo-1474722883778-792e7990302f', 'photo-1485637701894-09ad422f6de6'],
  'cervene-vino': ['photo-1510812431401-41d2bd2722f3', 'photo-1553361371-9b22f78e8b1d', 'photo-1567696911980-2eed69a46042'],
  'rose': ['photo-1558001373-7b93ee48ffa0', 'photo-1560148218-1a83060f7b32', 'photo-1568213816046-0ee1c42bd559'],
  'sumive': ['photo-1547595628-c61a29f496f0', 'photo-1571115177098-24ec42ed204d', 'photo-1592483648228-b35146a4330c'],
  'parovani-s-jidlem': ['photo-1414235077428-338989a2e8c0', 'photo-1504674900247-0877df9cc836', 'photo-1466637574441-749b8f19452f'],
  'vinarske-regiony': ['photo-1506377247377-2a5b3b417ebb', 'photo-1464638681273-0962e9b53566', 'photo-1560493676-04071c5f467b'],
  'tipy-a-triky': ['photo-1528823872057-9c018a7a7553', 'photo-1574180045827-681f8a1a9622', 'photo-1574071318508-1cdbab80d002'],
};

function getRandomCategory() {
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function slugify(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function randomPublishDate() {
  const now = new Date();
  const daysAhead = Math.floor(Math.random() * 7);
  const date = new Date(now);
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().split('T')[0];
}

function getExistingTitles() {
  try {
    return readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
  } catch { return []; }
}

// --- Image generation via fal.ai ---

async function generateImagePrompt(client, title, categoryLabel, articleContent) {
  const msg = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Na základě tohoto článku o víně vytvoř prompt pro AI generování fotky (Flux model).
Fotka bude hlavní obrázek článku na vinařském blogu.

Titulek: ${title}
Kategorie: ${categoryLabel}
Začátek článku: ${articleContent.substring(0, 600)}

Pravidla:
- Prompt v angličtině
- Popisuj scénu, náladu, světlo, kompozici
- Žádné lahve s etiketami, žádná loga, žádný text
- Může obsahovat: sklenice vína, vinice, sklep, jídlo, hrozny, sudy, krajinu
- Styl: profesionální editorial/food photography, moody, shallow depth of field
- Vždy přidej "4k quality, professional editorial photography"

Vrať POUZE prompt, nic jiného.`
    }],
    system: 'Jsi expert na AI image generation prompty. Vracíš pouze prompt, bez komentáře.',
  });
  return msg.content[0].text.trim();
}

async function falGenerateImage(prompt) {
  const resp = await fetch('https://queue.fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, image_size: 'landscape_16_9', num_images: 1 }),
  });
  const data = await resp.json();
  const reqId = data.request_id;
  if (!reqId) throw new Error(`fal.ai error: ${JSON.stringify(data)}`);

  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const res = await fetch(`https://queue.fal.run/fal-ai/flux-pro/requests/${reqId}`, {
      headers: { 'Authorization': `Key ${FAL_KEY}` },
    });
    const result = await res.json();
    if (result.images?.[0]?.url) return result.images[0].url;
    if (result.status !== 'IN_QUEUE' && result.status !== 'IN_PROGRESS' && !result.detail?.includes('still in progress')) {
      throw new Error(`fal.ai failed: ${JSON.stringify(result)}`);
    }
  }
  throw new Error('fal.ai timeout');
}

async function generateAIImage(client, title, categoryLabel, articleContent, slug) {
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  console.log('Generuji image prompt...');
  const prompt = await generateImagePrompt(client, title, categoryLabel, articleContent);
  console.log(`  Prompt: ${prompt.substring(0, 80)}...`);

  console.log('Generuji obrázek přes fal.ai Flux...');
  const imageUrl = await falGenerateImage(prompt);

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const outputPath = join(IMAGES_DIR, `${slug}.jpg`);
  writeFileSync(outputPath, buf);

  console.log(`✓ AI obrázek uložen: ${outputPath}`);
  return `/images/articles/${slug}.jpg`;
}

// --- Unsplash fallback ---

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
  } catch { return new Set(); }
}

async function getUnsplashFallback(categorySlug) {
  const usedImages = getUsedImages();
  const photos = [...(unsplashPhotos[categorySlug] || unsplashPhotos['tipy-a-triky'])];
  const shuffled = photos.sort(() => Math.random() - 0.5);

  for (const photoId of shuffled) {
    const url = `https://images.unsplash.com/${photoId}?w=1200&h=720&fit=crop&q=80`;
    if (usedImages.has(url)) continue;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) return url;
    } catch { /* skip */ }
  }
  return null;
}

// --- Main ---

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

  // Generate title + meta
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

  // --- Image: fal.ai primary, Unsplash fallback ---
  let image = null;

  if (FAL_KEY) {
    try {
      image = await generateAIImage(client, titleLine, category.label, articleContent, slug);
    } catch (err) {
      console.warn(`⚠ AI generování selhalo: ${err.message}`);
    }
  } else {
    console.log('FAL_KEY není nastavený, přeskakuji AI generování obrázků');
  }

  if (!image) {
    console.log('Fallback: hledám obrázek z Unsplash...');
    image = await getUnsplashFallback(category.slug);
  }

  if (!image) {
    throw new Error(`Nepodařilo se najít obrázek pro článek "${titleLine}". Článek nebyl publikován.`);
  }

  // Review article
  const reviewedContent = await reviewArticle(client, titleLine, descLine, category.label, articleContent);

  const filename = `${slug}.md`;
  let filepath = join(ARTICLES_DIR, filename);

  if (existingTitles.includes(slug)) {
    console.log(`Článek "${titleLine}" už existuje, přidávám datum...`);
    filepath = join(ARTICLES_DIR, `${slug}-${date}.md`);
  }

  writeArticle(filepath, reviewedContent.title, reviewedContent.description, date, category, tags, image, productLinksYaml, reviewedContent.content);
  return { filepath, filename: filepath.split('/').pop(), title: reviewedContent.title };
}

async function reviewArticle(client, title, description, categoryLabel, content) {
  console.log('Spouštím review článku...');

  const reviewPrompt = `Zkontroluj tento český článek o víně pro vinařský blog. Proveď tyto kontroly:

1. **Gramatika a pravopis**: Oprav všechny gramatické chyby, překlepy a špatnou diakritiku v češtině.
2. **Kontext a fakta**: Ověř, že vinařské informace jsou věcně správné (odrůdy, regiony, techniky).
3. **Kvalita textu**: Odstraň generické fráze, klišé a opakování. Text musí znít autenticky.
4. **YAML bezpečnost**: Zkontroluj, že title a description neobsahují znaky, které by rozbily YAML frontmatter (zejména uvozovky " uvnitř textu — nahraď je).

Titulek: ${title}
Popis: ${description}

Článek:
${content}

Vrať PŘESNĚ v tomto formátu:
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
  const reviewedTitle = reviewText.match(/TITLE:\s*(.+)/)?.[1]?.trim() || title;
  const reviewedDesc = reviewText.match(/DESC:\s*(.+)/)?.[1]?.trim() || description;
  const contentMatch = reviewText.match(/CONTENT_START\n([\s\S]*?)\nCONTENT_END/);
  const reviewedContent = contentMatch?.[1]?.trim() || content;

  console.log('✓ Review dokončeno');

  const safeTitle = reviewedTitle.replace(/"/g, "'");
  const safeDesc = reviewedDesc.replace(/"/g, "'");

  return { title: safeTitle, description: safeDesc, content: reviewedContent };
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

  writeFileSync(filepath, `${frontmatter}\n\n${content}`, 'utf-8');
  console.log(`Článek uložen: ${filepath}`);
}

generateArticle()
  .then(({ title, filename }) => {
    console.log(`\nHotovo! "${title}" → ${filename}`);
  })
  .catch(err => {
    console.error('Chyba při generování:', err);
    process.exit(1);
  });
