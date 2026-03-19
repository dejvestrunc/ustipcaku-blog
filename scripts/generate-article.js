import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'fs';
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

function getRandomCategory() {
  return categories[Math.floor(Math.random() * categories.length)];
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

async function generateArticle() {
  const client = new Anthropic();
  const category = getRandomCategory();
  const date = todayISO();

  const systemPrompt = `Jsi zkušený vinařský blogger píšící pro moravské vinařství U Štipčáků (ustipcaku.cz).
Píšeš odborné, ale přístupné články o víně v češtině. Zaměřuješ se na moravská vína,
ale máš přehled o vinařství celkově. Tvé články jsou informativní, praktické a čtivé.
Nikdy nepoužívej generické fráze ani klišé. Piš autenticky jako skutečný vinař.`;

  const userPrompt = `Napiš článek do kategorie "${category.label}" pro vinařský blog.

Požadavky:
- Článek musí být unikátní a zajímavý
- Délka: 600–900 slov
- Používej nadpisy h2 a h3
- Zahrň praktické tipy
- Zmiň konkrétní odrůdy a vinařské termíny
- Zaměř se na moravské vinařství kde to dává smysl
- Na konci doporuč návštěvu eshopu ustipcaku.cz

Vrať odpověď PŘESNĚ v tomto formátu (nic jiného):

---
title: "Titulek článku"
description: "Krátký popis článku pro SEO (max 160 znaků)"
date: ${date}
category: "${category.slug}"
categoryLabel: "${category.label}"
tags: ["tag1", "tag2", "tag3"]
productLinks:
  - title: "Název produktu"
    url: "https://www.ustipcaku.cz"
---

Obsah článku v Markdownu...`;

  console.log(`Generuji článek v kategorii: ${category.label}...`);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [
      { role: 'user', content: userPrompt },
    ],
    system: systemPrompt,
  });

  const content = message.content[0].text;

  // Extract title from frontmatter for filename
  const titleMatch = content.match(/title:\s*"(.+?)"/);
  const title = titleMatch ? titleMatch[1] : `clanek-${date}`;
  const filename = `${slugify(title)}.md`;
  const filepath = join(ARTICLES_DIR, filename);

  writeFileSync(filepath, content, 'utf-8');
  console.log(`Článek uložen: ${filepath}`);

  return { filepath, filename, title };
}

generateArticle()
  .then(({ title, filename }) => {
    console.log(`Hotovo! "${title}" → ${filename}`);
  })
  .catch(err => {
    console.error('Chyba při generování:', err);
    process.exit(1);
  });
