---
name: wordpress-publish-audit
description: Publish or update this repository's articles on WordPress, upload article media, preserve WordPress homepage excerpts, and iteratively verify and repair article formatting with Playwright. Use when Codex is asked to sync a GitHub/Hugo article to WordPress, publish a missing article, fix a distorted banner or excessive spacing, normalize a WordPress article against existing stories, validate responsive presentation, or check article hyperlinks.
---

# WordPress Publish and Audit

Publish repository articles to the matching WordPress site without changing the
public GitHub site. Treat WordPress as an external production system: inspect
first, mutate only the intended post, and verify the public result after every
material edit.

## Repository boundary

- Keep this skill under `internal/codex-skills/wordpress-publish-audit/`.
- Never copy it into `content/`, `static/`, `assets/`, or a generated `public/`
  directory.
- Never include credentials, application passwords, cookies, tokens, API
  responses containing private account data, or audit screenshots in commits.
- The skill is versioned in Git but must not be published by Hugo.

## Workflow

### 1. Establish the source and target

1. Inspect the repository article inventory and the WordPress post inventory.
2. Identify the missing or requested article by title, slug, and content—not by
   account username alone.
3. Inspect at least one correct WordPress story before composing the new post.
4. Record the target site URL, WordPress site ID, source article path, media
   paths, and intended slug.
5. Treat application passwords as ephemeral. Use them only in memory or a
   process environment and never echo or write them to disk.

Read [references/wordpress-api.md](references/wordpress-api.md) when selecting
an API endpoint or constructing XML-RPC calls.

### 2. Capture the WordPress contract

Use the public API and Playwright to establish:

- featured-image dimensions and `object-fit`;
- site-header, entry-header, and entry-content bounding boxes;
- article column width;
- opening-summary structure;
- the exact WordPress `More` marker used by existing posts;
- image and caption patterns;
- mobile behavior;
- categories, tags, excerpts, and permalink conventions.

Do not assume the repository HTML can be pasted unchanged. WordPress may strip
`style` elements, rewrite images through its CDN, insert paragraph elements,
or override image widths.

### 3. Prepare and upload media

1. Enumerate every source image and check file type and size.
2. Upload media before publishing the post.
3. Use deterministic, article-prefixed filenames.
4. Capture the returned media IDs and HTTPS URLs.
5. Use the hero media ID as the featured image.
6. Replace relative source URLs with the uploaded HTTPS URLs.
7. Add meaningful `alt` text and preserve captions.

### 4. Build the post body

Match the existing WordPress opening pattern:

```html
<p>Topic · Location · Category</p>
<p>Short article label</p>
<p>One-sentence summary</p>
<!-- wp:more -->
<!--more-->
<!-- /wp:more -->
```

The `More` block must be top-level and appear immediately after the three-line
summary. It is required even when the post excerpt field is populated.

After the marker:

- preserve the complete article;
- keep a readable column aligned with existing posts;
- use balanced HTML;
- prefer semantic paragraphs, headings, figures, captions, block quotes,
  lists, and links;
- use inline styles only when WordPress theme behavior requires them;
- constrain every image with `width:100%; max-width:100%; height:auto`;
- use `object-fit:cover` with an explicit maximum height for cropped figures;
- implement responsive image pairs with
  `repeat(auto-fit,minmax(260px,1fr))`;
- set external links to HTTPS with `target="_blank"` and
  `rel="noopener noreferrer"`.

Parse or construct balanced markup. Do not rely on broad regular-expression
replacements across nested `<div>` elements.

### 5. Publish safely

1. Authenticate against the exact target site.
2. Prove authorization with a read method before writing.
3. Check for an existing post with the same title or slug to prevent
   duplicates.
4. Upload media.
5. Create the post with title, slug, excerpt, content, featured image, tags,
   and `publish` status.
6. Retrieve the public permalink and post ID.
7. For corrections, update the existing post ID; do not create replacements.

Use WordPress XML-RPC when an application password authenticates there but is
not accepted by the global WordPress.com REST API.

### 6. Verify with Playwright

Inspect the new article by itself at:

- desktop: `1440 × 1000`;
- mobile: `390 × 844`.

On each pass:

1. Take a viewport screenshot and inspect it visually.
2. Measure the hero, entry header, entry content, section headings, figures,
   and responsive grids.
3. Confirm the banner is cropped with `object-fit: cover`, not stretched.
4. Confirm there is no unintended gap between the banner, title, and body.
5. Confirm all content images are loaded.
6. Confirm no element causes horizontal overflow.
7. Confirm image pairs are two columns on desktop and one column on mobile.
8. Confirm captions, sources, tags, and article text are present.
9. Inspect console errors and distinguish site-wide WordPress noise from
   article-specific failures.

Fix through the API, reload with a cache-busting query string, and repeat until
the checks pass. Always perform a final desktop regression after the mobile
fix.

### 7. Verify the homepage

Inspect the homepage at desktop and mobile widths.

For the new article, confirm:

- only the three-line summary is present;
- a working `Continue reading` link points to `#more-<post-id>`;
- no body heading or full-story content appears in the listing;
- the listing height is comparable to the other stories;
- the featured image loads without overflow;
- the article is ordered as expected.

If the full story appears, retrieve the raw post content, insert the exact
three-line `More` block, update the same post, and retest.

### 8. Verify hyperlinks

1. Extract unique article and source links from the rendered DOM.
2. Confirm each has a nonempty absolute HTTPS destination.
3. Verify each unique external URL with `HEAD`; retry with `GET` when the server
   rejects `HEAD`.
4. Treat redirects to a valid final page as success.
5. Correct broken URLs in the existing post and rerun the link audit.

### 9. Clean up and report

- Remove Playwright screenshots and transient browser artifacts unless the
  user explicitly requests them.
- Run `git status` and ensure no credential or audit artifact is staged.
- Report the public post URL, desktop/mobile checks, homepage excerpt check,
  image count, and link results.
- Tell the user to revoke the temporary application password.
