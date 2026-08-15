# Portfolio site

Static HTML/CSS/JS, no build step. Structure modeled on noaittah.com: a
fixed left sidebar (bio, experience, contact) that stays put while you
scroll, and one continuous page with a full-height section per project —
each section split into an info column (title, format/specs, description,
year) and a slideshow (click left/right half of the image to go prev/next).

## Run it locally

Browsers block `fetch()` of local JSON files when you just double-click
`index.html` (file:// origin). Serve the folder instead:

```bash
cd "/Users/tamarselzer/Desktop/portfolio/site"
python3 -m http.server 8765
```

Then open `http://127.0.0.1:8765`.

## Where to edit things

- `content/site.json` — `bio` paragraph, `experience` (array of lines),
  optional `cv` link, `email`, `social` links. All shown in the fixed
  sidebar.
- `content/projects.json` — one object per project:
  - `title`, `metaLines` (array of plain gray lines — format, dimensions,
    medium, etc.)
  - `link` — optional `{label, url}` if the project links out (e.g. "online
    magazine")
  - `creditsBefore` / `creditsAfter` — arrays of `{label, text}`, rendered
    as **label:** text, gray, before/after the description
  - `description` — array of paragraph strings
  - `year` — bold line
  - `number` — the `(01)` index label
  - `items` — one entry per image/video shown in that project's slideshow
  Everything marked `EDIT ME` / `PLACEHOLDER` is a stand-in — replace with
  your real copy.
- `assets/<project-slug>/` — the actual images/videos, already renamed to
  `01.ext`, `02.ext`, etc., in the same order as `items` in projects.json.

Project order (and the `(01)`, `(02)`... numbers) comes from each object's
position in `projects.json` — reorder the array to reorder the site.

## Known issue: video weight

Six clips were copied in as-is (no compression tool was available on this
machine): `temporal/11.mp4` (39MB), `temporal/12.mp4` (33MB),
`encyclopedia-of-ideas/06.mov` (61MB), `implotion-therapy/04.mov` (25MB),
`reading-cinema/01.mp4` (30MB), `temporal/01.mp4` (fine, <1MB). These will
load slowly on a live site. Before deploying, compress them — easiest
no-install route: open each in QuickTime Player → File → Export As → 1080p
(or 720p), then swap the exported file in under the same filename. All
images were already resized/compressed for web.
