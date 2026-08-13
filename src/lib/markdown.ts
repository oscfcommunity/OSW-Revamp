import rehypeExternalLinks from 'rehype-external-links';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import type { Schema as SanitizeSchema } from 'hast-util-sanitize';

/**
 * Markdown is rendered through remark/rehype rather than `marked` so that
 * sanitization happens on the syntax tree, before any HTML string exists.
 * Raw HTML in the source is never passed through (`allowDangerousHtml` stays off),
 * which is the primary defence; `rehype-sanitize` is the belt to that braces.
 */

const withoutImages = (schema: SanitizeSchema): SanitizeSchema => ({
  ...schema,
  tagNames: (schema.tagNames ?? []).filter((tag: string) => tag !== 'img'),
});

/** User-generated content: no images (tracking pixels), no raw HTML, safe links only. */
const userSchema: SanitizeSchema = withoutImages(defaultSchema);

/** Admin-authored content: same allowlist, but images are permitted. */
const trustedSchema: SanitizeSchema = defaultSchema;

const buildProcessor = (schema: SanitizeSchema, markOutboundLinks: boolean) => {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSanitize, schema);

  if (markOutboundLinks) {
    processor.use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['nofollow', 'ugc', 'noopener', 'noreferrer'],
      protocols: ['http', 'https', 'mailto'],
    });
  } else {
    processor.use(rehypeExternalLinks, {
      target: '_blank',
      rel: ['noopener', 'noreferrer'],
      protocols: ['http', 'https', 'mailto'],
    });
  }

  return processor.use(rehypeStringify);
};

const userProcessor = buildProcessor(userSchema, true);
const trustedProcessor = buildProcessor(trustedSchema, false);

const render = async (
  processor: ReturnType<typeof buildProcessor>,
  markdown: string,
): Promise<string> => {
  if (!markdown.trim()) {
    return '';
  }
  const file = await processor.process(markdown);
  return String(file);
};

/** Render markdown written by a community member. Assume it is hostile. */
export const renderUserMarkdown = (markdown: string): Promise<string> =>
  render(userProcessor, markdown);

/** Render markdown written by an admin or moderator (jobs, events, blog posts). */
export const renderTrustedMarkdown = (markdown: string): Promise<string> =>
  render(trustedProcessor, markdown);
