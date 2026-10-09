/**
 * Vite-плагин данных сайта:
 *  - при сборке валидирует data/ и падает с понятной ошибкой, если что-то не так;
 *  - в dev-режиме перепроверяет данные на лету и показывает ошибки в оверлее браузера;
 *  - после сборки кладёт index.html в папку каждого маршрута (recipes/<id>/, plans/<id>/),
 *    чтобы прямые ссылки на GitHub Pages отдавались с кодом 200 и правильными <title>/description,
 *    а 404.html ловит всё остальное.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import type { Plugin, ResolvedConfig, ViteDevServer } from 'vite';
import { formatIssue, validateProject, type DataSet, type Issue } from './data-validation.ts';

export const SITE_NAME = 'Меню';
const SITE_DESCRIPTION = 'Рецепты и техкарты дней готовки.';

interface PageMeta {
  /** Путь относительно base, без ведущего слэша: «recipes/borsch/». */
  path: string;
  title: string;
  description: string;
}

export function menuData(): Plugin {
  let config: ResolvedConfig;
  let data: DataSet | null = null;

  const errorsOf = (issues: Issue[]) => issues.filter((i) => i.severity === 'error');
  const overlayMessage = (errors: Issue[]) =>
    `Данные не прошли проверку (${errors.length}):\n\n${errors.map(formatIssue).join('\n')}`;

  return {
    name: 'menu-data',

    configResolved(resolved) {
      config = resolved;
    },

    async buildStart() {
      data = await validateProject(config.root);
      for (const warning of data.issues.filter((i) => i.severity === 'warning')) {
        config.logger.warn(formatIssue(warning));
      }
      const errors = errorsOf(data.issues);
      if (errors.length === 0) return;
      if (config.command === 'build') this.error(overlayMessage(errors));
      config.logger.error(overlayMessage(errors));
    },

    configureServer(server: ViteDevServer) {
      const watched = [resolve(config.root, 'data'), resolve(config.root, 'schemas')];
      server.watcher.add(watched);

      const sendErrors = () => {
        const errors = data ? errorsOf(data.issues) : [];
        if (errors.length === 0) return;
        server.ws.send({
          type: 'error',
          err: { message: overlayMessage(errors), stack: '', plugin: 'menu-data' },
        });
      };

      let run = 0;
      const revalidate = async (file: string) => {
        if (!watched.some((dir) => !relative(dir, file).startsWith('..'))) return;
        // Несколько изменений подряд запускают проверки параллельно — применяем только последнюю.
        const current = ++run;
        const result = await validateProject(config.root);
        if (current !== run) return;
        data = result;
        const errors = errorsOf(data.issues);
        if (errors.length > 0) config.logger.error(overlayMessage(errors), { timestamp: true });
        else config.logger.info('✓ данные валидны', { timestamp: true });
        // Даём HMR перезагрузить страницу, затем показываем оверлей поверх.
        setTimeout(sendErrors, 300);
      };

      server.watcher.on('change', revalidate);
      server.watcher.on('add', revalidate);
      server.watcher.on('unlink', revalidate);
      server.ws.on('connection', sendErrors);
    },

    async writeBundle(options) {
      if (!data) return;
      const outDir = options.dir ?? resolve(config.root, config.build.outDir);
      const template = await readFile(join(outDir, 'index.html'), 'utf8');

      const pages: PageMeta[] = [
        { path: 'plans/', title: 'Техкарты', description: 'Готовые планы дней готовки под конкретные объёмы и технику.' },
        ...data.recipes.map((r) => ({ path: `recipes/${r.id}/`, title: r.title, description: r.description })),
        ...data.plans.map((p) => ({ path: `plans/${p.id}/`, title: p.title, description: p.summary })),
      ];

      await Promise.all(
        pages.map(async (page) => {
          const file = join(outDir, page.path, 'index.html');
          await mkdir(dirname(file), { recursive: true });
          await writeFile(file, withMeta(template, page.title, page.description));
        }),
      );
      await writeFile(join(outDir, '404.html'), withMeta(template, 'Страница не найдена', SITE_DESCRIPTION));
      config.logger.info(`menu-data: ${pages.length} страниц + 404.html`);
    },
  };
}

function withMeta(html: string, title: string, description: string): string {
  const fullTitle = escapeHtml(`${title} — ${SITE_NAME}`);
  const desc = escapeHtml(description);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${fullTitle}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${fullTitle}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
