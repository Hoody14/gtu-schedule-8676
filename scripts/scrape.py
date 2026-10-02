#!/usr/bin/env python3
"""Scrape the GTU timetable for a single academic group into JSON.

The university publishes one huge HTML file per week to a public MinIO bucket
(plain HTTP, no CORS headers), so a browser on an HTTPS origin cannot read it
directly. This script runs in CI instead and writes the extracted schedule to
``public/data/schedule.json``, which the static site then loads.

Nothing in here is hardcoded to a particular week: the newest ``groups *.html``
object in the bucket is discovered at runtime, and the group's table id is
resolved from the group index rather than assumed, because the ids shift every
time the timetable is republished.

Usage:
    python3 scripts/scrape.py [--group 8676] [--url <html-url>] [--out <path>]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

BUCKET_URL = "http://leqtori.gtu.ge:9000/public/"
DEFAULT_GROUP = "8676"
REQUEST_TIMEOUT = 120
USER_AGENT = "gtu-schedule-bot/1.0 (+https://github.com)"

DAYS = [
    {"index": 0, "ka": "ორშაბათი", "shortKa": "ორშ", "en": "Monday", "shortEn": "Mon"},
    {"index": 1, "ka": "სამშაბათი", "shortKa": "სამშ", "en": "Tuesday", "shortEn": "Tue"},
    {"index": 2, "ka": "ოთხშაბათი", "shortKa": "ოთხშ", "en": "Wednesday", "shortEn": "Wed"},
    {"index": 3, "ka": "ხუთშაბათი", "shortKa": "ხუთშ", "en": "Thursday", "shortEn": "Thu"},
    {"index": 4, "ka": "პარასკევი", "shortKa": "პარ", "en": "Friday", "shortEn": "Fri"},
    {"index": 5, "ka": "შაბათი", "shortKa": "შაბ", "en": "Saturday", "shortEn": "Sat"},
]

LESSON_KINDS = {
    "ლექცია": ("lecture", "Lecture"),
    "პრაქტიკული": ("practical", "Practical"),
    "ლაბორატორიული": ("lab", "Lab"),
    "სემინარი": ("seminar", "Seminar"),
}

EMPTY_CELL_VALUES = {"", "-", "--", "---"}


class ScrapeError(RuntimeError):
    pass


# --------------------------------------------------------------------------
# networking
# --------------------------------------------------------------------------


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return response.read()
    except urllib.error.URLError as exc:
        raise ScrapeError(f"could not reach {url}: {exc}") from exc


def list_bucket(prefix: str) -> list[dict[str, Any]]:
    """Return objects in the public bucket whose key starts with ``prefix``."""
    entries: list[dict[str, Any]] = []
    token: str | None = None

    while True:
        query = {"list-type": "2", "prefix": prefix, "max-keys": "1000"}
        if token:
            query["continuation-token"] = token
        body = fetch(BUCKET_URL + "?" + urllib.parse.urlencode(query)).decode("utf-8", "replace")

        for match in re.finditer(
            r"<Key>(.*?)</Key>.*?<LastModified>(.*?)</LastModified>.*?<Size>(\d+)</Size>",
            body,
            re.S,
        ):
            entries.append(
                {
                    "key": unescape(match.group(1)),
                    "lastModified": match.group(2),
                    "size": int(match.group(3)),
                }
            )

        truncated = re.search(r"<IsTruncated>(\w+)</IsTruncated>", body)
        next_token = re.search(r"<NextContinuationToken>(.*?)</NextContinuationToken>", body)
        if truncated and truncated.group(1) == "true" and next_token:
            token = unescape(next_token.group(1))
            continue
        return entries


def academic_year_prefixes(today: datetime) -> list[str]:
    """Candidate key prefixes, newest academic year first."""
    start = today.year if today.month >= 8 else today.year - 1
    return [f"groups {year}_{year + 1}" for year in (start, start - 1)] + ["groups "]


def find_source_candidates(today: datetime) -> list[dict[str, Any]]:
    """Published timetable files, newest first.

    Some weeks are published twice in different layouts (one table per group,
    and one giant table listing every group as a row). Only the first layout
    carries the per-group detail this script needs, so the caller walks the
    list until a file it can actually read turns up.
    """
    for prefix in academic_year_prefixes(today):
        candidates = [
            entry
            for entry in list_bucket(prefix)
            if entry["key"].lower().endswith(".html") and entry["size"] > 100_000
        ]
        if candidates:
            candidates.sort(key=lambda entry: entry["lastModified"], reverse=True)
            for entry in candidates:
                entry["url"] = BUCKET_URL + urllib.parse.quote(entry["key"])
            return candidates
    raise ScrapeError("no timetable HTML files found in the public bucket")


# --------------------------------------------------------------------------
# parsing
# --------------------------------------------------------------------------


def decode_html(raw: bytes) -> str:
    return raw.decode("utf-8", "replace")


def find_group_entry(document: str, group: str) -> tuple[str, str]:
    """Return ``(table_id, program_name)`` for the given group code."""
    anchor = re.search(
        r'<a href="#(table_\d+_DETAILED)">\s*' + re.escape(group) + r"\s*</a>", document
    )
    if not anchor:
        if "table_LESS_DETAILED" in document or not re.search(r"table_\d+_DETAILED", document):
            raise ScrapeError("this file uses the combined all-groups layout, not per-group tables")
        raise ScrapeError(
            f"group {group} is not listed in this timetable file - "
            "check the code, it must match the site exactly (e.g. '8676' or '8594-1')"
        )

    program = ""
    for heading in re.finditer(r"<li>\s*([^<>]+?)\s*<ul>", document[: anchor.start()], re.S):
        program = re.sub(r"\s+", " ", heading.group(1)).strip()

    return anchor.group(1), program


def extract_table(document: str, table_id: str) -> str:
    start = document.find(f'<table id="{table_id}"')
    if start == -1:
        raise ScrapeError(f"table {table_id} is missing from the timetable file")
    end = document.find("</table>", start)
    if end == -1:
        raise ScrapeError(f"table {table_id} is not closed")
    return document[start : end + len("</table>")]


class TableParser(HTMLParser):
    """Collect ``<tbody>`` rows as ``(tag, text, rowspan)`` cell tuples."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[tuple[str, str, int]]] = []
        self._in_body = False
        self._row: list[tuple[str, str, int]] | None = None
        self._cell: list[str] | None = None
        self._cell_tag = ""
        self._rowspan = 1

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "tbody":
            self._in_body = True
        elif tag == "tr" and self._in_body:
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []
            self._cell_tag = tag
            values = dict(attrs)
            try:
                self._rowspan = max(1, int(values.get("rowspan") or 1))
            except ValueError:
                self._rowspan = 1
        elif tag == "br" and self._cell is not None:
            self._cell.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag == "tbody":
            self._in_body = False
        elif tag == "tr" and self._row is not None:
            self.rows.append(self._row)
            self._row = None
        elif tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append((self._cell_tag, "".join(self._cell), self._rowspan))
            self._cell = None
            self._rowspan = 1

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)


