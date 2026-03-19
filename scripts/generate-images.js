import { writeFileSync, readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');
const IMAGES_DIR = join(__dirname, '..', 'public', 'images', 'articles');

// Wine-themed icons as SVG paths
const icons = {
  'bile-vino': {
    icon: `<path d="M60 25 L60 55 Q60 75 50 80 Q40 75 40 55 L40 25 Z" fill="none" stroke="currentColor" stroke-width="2"/>
           <path d="M42 45 Q50 55 58 45" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.6"/>
           <line x1="50" y1="80" x2="50" y2="95" stroke="currentColor" stroke-width="2"/>
           <line x1="40" y1="95" x2="60" y2="95" stroke="currentColor" stroke-width="2"/>`,
    gradient: ['#f7e7ce', '#e8d5b0'],
  },
  'cervene-vino': {
    icon: `<path d="M60 25 L60 55 Q60 75 50 80 Q40 75 40 55 L40 25 Z" fill="none" stroke="currentColor" stroke-width="2"/>
           <path d="M42 40 L58 40 L58 55 Q58 73 50 78 Q42 73 42 55 Z" fill="currentColor" opacity="0.3"/>
           <line x1="50" y1="80" x2="50" y2="95" stroke="currentColor" stroke-width="2"/>
           <line x1="40" y1="95" x2="60" y2="95" stroke="currentColor" stroke-width="2"/>`,
    gradient: ['#4a0008', '#2d0005'],
  },
  'rose': {
    icon: `<path d="M60 25 L60 55 Q60 75 50 80 Q40 75 40 55 L40 25 Z" fill="none" stroke="currentColor" stroke-width="2"/>
           <path d="M42 45 L58 45 L58 55 Q58 73 50 78 Q42 73 42 55 Z" fill="currentColor" opacity="0.2"/>
           <line x1="50" y1="80" x2="50" y2="95" stroke="currentColor" stroke-width="2"/>
           <line x1="40" y1="95" x2="60" y2="95" stroke="currentColor" stroke-width="2"/>`,
    gradient: ['#f5c6d0', '#e8a0b0'],
  },
  'sumive': {
    icon: `<path d="M55 30 L58 55 Q58 75 50 80 Q42 75 42 55 L45 30 Z" fill="none" stroke="currentColor" stroke-width="2"/>
           <circle cx="48" cy="50" r="1.5" fill="currentColor" opacity="0.4"/>
           <circle cx="52" cy="55" r="1" fill="currentColor" opacity="0.3"/>
           <circle cx="50" cy="45" r="1" fill="currentColor" opacity="0.5"/>
           <circle cx="46" cy="58" r="1.5" fill="currentColor" opacity="0.3"/>
           <circle cx="54" cy="48" r="1" fill="currentColor" opacity="0.4"/>
           <line x1="50" y1="80" x2="50" y2="95" stroke="currentColor" stroke-width="2"/>
           <line x1="40" y1="95" x2="60" y2="95" stroke="currentColor" stroke-width="2"/>`,
    gradient: ['#fef9e7', '#f5ecd0'],
  },
  'parovani-s-jidlem': {
    icon: `<path d="M35 35 L35 70" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <path d="M40 35 L40 50 Q40 55 35 55" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <path d="M30 35 L30 50 Q30 55 35 55" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <circle cx="58" cy="55" r="15" fill="none" stroke="currentColor" stroke-width="2"/>
           <path d="M52 50 Q58 45 64 50 Q58 55 52 50" fill="currentColor" opacity="0.3"/>`,
    gradient: ['#fef3e2', '#f5e6cc'],
  },
  'vinarske-regiony': {
    icon: `<path d="M30 70 Q35 40 50 35 Q65 40 70 70" fill="none" stroke="currentColor" stroke-width="2"/>
           <path d="M35 60 Q42 50 50 48 Q58 50 65 60" fill="currentColor" opacity="0.15"/>
           <circle cx="50" cy="35" r="3" fill="currentColor" opacity="0.5"/>
           <path d="M38 68 L42 58 L46 65 L50 55 L54 63 L58 56 L62 68" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>`,
    gradient: ['#e8f5e9', '#c8e6c9'],
  },
  'tipy-a-triky': {
    icon: `<circle cx="50" cy="50" r="18" fill="none" stroke="currentColor" stroke-width="2"/>
           <path d="M50 35 L50 52" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
           <path d="M50 52 L60 58" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
           <circle cx="50" cy="50" r="2" fill="currentColor"/>
           <path d="M44 32 L50 28 L56 32" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5"/>`,
    gradient: ['#fff8e1', '#ffecb3'],
  },
};

// Decorative elements
const decorativeVines = `
  <path d="M0 85 Q15 80 25 85 Q35 90 45 85 Q55 80 65 85 Q75 90 85 85 Q95 80 100 85"
        fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.15"/>
  <path d="M0 90 Q15 85 25 90 Q35 95 45 90 Q55 85 65 90 Q75 95 85 90 Q95 85 100 90"
        fill="none" stroke="currentColor" stroke-width="0.8" opacity="0.1"/>
  <circle cx="12" cy="82" r="2" fill="currentColor" opacity="0.08"/>
  <circle cx="38" cy="88" r="1.5" fill="currentColor" opacity="0.08"/>
  <circle cx="62" cy="82" r="2.5" fill="currentColor" opacity="0.06"/>
  <circle cx="88" cy="87" r="1.5" fill="currentColor" opacity="0.08"/>
`;

function generateSVG(category, title) {
  const config = icons[category] || icons['tipy-a-triky'];
  const [gradStart, gradEnd] = config.gradient;

  // Truncate title for display
  const displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;
  // Split into lines if needed
  const words = displayTitle.split(' ');
  let lines = [''];
  let lineIdx = 0;
  for (const word of words) {
    if ((lines[lineIdx] + ' ' + word).trim().length > 22) {
      lineIdx++;
      lines[lineIdx] = word;
    } else {
      lines[lineIdx] = (lines[lineIdx] + ' ' + word).trim();
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" width="1200" height="720">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${gradStart}"/>
      <stop offset="100%" style="stop-color:${gradEnd}"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="100" height="60" fill="url(#bg)"/>

  <!-- Decorative border -->
  <rect x="3" y="3" width="94" height="54" rx="2" fill="none" stroke="#A9010C" stroke-width="0.3" opacity="0.3"/>

  <!-- Wine color accent -->
  <g color="#A9010C">
    <!-- Icon centered -->
    <g transform="translate(0, -10) scale(0.7)" opacity="0.8">
      ${config.icon}
    </g>

    <!-- Decorative vines -->
    ${decorativeVines}
  </g>

  <!-- Title -->
  ${lines.map((line, i) =>
    `<text x="50" y="${38 + i * 6}" text-anchor="middle" font-family="serif" font-size="4.5" font-weight="bold" fill="#A9010C" opacity="0.9">${escapeXml(line)}</text>`
  ).join('\n  ')}

  <!-- Brand -->
  <text x="50" y="54" text-anchor="middle" font-family="sans-serif" font-size="2.5" fill="#A9010C" opacity="0.4">U Štipčáků — blog o víně</text>
</svg>`;
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Process all articles
const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));

for (const file of files) {
  const content = readFileSync(join(ARTICLES_DIR, file), 'utf-8');
  const titleMatch = content.match(/title:\s*"(.+?)"/);
  const categoryMatch = content.match(/category:\s*"(.+?)"/);

  if (!titleMatch || !categoryMatch) continue;

  const title = titleMatch[1];
  const category = categoryMatch[1];
  const slug = file.replace('.md', '');
  const imagePath = `/images/articles/${slug}.svg`;

  // Generate SVG
  const svg = generateSVG(category, title);
  writeFileSync(join(IMAGES_DIR, `${slug}.svg`), svg, 'utf-8');
  console.log(`Generated: ${slug}.svg`);

  // Update article frontmatter with image path
  if (!content.includes('image:')) {
    const updated = content.replace(
      /^(---\n[\s\S]*?)(---)/m,
      `$1image: "${imagePath}"\n$2`
    );
    writeFileSync(join(ARTICLES_DIR, file), updated, 'utf-8');
    console.log(`  Updated frontmatter: ${file}`);
  } else {
    const updated = content.replace(
      /image:\s*".*?"/,
      `image: "${imagePath}"`
    );
    writeFileSync(join(ARTICLES_DIR, file), updated, 'utf-8');
    console.log(`  Updated image path: ${file}`);
  }
}

console.log('\nDone! All images generated and articles updated.');
