import { describe, expect, it } from 'vitest';

import { renderTrustedMarkdown, renderUserMarkdown } from './markdown';

describe('renderUserMarkdown', () => {
  it('renders basic markdown', async () => {
    const html = await renderUserMarkdown('# Title\n\nSome **bold** text.');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('renders GitHub flavoured markdown tables and strikethrough', async () => {
    const html = await renderUserMarkdown('| a | b |\n| - | - |\n| 1 | 2 |\n\n~~gone~~');

    expect(html).toContain('<table>');
    expect(html).toContain('<del>gone</del>');
  });

  it('renders fenced code as inert text, escaping any markup inside it', async () => {
    const html = await renderUserMarkdown('```js\nconst a = "<script>alert(1)</script>";\n```');

    expect(html).toContain('<pre><code');
    expect(html).toContain('&#x3C;script>');
    expect(html).not.toContain('<script>');
  });

  it('marks outbound links as nofollow ugc and opens them safely', async () => {
    const html = await renderUserMarkdown('[link](https://example.com)');

    expect(html).toContain('rel="nofollow ugc noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('leaves same-site links untouched by the outbound rules', async () => {
    const html = await renderUserMarkdown('[forum](/forum/c/general)');

    expect(html).not.toContain('nofollow');
  });

  describe('sanitization', () => {
    const payloads: ReadonlyArray<readonly [name: string, markdown: string, forbidden: string]> = [
      ['raw script tags', '<script>alert(1)</script>', '<script'],
      ['image error handlers', '<img src=x onerror="alert(1)">', 'onerror'],
      ['javascript: hrefs', '[click](javascript:alert(1))', 'javascript:'],
      ['data: html hrefs', '[click](data:text/html;base64,PHNjcmlwdD4=)', 'data:text/html'],
      ['inline event handlers', '<p onclick="alert(1)">hi</p>', 'onclick'],
      ['style attributes', '<p style="position:fixed;inset:0">hi</p>', 'style='],
      ['iframes', '<iframe src="https://evil.test"></iframe>', '<iframe'],
      ['form elements', '<form action="https://evil.test"><input name="pw"></form>', '<form'],
      ['svg payloads', '<svg><script>alert(1)</script></svg>', '<svg'],
      ['nested script in details', '<details><script>alert(1)</script></details>', '<script'],
    ];

    it.each(payloads)('strips %s', async (_name, markdown, forbidden) => {
      const html = await renderUserMarkdown(markdown);

      expect(html.toLowerCase()).not.toContain(forbidden.toLowerCase());
    });

    it('does not render images from arbitrary hosts in user content', async () => {
      const html = await renderUserMarkdown('![pixel](https://tracker.test/pixel.png)');

      expect(html).not.toContain('<img');
    });
  });

  it('returns an empty string for empty input', async () => {
    await expect(renderUserMarkdown('')).resolves.toBe('');
  });
});

describe('renderTrustedMarkdown', () => {
  it('allows images, which admin authored content needs', async () => {
    const html = await renderTrustedMarkdown('![logo](https://cdn.test/logo.png)');

    expect(html).toContain('<img');
    expect(html).toContain('src="https://cdn.test/logo.png"');
  });

  it('still strips scripts and event handlers', async () => {
    const html = await renderTrustedMarkdown('<script>alert(1)</script><img src=x onerror=go()>');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('onerror');
  });
});
