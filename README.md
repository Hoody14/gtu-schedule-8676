# GTU schedule · group 8676

A small website that shows the weekly timetable for one Georgian Technical
University group, so you never have to scroll through the university's
7 MB timetable page looking for your group code again.

The university publishes the whole timetable as a single HTML file on
`leqtori.gtu.ge:9000`, with one table per academic group. A script pulls out
just your group's table, and the site renders it as a plain Monday–Saturday
list:

- One section per day, in order, with today highlighted and the class that is
  running right now marked in Tbilisi time
- Every class **cross-checked against the lecturers' timetable** before it is
  shown (see below)
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

## Cross-checking every class

The university publishes the same timetable twice: once per group
(`groups ….html`) and once per lecturer (`teachers ….html`). The two files are
written from the same data but laid out differently, so one is a usable check
on the other — and the group tables do occasionally disagree with reality.

After parsing your group's table, the scraper downloads the matching
`teachers` file and walks every lecturer's table. Each lecturer cell lists the
groups attending it, so a class is **confirmed** only when all of this lines
up:

- the lecturer's cell is on the same weekday and in the same time slot,
- it carries the same course code (`ICT23808G2-P`), and
- your group code appears in that cell's group list as a whole token — `8676`
  in `8684, 8695, 8696, 8676, 8641` counts, but `8676` inside `86761` does not.

The check runs both ways. A class in your group's table that no lecturer backs
up is kept but flagged `"confirmed": false`, and the site shows an amber
*unconfirmed* badge next to it. A class the lecturers' file says you attend but
your group's table omits produces a warning instead of being silently dropped.
Confirmed classes also record `sharedWith`, the other groups sitting in the
same room, which is handy for spotting a mis-filed slot.

The footer of the site shows the tally (`13/13 verified`), and the GitHub
Actions job summary prints it per run, so a sudden drop is visible without
reading the JSON.

## Your course list

The cross-check proves what the university *says* the group attends. That is
still broader than what you are actually enrolled in — a group code can pick
up a shared language or elective class you never signed up for.

`scripts/courses.json` pins it down. It lists the real enrolment as
`(course code, lecturer)` pairs:

```jsonc
{
  "group": "8676",
  "courses": [
    { "code": "ICT23808G2-P", "lecturer": "ირემაძე ია" },
    { "code": "MAS25008G1-LP", "lecturer": "კვარაცხელია ვახტანგ" }
  ]
}
```

A class goes into the main Monday–Saturday list only when its code **and**
lecturer are on this list. Lecturer spelling wobbles between the university's
own files (`თავდიშვილი ოთარ` in one, `ოთარი` in the other), so the match falls
back to the surname. The same code can appear twice under different lecturers,
which is how a lecture and its practical end up with separate staff.

Nothing is deleted. A class the university files under your group that is not
on the list still appears, in a dashed **Not on your course list** section at
the bottom of the page, so a genuine late addition to the timetable is
impossible to miss. The reverse is a warning: a course on your list with no
class at all this week gets flagged.

Delete `scripts/courses.json` to go back to showing everything the university
publishes for the group.

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

The parser has its own tests, which run against synthetic HTML so they work
offline and keep passing when a new week is published:

```bash
python3 scripts/test_scrape.py
```

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

`scripts/courses.json` is tied to one group by its `group` field and is
ignored for any other, so pointing the scraper at a different group falls back
to showing everything.

### Changing your courses

Edit `scripts/courses.json` and push. The workflow re-runs on every push, so
the site picks the change up on the next deploy. Adding a class that was set
aside is one entry; dropping a course is one deletion.

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

### Seeing a new version

Each build writes its own id into `dist/build.json` and bakes the same id into
the bundle. On load, and again whenever you press refresh, the page compares
the two and reloads itself once if the deployed id is newer.

That check exists because refreshing the data is not the same as refreshing
the app. GitHub Pages serves `index.html` with `max-age=600`, and a tab left
open never revalidates it at all, so without the check an old bundle can keep
rendering a layout that no longer exists even though the JSON underneath it is
current.

## Data format

`public/data/schedule.json` is the single source of truth for the UI:

```jsonc
{
  "group": "8676",
  "program": "მაგისტრატურა - პროგრამა ინფორმატიკა",
  "scrapedAt": "2026-10-02T11:39:18Z",
  "source": {
    "fileName": "groups 2026_2027_I_3.html",
    "lastModified": "2026-10-02T10:06:13.906Z",
    "tableId": "table_2061_DETAILED",
    "academicYear": "2026-2027",
    "semester": "I",
    "week": 3
  },
  "crossCheck": {
    "file": "teachers 2026_2027_I_3.html",
    "slotsFound": 13,    // slots the lecturers' file says this group attends
    "confirmed": 13,     // of those, how many the group table agrees with
    "total": 13
  },
  "courseList": {
    "configured": true,  // false when scripts/courses.json is absent
    "enrolled": 11,      // shown in the main list
    "extra": 2           // shown under "Not on your course list"
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
      "confirmed": true,     // backed by the lecturers' timetable
      "enrolled": true,      // on scripts/courses.json
      "sharedWith": ["8694", "8696", "8641"],
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
- Classes marked *unconfirmed* on the site, or `verified` dropping below the
  total, mean the group and lecturer timetables disagree. That is usually the
  university mid-way through editing a week, not a bug here — compare the two
  files before changing the parser.
- The site shows a warning banner when the university's file is more than a
  week old, which usually means the university, not this scraper, is late.
