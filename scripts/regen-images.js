import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');
const IMAGES_DIR = join(__dirname, '..', 'public', 'images', 'articles');

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error('FAL_KEY not set'); process.exit(1); }

const claude = new Anthropic();

async function generateImagePrompt(title, category, content) {
  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Na základě tohoto článku o víně vytvoř prompt pro AI generování fotky (Flux model).
Fotka bude hlavní obrázek článku na vinařském blogu.

Titulek: ${title}
Kategorie: ${category}
Začátek článku: ${content.substring(0, 600)}

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

async function falGenerate(prompt) {
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

async function downloadImage(url, outputPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outputPath, buf);
}

async function main() {
  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));
  console.log(`Nalezeno ${files.length} článků\n`);

  let generated = 0;
  let failed = 0;

  for (const file of files) {
    const slug = file.replace('.md', '');
    const content = readFileSync(join(ARTICLES_DIR, file), 'utf8');
    const titleMatch = content.match(/^title:\s*"(.+)"/m);
    const catMatch = content.match(/^categoryLabel:\s*"(.+)"/m);
    const title = titleMatch?.[1] || slug;
    const category = catMatch?.[1] || 'Víno';

    // Skip already regenerated
    const currentImage = content.match(/^image:\s*"([^"]+)"/m)?.[1] || '';
    if (currentImage.startsWith('/images/articles/')) {
      console.log(`\n[skip] ${title} — already done`);
      generated++;
      continue;
    }

    console.log(`\n[${generated + failed + 1}/${files.length}] ${title}`);

    try {
      // Step 1: Claude generates image prompt from article context
      console.log('  Generating prompt...');
      const prompt = await generateImagePrompt(title, category, content);
      console.log(`  Prompt: ${prompt.substring(0, 100)}...`);

      // Step 2: fal.ai generates the image
      console.log('  Generating image...');
      const imageUrl = await falGenerate(prompt);

      // Step 3: Download and save
      const outputPath = join(IMAGES_DIR, `${slug}.jpg`);
      await downloadImage(imageUrl, outputPath);
      const imagePath = `/images/articles/${slug}.jpg`;

      // Step 4: Update article frontmatter
      const updated = content.replace(/^image:\s*"[^"]+"/m, `image: "${imagePath}"`);
      writeFileSync(join(ARTICLES_DIR, file), updated, 'utf8');

      console.log(`  ✓ ${imagePath}`);
      generated++;

    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Vygenerováno: ${generated}/${files.length}`);
  console.log(`Selhalo: ${failed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