def clean_lines(text: str) -> list[str]:
    lines = [re.sub(r"[\s\u00a0]+", " ", line).strip() for line in text.split("\n")]
    return [line for line in lines if line]


SLOT_LABEL = re.compile(r"^(\d+)\s*-\s*(\d{1,2}):(\d{2})")


def parse_slot_label(label: str) -> tuple[int, str] | None:
    match = SLOT_LABEL.match(label.strip())
    if not match:
        return None
    hour, minute = int(match.group(2)), int(match.group(3))
    return int(match.group(1)), f"{hour:02d}:{minute:02d}"


def shift_time(value: str, hours: int) -> str:
    hour, minute = (int(part) for part in value.split(":"))
    return f"{(hour + hours) % 24:02d}:{minute:02d}"


SUBJECT_LINE = re.compile(r"^(?P<subject>.+?)\s*\((?P<code>[A-Za-z0-9][A-Za-z0-9._\-]*)\)\s*(?P<kind>.*)$")
ROOM_LINE = re.compile(r"^(?P<room>[^()]+?)(?:\s*\((?P<note>[^()]*)\))?$")
LATIN_RUN = re.compile(r"\s+(?=[A-Z][A-Za-z'’\-]*(?:\s|$))")


def split_lecturer(line: str) -> tuple[str, str]:
    """Separate the Georgian name from its optional Latin transliteration."""
    match = re.search(r"[A-Za-z]", line)
    if not match:
        return line.strip(), ""
    head = line[: match.start()].strip()
    tail = line[match.start() :].strip()
    if not head:
        return tail, ""
    return head, tail


