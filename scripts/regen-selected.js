import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');
const IMAGES_DIR = join(__dirname, '..', 'public', 'images', 'articles');

const FAL_KEY = process.env.FAL_KEY;
if (!FAL_KEY) { console.error('FAL_KEY not set'); process.exit(1); }

const claude = new Anthropic();

// Sharp-composed articles (from commit bf2f5a1)
const sharpComposed = [
  'dub-a-bila-vina-jak-dubovani-meni-moravske-vino',
  'frankovka-kralovna-moravskych-cervenych',
  'frizzante-lehce-sumive-vino-bez-praskani-korku',
  'jak-parovat-moravsky-ryzlink-s-jidlem',
  'malolakticka-fermentace-tajemstvi-kremovych-bilych-vin',
  'moravske-sumive-vino-od-frizzante-po-sekty-metodou-klasik',
  'palava-vinarska-oblast',
  'pruvodce-bilymi-viny-od-ryzlinku-po-chardonnay',
];

// 15 newest articles by date
const newest15 = [
  'mlade-vino-z-moravy-tradice-cerstve-chuti-nove-urody',
  'dub-a-bila-vina-jak-dubovani-meni-moravske-vino',
  'znojemska-vinarska-podoblast-prestizni-region-jizni-moravy',
  'jak-parovat-moravsky-ryzlink-s-jidlem',
  'pruvodce-moravskymi-bilymi-viny',
  'jak-vznika-barva-cervenych-vin-tajemstvi-antokyaninu',
  'cervene-vino-pro-zacatecniky',
  'rose-neni-jen-letni-vino',
  'co-je-to-terroir',
  'sumive-vino-vs-sekt-vs-prosecco',
  'vino-a-cokolada-neobvykle-parovani',
  'vinarske-stezky-jizni-moravy',
  'moravske-rose-pruvodce-vyberem-kvalitniho-ruzoveho-vina',
  'jak-spravne-skladovat-vino-doma',
  'frizzante-lehce-sumive-vino-bez-praskani-korku',
];

// Merge and deduplicate
const toRegenerate = [...new Set([...sharpComposed, ...newest15])];

const compositions = [
  'wide landscape panorama of Moravian vineyard hills',
  'close-up macro of grape clusters with morning dew',
  'old wine cellar with oak barrels and candlelight',
  'bird-eye view of vineyard rows creating geometric patterns',
  'rustic still life with wine, bread, cheese on wooden table',
  'grape harvest scene with wicker baskets and hands picking grapes',
  'sunset over South Moravian countryside with vineyard silhouettes',
  'ancient wine press or traditional winemaking tools',
  'wine glass reflection with vineyard landscape visible through it',
  'Moravian village street with traditional wine cellars (sklípky)',
  'grapevine tendrils and leaves in dramatic backlight',
  'rolling hills with patchwork of vineyards in autumn colors',
  'underground barrel cellar with arched stone ceiling',
  'dew-covered spider web between grapevines at dawn',
  'traditional Moravian folk pottery filled with wine',
  'aerial view of winding path through vineyard terraces',
];

async function generateImagePrompt(title, category, content, index) {
  const compositionHint = compositions[index % compositions.length];

  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Na základě tohoto článku o víně vytvoř prompt pro AI generování fotky (Flux model).
Fotka bude hlavní obrázek článku na vinařském blogu z jižní Moravy.

Titulek: ${title}
Kategorie: ${category}
Začátek článku: ${content.substring(0, 600)}

VIZUÁLNÍ KOMPOZICE (použij jako inspiraci, přizpůsob obsahu článku):
${compositionHint}

STYL (POVINNÝ):
- Styl: digitální malba / ilustrace inspirovaná moravským folklórem
- Teplé, bohaté barvy (vínová, zlatá, okrová, tmavě zelená)
- Jemné folklorní ornamenty nebo vzory v pozadí nebo okrajích (výšivka, květinové motivy)
- Atmosféra: nostalgická, poetická, jako z moravské pohádky
- Textura: viditelné tahy štětce, akvarel nebo olejové barvy
- NIKDY neopakuj stejnou kompozici — každý obrázek musí být vizuálně unikátní

ZAKÁZÁNO:
- Žádné lahve s etiketami, žádná loga, žádný text, žádná písmenka
- Žádné fotorealistické fotografie — vždy malovaný/ilustrovaný styl
- Nepoužívej "photograph" nebo "photo" v promptu

Vrať POUZE prompt v angličtině, nic jiného.`
    }],
    system: 'Jsi expert na AI image generation prompty pro ilustrovaný/malířský styl s folklórními prvky. Vracíš pouze prompt, bez komentáře.',
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

  console.log(`Regenerace ${toRegenerate.length} článků\n`);

  let generated = 0;
  let failed = 0;

  for (let idx = 0; idx < toRegenerate.length; idx++) {
    const slug = toRegenerate[idx];
    const file = `${slug}.md`;
    const filePath = join(ARTICLES_DIR, file);

    if (!existsSync(filePath)) {
      console.log(`\n[skip] ${slug} — soubor neexistuje`);
      continue;
    }

    const content = readFileSync(filePath, 'utf8');
    const title = content.match(/^title:\s*"(.+)"/m)?.[1] || slug;
    const category = content.match(/^categoryLabel:\s*"(.+)"/m)?.[1] || 'Víno';

    console.log(`\n[${idx + 1}/${toRegenerate.length}] ${title}`);

    try {
      console.log('  Generating prompt...');
      const prompt = await generateImagePrompt(title, category, content, idx);
      console.log(`  Prompt: ${prompt.substring(0, 120)}...`);

      console.log('  Generating image...');
      const imageUrl = await falGenerate(prompt);

      const outputPath = join(IMAGES_DIR, `${slug}.jpg`);
      await downloadImage(imageUrl, outputPath);

      console.log(`  ✓ /images/articles/${slug}.jpg`);
      generated++;

    } catch (err) {
      console.error(`  ✗ ${err.message}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Vygenerováno: ${generated}/${toRegenerate.length}`);
  console.log(`Selhalo: ${failed}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
