import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '..', 'src', 'content', 'articles');

async function checkImage(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return null;

  const frontmatterRaw = match[1];
  const body = match[2].trim();

  const title = frontmatterRaw.match(/^title:\s*"(.+)"/m)?.[1] || '';
  const description = frontmatterRaw.match(/^description:\s*"(.+)"/m)?.[1] || '';
  const image = frontmatterRaw.match(/^image:\s*"(.+)"/m)?.[1] || '';
  const category = frontmatterRaw.match(/^categoryLabel:\s*"(.+)"/m)?.[1] || '';

  return { frontmatterRaw, body, title, description, image, category };
}

function rebuildFrontmatter(frontmatterRaw, newTitle, newDescription) {
  let updated = frontmatterRaw;
  if (newTitle) {
    updated = updated.replace(/^(title:\s*)".*"/m, `$1"${newTitle}"`);
  }
  if (newDescription) {
    updated = updated.replace(/^(description:\s*)".*"/m, `$1"${newDescription}"`);
  }
  return updated;
}

async function reviewArticle(client, filename, parsed) {
  const { title, description, category, image, body } = parsed;

  const reviewPrompt = `Zkontroluj tento český článek o víně pro vinařský blog. Proveď tyto kontroly:

1. **Gramatika a pravopis**: Oprav všechny gramatické chyby, překlepy a špatnou diakritiku.
2. **Kontext a fakta**: Ověř, že vinařské informace jsou věcně správné.
3. **Kvalita textu**: Odstraň generické fráze, klišé a opakování. Text musí znít autenticky.
4. **YAML bezpečnost**: Title a description nesmí obsahovat znaky rozbíjející YAML (uvozovky " uvnitř — nahraď).

Titulek: ${title}
Popis: ${description}
Kategorie: ${category}

Článek:
${body}

Vrať PŘESNĚ v tomto formátu:
CHANGES: true/false (true pokud jsi cokoliv opravil)
TITLE: (opravený titulek)
DESC: (opravený popis)
FIXES: (stručný seznam oprav, nebo "žádné")
CONTENT_START
(celý opravený text článku v Markdownu)
CONTENT_END`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: reviewPrompt }],
    system: 'Jsi zkušený český korektor a vinařský expert. Opravuj pečlivě gramatiku, fakta a styl. Vracíš opravený text v požadovaném formátu.',
  });

  const reviewText = message.content[0].text;

  const hasChanges = reviewText.match(/CHANGES:\s*(true|false)/)?.[1] === 'true';
  const reviewedTitle = reviewText.match(/TITLE:\s*(.+)/)?.[1]?.trim() || title;
  const reviewedDesc = reviewText.match(/DESC:\s*(.+)/)?.[1]?.trim() || description;
  const fixes = reviewText.match(/FIXES:\s*(.+)/)?.[1]?.trim() || 'žádné';
  const contentMatch = reviewText.match(/CONTENT_START\n([\s\S]*?)\nCONTENT_END/);
  const reviewedContent = contentMatch?.[1]?.trim() || body;

  // Sanitize for YAML
  const safeTitle = reviewedTitle.replace(/"/g, "'");
  const safeDesc = reviewedDesc.replace(/"/g, "'");

  return { hasChanges, title: safeTitle, description: safeDesc, content: reviewedContent, fixes };
}

async function main() {
  const client = new Anthropic();
  const files = readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md')).sort();
  const results = { fixed: [], imageErrors: [], reviewErrors: [] };

  console.log(`Nalezeno ${files.length} článků k review.\n`);

  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = join(ARTICLES_DIR, filename);
    const raw = readFileSync(filepath, 'utf8');
    const parsed = parseFrontmatter(raw);

    if (!parsed) {
      console.log(`[${i + 1}/${files.length}] SKIP ${filename} — nelze parsovat frontmatter`);
      continue;
    }

    console.log(`[${i + 1}/${files.length}] Kontroluji: ${filename}`);

    // Check image
    if (parsed.image) {
      const imageOk = await checkImage(parsed.image);
      if (!imageOk) {
        console.log(`  ✗ Obrázek 404: ${parsed.image}`);
        results.imageErrors.push({ filename, image: parsed.image });
      }
    }

    // Review content
    try {
      const review = await reviewArticle(client, filename, parsed);

      if (review.hasChanges) {
        const newFrontmatter = rebuildFrontmatter(parsed.frontmatterRaw, review.title, review.description);
        const newContent = `---\n${newFrontmatter}\n---\n\n${review.content}`;
        writeFileSync(filepath, newContent, 'utf-8');
        console.log(`  ✓ Opraveno: ${review.fixes}`);
        results.fixed.push({ filename, fixes: review.fixes });
      } else {
        console.log(`  ✓ OK — bez oprav`);
      }
    } catch (err) {
      console.error(`  ✗ Review chyba: ${err.message}`);
      results.reviewErrors.push({ filename, error: err.message });
    }

    // Rate limiting — small delay between API calls
    if (i < files.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Summary
  console.log('\n========================================');
  console.log('SOUHRN REVIEW');
  console.log('========================================');
  console.log(`Celkem článků: ${files.length}`);
  console.log(`Opraveno: ${results.fixed.length}`);
  console.log(`Broken obrázky: ${results.imageErrors.length}`);
  console.log(`Chyby review: ${results.reviewErrors.length}`);

  if (results.fixed.length > 0) {
    console.log('\nOpravené články:');
    results.fixed.forEach(r => console.log(`  - ${r.filename}: ${r.fixes}`));
  }

  if (results.imageErrors.length > 0) {
    console.log('\nBroken obrázky:');
    results.imageErrors.forEach(r => console.log(`  - ${r.filename}: ${r.image}`));
  }

  if (results.reviewErrors.length > 0) {
    console.log('\nChyby:');
    results.reviewErrors.forEach(r => console.log(`  - ${r.filename}: ${r.error}`));
  }
}

main().catch(err => {
  console.error('Fatální chyba:', err);
  process.exit(1);
});
