/**
 * Генерирует TypeScript-типы из JSON Schema. Схемы — единственный источник правды.
 *   node scripts/gen-types.ts          — перезаписать src/types/*.gen.ts
 *   node scripts/gen-types.ts --check  — упасть, если сгенерированные файлы устарели
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compile, type JSONSchema } from 'json-schema-to-typescript';

const root = fileURLToPath(new URL('..', import.meta.url));

const targets = [
  { schema: 'schemas/recipe.schema.json', out: 'src/types/recipe.gen.ts' },
  { schema: 'schemas/cook-plan.schema.json', out: 'src/types/cook-plan.gen.ts' },
  { schema: 'schemas/kitchen.schema.json', out: 'src/types/kitchen.gen.ts' },
];

const check = process.argv.includes('--check');
let stale = 0;

for (const { schema, out } of targets) {
  const json = JSON.parse(await readFile(root + schema, 'utf8')) as JSONSchema;
  const ts = await compile(json, json.title ?? 'Root', {
    bannerComment: `/* Сгенерировано из ${schema} — не редактировать вручную. Обновить: npm run types */`,
    additionalProperties: false,
    unreachableDefinitions: true,
    style: { singleQuote: true, printWidth: 100 },
  });

  if (check) {
    const current = await readFile(root + out, 'utf8').catch(() => '');
    if (current !== ts) {
      console.error(`✗ ${out} устарел — запустите npm run types`);
      stale++;
    }
  } else {
    await writeFile(root + out, ts);
    console.log(`✓ ${out}`);
  }
}

if (stale > 0) process.exit(1);
if (check) console.log('✓ Типы совпадают со схемами');
