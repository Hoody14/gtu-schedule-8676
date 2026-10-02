# GTU schedule · group 8676

A small website that shows the weekly timetable for one Georgian Technical
University group, so you never have to scroll through the university's
7 MB timetable page looking for your group code again.

The university publishes the whole timetable as a single HTML file on
`leqtori.gtu.ge:9000`, with one table per academic group. A script pulls out
just your group's table, and the site renders it as a readable schedule:

- **Now / next** card with a live countdown in Tbilisi time
- **Day cards** for Monday–Saturday, with today highlighted
- **Grid view** that mirrors the original table layout, including two-hour
  classes that span two time slots
- **Calendar export** (`.ics`) for the current week
- Georgian/English labels and light/dark themes
- A **refresh button** that can re-run the scraper on demand

## How it works

```
leqtori.gtu.ge:9000  ──▶  scripts/scrape.py  ──▶  public/data/schedule.json  ──▶  React app
      (weekly HTML)        (GitHub Actions)            (committed)              (GitHub Pages)
```

The scraping has to happen in CI rather than in the browser. The university
server is plain HTTP, sends no CORS headers, and sets
`Content-Security-Policy: block-all-mixed-content`, so a page served over
HTTPS from GitHub Pages cannot fetch it directly.

Two details the scraper handles on its own, because both change every week:

- **Which file is current.** The bucket holds one file per week
  (`groups 2026_2027_I_1_.html`, `groups 2026_2027_I_2_.html`, …). The script
  lists the bucket and picks the most recently modified one, so it keeps
  working when a new week is published.
- **Which table is yours.** Group 8676 lived in `table_2037_DETAILED` in week 1
  and `table_2038_DETAILED` in week 2. The script looks the group code up in
  the page's group index and follows that anchor instead of hardcoding an id.

## Running it locally

```bash
npm install
python3 scripts/scrape.py   # refresh public/data/schedule.json
npm run dev                 # http://127.0.0.1:43187
```

`scripts/scrape.py` uses only the Python standard library, so there is nothing
to install for it. Useful flags:

```bash
python3 scripts/scrape.py --group 8594-1          # a different group
python3 scripts/scrape.py --url "http://leqtori.gtu.ge:9000/public/groups%202026_2027_I_1_.html"
python3 scripts/scrape.py --out /tmp/schedule.json
```

Other scripts: `npm run build` (type-check and bundle into `dist/`),
`npm run preview`, `npm run lint`.

## Publishing to GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Open the **Actions** tab and allow workflows to run if prompted.

That's it. The `Update schedule and deploy` workflow then runs on every push,
every six hours, and whenever you trigger it manually. Each run re-scrapes the
timetable, commits `public/data/schedule.json` if anything changed, and
redeploys the site.

> GitHub pauses scheduled workflows in repositories with no activity for 60
> days. If updates ever stop, open the Actions tab and re-enable the schedule.

### Changing the group

Either edit `DEFAULT_GROUP` in `scripts/scrape.py`, or set a repository
variable named `GTU_GROUP` (**Settings → Secrets and variables → Actions →
Variables**) to the group code exactly as it appears on the university site,
for example `8676` or `8594-1`.

## The refresh button

Clicking **განახლება / Refresh** always re-reads the published
`data/schedule.json`, bypassing the browser cache. That is enough right after
a workflow run has deployed new data.

To make the button re-scrape the university site from scratch, give it a
GitHub token:

1. Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens/new)
   scoped to this repository, with **Actions: Read and write** permission.
2. Open the gear icon on the site, paste the token and your `owner/repo`, save.

The button then dispatches the workflow, waits for it to finish, and reloads
the data. The token is kept in your browser's `localStorage` and is never
committed or sent anywhere except `api.github.com`. Without a token the site
still works; the toast just links you to the workflow's **Run workflow** button
on GitHub instead.

## Data format

`public/data/schedule.json` is the single source of truth for the UI:

```jsonc
{
  "group": "8676",
  "program": "მაგისტრატურა - პროგრამა ინფორმატიკა",
  "scrapedAt": "2026-10-02T10:03:06Z",
  "source": {
    "fileName": "groups 2026_2027_I_2_.html",
    "lastModified": "2026-09-25T10:30:44.928Z",
    "tableId": "table_2038_DETAILED",
    "academicYear": "2026-2027",
    "semester": "I",
    "week": 2
  },
  "days": [{ "index": 0, "ka": "ორშაბათი", "en": "Monday" }],
  "slots": [{ "index": 10, "label": "10-18:00", "start": "18:00", "end": "19:00" }],
  "lessons": [
    {
      "day": 2,              // 0 = Monday
      "slot": 10,            // period number from the original table
      "span": 1,             // 2 = a two-hour block
      "start": "18:00",
      "end": "19:00",
      "subject": "გამოყენებითი სტატისტიკა",
      "courseCode": "MAS25008G1-LP",
      "kind": "ლექცია",
      "kindKey": "lecture",
      "lecturer": "კვარაცხელია ვახტანგ",
      "room": "06-505ბ",
      "roomNote": "პ",
      "raw": ["…"]           // the original cell lines, in case parsing missed something
    }
  ],
  "warnings": []
}
```

Anything the parser is unsure about is reported in `warnings` and shown at the
bottom of the page, and every cell keeps its original text in `raw`.

## If the schedule stops updating

- Check the latest run in the **Actions** tab. The job summary lists the source
  file it used and how many lessons it parsed.
- `error: group 8676 is not listed in this timetable file` means the university
  renamed or dropped the group code. Update `GTU_GROUP`.
- `error: no time slots parsed` means the page layout changed and
  `scripts/scrape.py` needs adjusting.
- The site shows a warning banner when the university's file is more than a
  week old, which usually means the university, not this scraper, is late.
