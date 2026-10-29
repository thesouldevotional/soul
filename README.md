# soul

A personal, static devotional site — bible verses, prayers, saint biographies, and short "commonplace" quotes, some with a short personal reflection. Its Italian sibling, [`soul-it`](https://github.com/thesouldevotional/soul-it), mirrors every page. Built as plain HTML + `.txt` content files, no build step, no framework, no database. Live at:

**https://thesouldevotional.github.io/soul/**

## How it's built

There is no static site generator. The entire site is:

- a handful of hand-written HTML pages (`index.html`, `archive.html`, `post.html`, etc.)
- one `.txt` file per piece of content (a verse, a prayer, a saint bio, a quote)
- a tiny client-side script in `post.html` that fetches a `.txt` file and renders it

When you open a content page, the URL looks like:

```
post.html?p=bible/isaiah_60-22.txt
```

`post.html` reads the `p` query parameter, `fetch()`s that raw `.txt` file, and renders it into HTML in the browser using a small custom markup engine (see [Rendering engine](#rendering-engine-posthtml) below). There is no server-side templating — GitHub Pages just serves static files, and the `.txt` → HTML conversion happens entirely in the browser at view time.

This means **adding new content is just adding a new `.txt` file** (plus updating a couple of index pages that link to it) — no rebuild, no deploy pipeline beyond a plain `git push`.

## Deploy

`.github/workflows/deploy-pages.yml` deploys the repo to GitHub Pages on every push to `main`:

```
push to main → actions/checkout → configure-pages → upload-pages-artifact → deploy-pages
```

The whole repo root is uploaded as-is (no build step) — whatever is on `main` is what's live, usually within a minute or two of pushing. GitHub emails on deploy failure.

## Repo structure

```
index.html                    homepage — title "soul" + description, links to the archives
post.html                     single-post viewer — renders any .txt file passed via ?p=
archive.html                  ALL verses + prayers in one page, with two anchor-based indexes
all-prayers-archive.html      flat list of every prayer, newest first (drives the prayers "read another one" loop)
all-verses-archive.html       flat list of every verse, newest first (drives the verses "read another one" loop)
all-commonplace-archive.html  flat list of every commonplace entry, newest first (drives its own loop)
saints.html                   list of every saint, linking to their individual page
topics.html                   topic index — generated at load time from archive.html's topic sections
books-of-the-bible.html       every book with an explainer, grouped in ten canonical sections
path-for-the-skeptical.html   a six-question path through scripture
saints-index.txt              internal-only lookup index of saint connections (see below)
soulfavicon.png / soulfavicon_dark.png   favicon light/dark (S, editorial style)
apple-touch-icon.png          iOS Home icon (180×180)

bible/          {book}_{chapter}-{verse}.txt         e.g. isaiah_60-22.txt
prayers/        {title-slug}.txt                     e.g. you-are-all-i-need.txt
commonplace/    {title-slug}.txt                     e.g. share-your-faith.txt
what-is-it/     {book-slug}.txt                      explainer per bible book, e.g. isaiah.txt
guides/         {slug}.txt                           long-form guides, e.g. how-to-read-the-bible.txt
saints/         {name-slug}.txt                      e.g. francis-of-assisi.txt
```

There's no dedicated "about" page — that copy lives directly in `index.html`.

## Content types

Every content type is a plain-text file with a strict, hand-authored format:

### Bible verse (`bible/`)
```
Book Chapter:Verse | title
↳ [back to index](index.html)
↳ [back to archive](archive.html)

Verse text, NLT, verbatim wording. [N] marks each verse number.

~ ↳ see other verses on the same topic > [topic](archive.html#topic-slug-verses)

> read [another](post.html?p=bible/next-file.txt) one
```
An optional reflection (wrapped in `---` … `---`), an optional source line, and optional saint/related-verse cross-links can appear between the verse text and the mandatory "read another one" line.

An episode or teaching of Jesus told by more than one gospel lives in **one file** under the first gospel in canonical order, with the other versions below an `→ also in` line (e.g. `matthew_8-23-27.txt` carries Mark 4:35-41 and Luke 8:22-25). Each gospel's book section in `archive.html` still lists it under its own chapter:verse.

### Prayer (`prayers/`)
Same shape as a verse, but the first line is `topic | title`, and the loop link reads `see other prayers on the same topic`.

### Commonplace (`commonplace/`)
Quotes/prompts with no scripture reference, not addressed to God, not a known saint's own words. No topic, no reflection section — just the quote (blockquote syntax) and an optional source/cross-links. Its loop verb is `see [another](...) one`, not `read`.

### Book explainer (`what-is-it/`)
Three short paragraphs on a bible book: who wrote it, when and why; how it is built, chapter by chapter; where it sits in the bigger story. Debated points (authorship, dating) are marked as such. It ends with a `if you read only a little of this book, read this` footer linking 1–3 essential passages already on the site. One per book cited on the site. Not part of any loop.

### Saint bio (`saints/`)
Structured sections (`↳ bio`, `↳ quotes`, `↳ what resonates with me`, `↳ connections`): researched facts and verified quotes, plus a personal "what resonates with me" section. Not part of any loop.

## The "read/see another one" loop

Every bible verse and prayer file ends in a `read [another](...) one` link (commonplace entries use `see [another](...) one` instead). These links chain together into **three independent closed loops** — one through all verses, one through all prayers, one through all commonplace entries — so a reader can keep clicking forward indefinitely and eventually land back where they started.

The loop order for each type is tracked by its flat "all" page (`all-verses-archive.html`, `all-prayers-archive.html`, `all-commonplace-archive.html`), newest entry first. Adding a new entry means:
1. inserting it at the top of the relevant flat list (it becomes the newest),
2. pointing its own loop link at whatever was previously first (the old newest),
3. rewriting whatever was previously *last* in the list so its loop link now points at the new entry — closing the ring.

## Archive & topic system

`archive.html` is the single hub page for all verses and prayers. It has two anchor-based indexes at the top:

- **`↳ author / book`** — jumps to a section per bible book (verses only, grouped and ordered biblically)
- **`↳ topic`** — links to `topics.html`, an alphabetical index of every topic section, shared between verses and prayers (a topic can hold verses only, prayers only, or both, split into `// verses` / `// prayers` sub-sections)

Topics come from the topical index of the Life Application Study Bible whenever it covers the passage, so a longer passage can sit under several topics; otherwise an existing topic is picked by hand. Commonplace entries opt out of this system entirely — their only presence on `archive.html` is the `↳ all commonplace` link to their flat list.

## Saints & cross-linking

`saints.html` lists every saint; each has a `saints/{slug}.txt` bio page. Verses, prayers, and commonplace entries can carry a `~ ↳ see saint connection >` line pointing to a saint, and the saint's own `↳ connections` section links back — every connection is bidirectional, added on both sides at once, and only when genuinely relevant (never forced just to pad a section).

`saints-index.txt` is a plain-text, unlinked internal index — one block per saint with feast day, theme tags, and current connections — that exists purely so a "does this new verse/prayer connect to any saint?" check can be done by reading one file instead of opening every saint bio. If it ever disagrees with the actual `saints/*.txt` files, the `.txt` files win.

## Rendering engine (`post.html`)

`post.html` implements a tiny markdown-like syntax, parsed line-by-line entirely client-side:

| syntax | renders as |
|---|---|
| `\ text` | blockquote line (`.quote`, gray, prefixed `|-`) |
| `~ text` | counter-styled line (small gray) — links inside are still parsed |
| `[N]` | small gray verse-number marker (`.counter`) |
| `!!text!!` | `<mark>` highlight |
| `[text](url)` | link |
| everything else | plain line |

Empty lines are preserved (the content sits in a `<pre>`), and the whole thing is theme-aware (light/dark via `prefers-color-scheme`).

## Style rules (content)

All text on the site is lowercase, including sentence-initial words — **except**:
- words referring directly to God (`Lord`, `God`, `Him`, `His`, `Heaven`, `You`/`Your` when addressing God directly, …)
- words referring to a saint (`He`, `Him`, `His`, …) anywhere the saint is discussed
- proper names (people, places, bible books)

The NLT source sometimes renders the divine name as small-caps `LORD` — this site always writes `Lord` instead.