def parse_cell(lines: list[str]) -> dict[str, Any]:
    lesson: dict[str, Any] = {
        "subject": "",
        "courseCode": "",
        "kind": "",
        "kindKey": "other",
        "kindEn": "",
        "lecturer": "",
        "lecturerLatin": "",
        "room": "",
        "roomNote": "",
        "raw": lines,
    }

    if lines:
        match = SUBJECT_LINE.match(lines[0])
        if match:
            lesson["subject"] = match.group("subject").strip()
            lesson["courseCode"] = match.group("code").strip()
            kind = match.group("kind").strip()
        else:
            lesson["subject"] = lines[0]
            kind = ""
        lesson["kind"] = kind
        key, english = LESSON_KINDS.get(kind, ("other", kind))
        lesson["kindKey"] = key
        lesson["kindEn"] = english

    if len(lines) > 1:
        lesson["lecturer"], lesson["lecturerLatin"] = split_lecturer(lines[1])

    if len(lines) > 2:
        match = ROOM_LINE.match(lines[2])
        if match:
            lesson["room"] = (match.group("room") or "").strip()
            lesson["roomNote"] = (match.group("note") or "").strip()
        else:
            lesson["room"] = lines[2]

    return lesson


def parse_schedule_table(table_html: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[str]]:
    parser = TableParser()
    parser.feed(table_html)

    slots: list[dict[str, Any]] = []
    lessons: list[dict[str, Any]] = []
    warnings: list[str] = []
    # How many further rows each column stays covered by an earlier rowspan.
    # Rows omit the cells they inherit, so columns must be skipped, not shifted.
    carried: dict[int, int] = {}

    for row in parser.rows:
        cells = list(row)
        if not cells:
            continue

        label = ""
        if cells[0][0] == "th":
            label = clean_lines(cells[0][1])
            label = label[0] if label else ""
            cells = cells[1:]

        parsed_label = parse_slot_label(label)
        if parsed_label is None:
            continue
        slot_index, start = parsed_label
        slots.append(
            {
                "index": slot_index,
                "label": label,
                "start": start,
                "end": shift_time(start, 1),
            }
        )

        blocked = {column for column, rows in carried.items() if rows > 0}
        spans_started_here: dict[int, int] = {}

        column = 0
        for _tag, text, rowspan in cells:
            while column in blocked:
                column += 1
            if column >= len(DAYS):
                warnings.append(f"row '{label}' has more columns than days; extra cells ignored")
                break

            lines = clean_lines(text)
            if lines and lines[0] not in EMPTY_CELL_VALUES:
                lesson = parse_cell(lines)
                lesson.update(
                    {
                        "day": column,
                        "slot": slot_index,
                        "span": rowspan,
                        "start": start,
                        "end": shift_time(start, rowspan),
                    }
                )
                lesson["id"] = f"{column}-{slot_index}-{lesson['courseCode'] or 'x'}"
                lessons.append(lesson)
                if len(lines) > 3:
                    warnings.append(
                        f"cell at {DAYS[column]['en']} {label} has {len(lines)} lines; "
                        "extra lines kept only in 'raw'"
                    )

            if rowspan > 1:
                spans_started_here[column] = rowspan - 1
            column += 1

        carried = {col: rows - 1 for col, rows in carried.items() if rows > 1}
        carried.update(spans_started_here)

    return slots, lessons, warnings


