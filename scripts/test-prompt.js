import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');

const claude = new Anthropic();

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

const file = process.argv[2] || 'frankovka-kralovna-moravskych-cervenych.md';
const compositionIndex = parseInt(process.argv[3] || '0');

const content = readFileSync(join(ARTICLES_DIR, file), 'utf8');
const title = content.match(/^title:\s*"(.+)"/m)?.[1] || file;
const category = content.match(/^categoryLabel:\s*"(.+)"/m)?.[1] || 'Víno';
const compositionHint = compositions[compositionIndex % compositions.length];

console.log(`Článek: ${title}`);
console.log(`Kategorie: ${category}`);
console.log(`Kompozice: ${compositionHint}\n`);

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

const prompt = msg.content[0].text.trim();
console.log('=== VYGENEROVANÝ PROMPT ===\n');
console.log(prompt);
