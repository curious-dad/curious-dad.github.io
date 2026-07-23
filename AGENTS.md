# Curious Dad site instructions

These instructions apply to the entire repository.

## Article layout contract

- Treat `layouts/partials/article-nav.html`, `static/article-nav.css`, and
  `static/article-nav.js` as the single shared article-navigation widget.
- Every published article presentation, including standalone static pages and
  translated variants, must load that widget's CSS and JavaScript and use the
  same navigation markup or Hugo partial.
- Do not copy article navigation CSS into an article template. Extend the shared
  widget when navigation behavior genuinely needs to change everywhere.
- Keep shared navigation geometry in pixels so article-specific root font sizes
  cannot distort it:
  - desktop: 1120 px maximum width and 54 px height
  - mobile: 50 px height with the shared collapsible menu
- Keep Posts, About, and any language switch inside the shared navigation.
- Preserve accessible labels, `aria-expanded`, and keyboard-focus behavior.

## Hero normalization

- Add `article-page-hero` to every custom article hero in addition to the
  article's local `hero` class.
- The shared hero contract in `static/article-nav.css` is the source of truth:
  - desktop minimum height: 680 px
  - mobile minimum height: 560 px
  - hero content vertically centered
- Article templates may keep their own typography, colors, background images,
  overlays, and internal content structure.
- Do not reintroduce viewport-height heroes such as `94vh`, bottom alignment, or
  page-local spacing overrides that create large empty regions above the title.
- The article content must begin directly after the hero. Intentional padding
  inside the first content section is fine; an empty interstitial strip is not.
- Background images must cover the hero without stretching:
  `width: 100%`, `height: 100%`, and `object-fit: cover` for image elements, or
  `background-size: cover` for CSS backgrounds.

## Hugo and standalone articles

- Custom Hugo article layouts live under `layouts/posts/`.
- Standalone and translated HTML articles under `static/` must follow the same
  shared navigation and hero contracts as Hugo-rendered articles.
- When a Hugo content item exists only to appear in lists and links to a
  standalone article through `externalURL`, prevent the empty duplicate page:

  ```yaml
  build:
    render: never
    list: always
  ```

- Keep `externalURL` pointing to the actual standalone article and verify the
  homepage card uses it.

## Required visual verification

For any article-layout, navigation, hero, or responsive-style change:

1. Run a clean Hugo build.
2. Use Playwright to inspect every published article presentation individually.
3. Inspect each page at both 1440×1000 and 390×844.
4. Verify:
   - the shared banner has consistent dimensions;
   - the hero is neither cropped incorrectly nor stretched;
   - the title area has no excessive empty vertical space;
   - article content follows the hero without an unintended gap;
   - there is no horizontal overflow;
   - translated variants match the same structural geometry;
   - the mobile menu opens and remains readable;
   - the browser console has no page-specific errors.
5. Confirm externally linked articles still appear on the homepage and that
   suppressed duplicate routes are absent from a clean build.
6. Run `git diff --check`.

Do not claim visual verification from source inspection alone. Preserve
Playwright screenshots only when explicitly requested; otherwise remove audit
artifacts before handoff.
