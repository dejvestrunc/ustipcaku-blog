import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');

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
    'photo-1558642452-9d2a7deb7f62',
    'photo-1474722883778-792e7990302f',
    'photo-1598306442928-4d90f32c6866',
  ],
  'cervene-vino': [
    'photo-1606767351797-1664b860ae5a', 'photo-1510812431401-41d2bd2722f3',
    'photo-1553361371-9b22f78e8b1d', 'photo-1586370434639-0fe43b2d32e6',
    'photo-1567696911980-2eed69a46042', 'photo-1578911373434-0cb395d2cbfb',
    'photo-1516594915697-87eb3b1c14ea',
  ],
  'rose': [
    'photo-1558001373-7b93ee48ffa0', 'photo-1560148218-1a83060f7b32',
    'photo-1563223771-5fe4038fbfc9', 'photo-1556012018-50c5c0da73bf',
  ],
  'sumive': [
    'photo-1547595628-c61a29f496f0', 'photo-1571115177098-24ec42ed204d',
    'photo-1592483648228-b35146a4330c',
  ],
  'parovani-s-jidlem': [
    'photo-1414235077428-338989a2e8c0', 'photo-1504674900247-0877df9cc836',
    'photo-1466637574441-749b8f19452f',
    'photo-1559847844-5315695dadae',
  ],
  'vinarske-regiony': [
    'photo-1506377247377-2a5b3b417ebb', 'photo-1464638681273-0962e9b53566',
    'photo-1560493676-04071c5f467b',
    'photo-1507434965515-61970f2bd7c6',
  ],
  'tipy-a-triky': [
    'photo-1528823872057-9c018a7a7553', 'photo-1586370434639-0fe43b2d32e6',
    'photo-1574180045827-681f8a1a9622',
    'photo-1574071318508-1cdbab80d002',
  ],
};

function getRandomCategory() {
  return categories[Math.floor(Math.random() * categories.length)];
}

function getRandomItems(arr, count) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

async function getValidPhoto(categorySlug) {
  const photos = [...(unsplashPhotos[categorySlug] || unsplashPhotos['tipy-a-triky'])];
  const shuffled = photos.sort(() => Math.random() - 0.5);

  for (let attempt = 0; attempt < Math.min(shuffled.length, 10); attempt++) {
    const url = `https://images.unsplash.com/${shuffled[attempt]}?w=1200&h=720&fit=crop&q=80`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        console.log(`Obrázek OK (pokus ${attempt + 1}): ${shuffled[attempt]}`);
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

function todayISO() {
  return new Date().toISOString().split('T')[0];
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
  const date = todayISO();
  const image = await getValidPhoto(category.slug);

  if (!image) {
    const errorMsg = `[${date}] Nepodařilo se najít funkční obrázek pro kategorii "${category.label}" po 10 pokusech. Článek nebyl publikován.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const categoryProducts = products[category.slug] || products['tipy-a-triky'];
  const selectedProducts = getRandomItems(categoryProducts, Math.min(3, categoryProducts.length));
  const existingTitles = getExistingTitles();

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
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
  });

  const articleContent = message.content[0].text;

  // Generate title via a second short call
  const titleMessage = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    messages: [
      {
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
      },
    ],
    system: 'Jsi SEO specialista pro vinařský blog. Odpovídej stručně a přesně v požadovaném formátu.',
  });

  const metaText = titleMessage.content[0].text;
  const titleLine = metaText.match(/TITLE:\s*(.+)/)?.[1]?.trim() || `Článek o víně ${date}`;
  const descLine = metaText.match(/DESC:\s*(.+)/)?.[1]?.trim() || 'Zajímavý článek o víně z moravského vinařství U Štipčáků.';
  const tagsLine = metaText.match(/TAGS:\s*(.+)/)?.[1]?.trim() || 'víno, morava';
  const tags = tagsLine.split(',').map(t => t.trim()).filter(Boolean);

  const filename = `${slugify(titleLine)}.md`;
  const filepath = join(ARTICLES_DIR, filename);

  // Check for duplicate filename
  if (existingTitles.includes(slugify(titleLine))) {
    console.log(`Článek "${titleLine}" už existuje, přidávám datum...`);
    const uniqueFilename = `${slugify(titleLine)}-${date}.md`;
    const uniqueFilepath = join(ARTICLES_DIR, uniqueFilename);
    writeArticle(uniqueFilepath, titleLine, descLine, date, category, tags, image, productLinksYaml, articleContent);
    return { filepath: uniqueFilepath, filename: uniqueFilename, title: titleLine };
  }

  writeArticle(filepath, titleLine, descLine, date, category, tags, image, productLinksYaml, articleContent);
  return { filepath, filename, title: titleLine };
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
