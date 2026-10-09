/** npm run validate — проверить все рецепты и техкарты. Код выхода 1, если есть ошибки. */
import { fileURLToPath } from 'node:url';
import { formatIssue, validateProject } from './data-validation.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const { recipes, plans, kitchen, issues } = await validateProject(root);

const errors = issues.filter((i) => i.severity === 'error');
const warnings = issues.filter((i) => i.severity === 'warning');

for (const issue of [...errors, ...warnings]) console.log(formatIssue(issue));
if (issues.length > 0) console.log('');

if (errors.length > 0) {
  console.error(`Ошибок: ${errors.length}, предупреждений: ${warnings.length}`);
  process.exit(1);
}
console.log(`✓ Рецептов: ${recipes.length}, техкарт: ${plans.length}, справочник кухни: ${kitchen ? 'есть' : 'нет'}. Предупреждений: ${warnings.length}`);
