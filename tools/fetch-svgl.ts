import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Downloads brand logos from svgl.app into the portal assets at build time.
 *
 * svgl is a *brand logo* library, not an icon set — it has no generic UI glyphs.
 * Those stay with FontAwesome / Material Icons in `apps/portal/src/styles.scss`.
 *
 * The SVGs are committed so nothing is fetched at runtime: the portal also ships
 * as a Capacitor app, where a third-party request may be offline or blocked.
 *
 * Usage: pnpm gen:logos [logo title...]
 */

const API = 'https://api.svgl.app';
const OUT_DIR = 'apps/portal/src/assets/logos';

/** Brands actually referenced by the portal. Keep this list as short as the UI needs. */
const DEFAULT_LOGOS = ['Google'];

interface SvglEntry {
  title: string;
  category: string | string[];
  route: string | { light: string; dark: string };
  wordmark?: string | { light: string; dark: string };
  url: string;
  brandUrl?: string;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function download(url: string, outFile: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);

  const svg = await res.text();
  if (!svg.trimStart().startsWith('<svg')) throw new Error(`${url} did not return an SVG`);

  await writeFile(outFile, svg);
  console.log(`  ${outFile}`);
}

async function main() {
  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_LOGOS;

  const res = await fetch(API);
  if (!res.ok) throw new Error(`GET ${API} failed: ${res.status} ${res.statusText}`);
  const catalogue = (await res.json()) as SvglEntry[];

  await mkdir(OUT_DIR, { recursive: true });

  for (const name of wanted) {
    const entry = catalogue.find(e => e.title.toLowerCase() === name.toLowerCase());
    if (!entry) throw new Error(`No svgl logo titled "${name}". Browse them at https://svgl.app`);

    const slug = slugify(entry.title);
    console.log(`${entry.title}:`);

    if (typeof entry.route === 'string') {
      await download(entry.route, join(OUT_DIR, `${slug}.svg`));
    } else {
      await download(entry.route.light, join(OUT_DIR, `${slug}-light.svg`));
      await download(entry.route.dark, join(OUT_DIR, `${slug}-dark.svg`));
    }

    // Most brands restrict how their mark may be used — check before shipping one.
    console.log(`  trademark terms: ${entry.brandUrl ?? entry.url}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