# --------------------------------------------------------------------------
# assembly
# --------------------------------------------------------------------------


FILE_META = re.compile(r"groups\s+(\d{4})_(\d{4})_([IVX]+)_(\d+)", re.I)


def describe_source(entry: dict[str, Any], table_id: str) -> dict[str, Any]:
    meta = FILE_META.search(entry["key"])
    return {
        "url": entry["url"],
        "fileName": entry["key"],
        "lastModified": entry["lastModified"],
        "sizeBytes": entry["size"],
        "tableId": table_id,
        "anchorUrl": f"{entry['url']}#{table_id}",
        "academicYear": f"{meta.group(1)}-{meta.group(2)}" if meta else "",
        "semester": meta.group(3).upper() if meta else "",
        "week": int(meta.group(4)) if meta else None,
    }


# How many of the newest files to try before giving up. Each one is several
# megabytes, and in practice the group is found in the first or second.
MAX_CANDIDATES = 4


def build_payload(group: str, url: str | None, today: datetime) -> dict[str, Any]:
    if url:
        key = urllib.parse.unquote(url.rsplit("/", 1)[-1])
        candidates = [{"key": key, "url": url, "lastModified": "", "size": 0}]
    else:
        candidates = find_source_candidates(today)[:MAX_CANDIDATES]

    warnings: list[str] = []
    failures: list[str] = []

    for entry in candidates:
        document = decode_html(fetch(entry["url"]))
        if not entry["size"]:
            entry["size"] = len(document.encode("utf-8"))

        try:
            table_id, program = find_group_entry(document, group)
        except ScrapeError as exc:
            failures.append(f"{entry['key']}: {exc}")
            continue

        slots, lessons, parse_warnings = parse_schedule_table(extract_table(document, table_id))
        if not slots:
            failures.append(f"{entry['key']}: no time slots parsed")
            continue

        warnings.extend(parse_warnings)
        for failure in failures:
            warnings.append(f"skipped a newer file - {failure}")
        break
    else:
        raise ScrapeError(
            f"could not read a schedule for group {group}. Tried:\n  " + "\n  ".join(failures)
        )

    return {
        "group": group,
        "program": program,
        "university": "საქართველოს ტექნიკური უნივერსიტეტი",
        "universityEn": "Georgian Technical University",
        "scrapedAt": today.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": describe_source(entry, table_id),
        "days": DAYS,
        "slots": slots,
        "lessons": lessons,
        "warnings": warnings,
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--group", default=os.environ.get("GTU_GROUP", DEFAULT_GROUP))
    parser.add_argument("--url", default=os.environ.get("GTU_SOURCE_URL") or None,
                        help="scrape this exact HTML file instead of auto-detecting the newest week")
    parser.add_argument("--out", default="public/data/schedule.json")
    args = parser.parse_args(argv)

    now = datetime.now(timezone.utc).replace(microsecond=0)

    try:
        payload = build_payload(args.group, args.url, now)
    except ScrapeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    destination = Path(args.out)
    destination.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"

    previous = destination.read_text(encoding="utf-8") if destination.exists() else ""
    destination.write_text(serialized, encoding="utf-8")

    def without_timestamp(text: str) -> str:
        return re.sub(r'"scrapedAt": "[^"]*"', "", text)

    changed = without_timestamp(previous) != without_timestamp(serialized)

    print(f"source   : {payload['source']['fileName']} (modified {payload['source']['lastModified']})")
    print(f"group    : {payload['group']} - {payload['program']}")
    print(f"table    : {payload['source']['tableId']}")
    print(f"lessons  : {len(payload['lessons'])} across {len(payload['slots'])} slots")
    for warning in payload["warnings"]:
        print(f"warning  : {warning}")
    print(f"written  : {destination} ({'changed' if changed else 'no change'})")

    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"changed={'true' if changed else 'false'}\n")
            handle.write(f"lessons={len(payload['lessons'])}\n")
            handle.write(f"source_file={payload['source']['fileName']}\n")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
