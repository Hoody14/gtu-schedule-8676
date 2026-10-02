#!/usr/bin/env python3
"""Unit tests for the timetable parser.

Run with: python3 scripts/test_scrape.py

These use synthetic HTML rather than the live site so they keep passing when
the university server is unreachable or republishes a new week.
"""

from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("scrape", Path(__file__).with_name("scrape.py"))
assert spec and spec.loader
scrape = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scrape)


def build_document(rows: str, group: str = "8676", table_id: str = "table_42_DETAILED") -> str:
    return f"""
    <ul>
      <li>
        მაგისტრატურა - პროგრამა ინფორმატიკა
        <ul>
          <li><a href="#{table_id}">{group}</a></li>
        </ul>
      </li>
    </ul>
    <table id="{table_id}" border="1">
      <thead>
        <tr><td rowspan="2"></td><th colspan="6">{group}</th></tr>
        <tr>
          <th class="xAxis">ორშ./Mon.</th><th class="xAxis">სამშ./Tues.</th>
          <th class="xAxis">ოთხშ./Wed.</th><th class="xAxis">ხუთშ./Thurs.</th>
          <th class="xAxis">პარ./Fri.</th><th class="xAxis">შაბ./Sat.</th>
        </tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    """


def row(label: str, *cells: str) -> str:
    rendered = "".join(cells)
    return f'<tr><th class="yAxis">{label}</th>{rendered}</tr>'


EMPTY = "<td>---</td>"


def lesson_cell(text: str, rowspan: int = 1) -> str:
    attribute = f' rowspan="{rowspan}"' if rowspan > 1 else ""
    return f"<td{attribute}>{text}</td>"


class ParseCellTest(unittest.TestCase):
    def test_splits_subject_code_and_kind(self) -> None:
        lesson = scrape.parse_cell(["გამოყენებითი სტატისტიკა (MAS25008G1-LP) ლექცია", "კვარაცხელია ვახტანგ", "06-505ბ (პ)"])
        self.assertEqual(lesson["subject"], "გამოყენებითი სტატისტიკა")
        self.assertEqual(lesson["courseCode"], "MAS25008G1-LP")
        self.assertEqual(lesson["kind"], "ლექცია")
        self.assertEqual(lesson["kindKey"], "lecture")
        self.assertEqual(lesson["lecturer"], "კვარაცხელია ვახტანგ")
        self.assertEqual(lesson["room"], "06-505ბ")
        self.assertEqual(lesson["roomNote"], "პ")

    def test_keeps_parenthesised_subject_out_of_the_course_code(self) -> None:
        lesson = scrape.parse_cell(
            ["საქმიანი კომუნიკაცია უცხოურ ენაზე (ინგლისური) (LEH16312G3-LP) პრაქტიკული", "სიხარულიძე ნუგზარი", "06-502ა"]
        )
        self.assertEqual(lesson["subject"], "საქმიანი კომუნიკაცია უცხოურ ენაზე (ინგლისური)")
        self.assertEqual(lesson["courseCode"], "LEH16312G3-LP")
        self.assertEqual(lesson["kindKey"], "practical")

    def test_separates_transliterated_lecturer_name(self) -> None:
        lesson = scrape.parse_cell(["X (ICT1-LB) ლექცია", "თავდიშვილი ოთარ Tavdishvili Otar", "06-308ბ"])
        self.assertEqual(lesson["lecturer"], "თავდიშვილი ოთარ")
        self.assertEqual(lesson["lecturerLatin"], "Tavdishvili Otar")

    def test_tolerates_a_cell_that_is_only_a_subject(self) -> None:
        lesson = scrape.parse_cell(["რაღაც საგანი"])
        self.assertEqual(lesson["subject"], "რაღაც საგანი")
        self.assertEqual(lesson["courseCode"], "")
        self.assertEqual(lesson["kindKey"], "other")


class ParseTableTest(unittest.TestCase):
    def test_maps_cells_to_the_right_days(self) -> None:
        html = build_document(
            row("1-9:00", EMPTY, EMPTY, lesson_cell("ა (C1-LP) ლექცია<br>ლ ლ<br>101"), EMPTY, EMPTY, EMPTY)
        )
        _slots, lessons, warnings = scrape.parse_schedule_table(
            scrape.extract_table(html, "table_42_DETAILED")
        )
        self.assertEqual(warnings, [])
        self.assertEqual(len(lessons), 1)
        self.assertEqual(lessons[0]["day"], 2)
        self.assertEqual(lessons[0]["start"], "09:00")
        self.assertEqual(lessons[0]["end"], "10:00")

    def test_rowspan_in_the_last_column_does_not_shift_the_next_row(self) -> None:
        """Regression: a stale carry used to push every later cell one day right."""
        html = build_document(
            row("5-13:00", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, lesson_cell("სატ (C9-LB) ლექცია<br>ლ<br>900", rowspan=2))
            # Saturday is inherited here, so this row only carries five cells.
            + row("6-14:00", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY)
            + row("7-15:00", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, lesson_cell("შაბ (C8-LB) ლექცია<br>ლ<br>800"))
        )
        _slots, lessons, warnings = scrape.parse_schedule_table(
            scrape.extract_table(html, "table_42_DETAILED")
        )
        self.assertEqual(warnings, [])
        self.assertEqual([lesson["day"] for lesson in lessons], [5, 5])
        self.assertEqual(lessons[0]["span"], 2)
        self.assertEqual((lessons[0]["start"], lessons[0]["end"]), ("13:00", "15:00"))
        self.assertEqual((lessons[1]["start"], lessons[1]["end"]), ("15:00", "16:00"))

    def test_two_hour_block_covers_the_following_slot(self) -> None:
        html = build_document(
            row("11-19:00", EMPTY, lesson_cell("ბ (C2-P) პრაქტიკული<br>ი ი<br>09-204", rowspan=2), EMPTY, EMPTY, EMPTY, EMPTY)
            + row("12-20:00", EMPTY, EMPTY, EMPTY, lesson_cell("გ (C3-LB) ლექცია<br>თ თ<br>06-308ბ"), EMPTY)
        )
        _slots, lessons, warnings = scrape.parse_schedule_table(
            scrape.extract_table(html, "table_42_DETAILED")
        )
        self.assertEqual(warnings, [])
        self.assertEqual(lessons[0]["day"], 1)
        self.assertEqual((lessons[0]["start"], lessons[0]["end"]), ("19:00", "21:00"))
        # Monday, the inherited Tuesday, Wednesday, then Thursday.
        self.assertEqual(lessons[1]["day"], 4)

    def test_late_block_that_runs_past_midnight_keeps_a_valid_clock_time(self) -> None:
        html = build_document(
            row("14-22:00", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, lesson_cell("დ (C4-LB) ლექცია<br>ო<br>1", rowspan=2))
        )
        _slots, lessons, _warnings = scrape.parse_schedule_table(
            scrape.extract_table(html, "table_42_DETAILED")
        )
        self.assertEqual(lessons[0]["end"], "00:00")


class FindGroupTest(unittest.TestCase):
    def test_resolves_the_table_id_and_programme(self) -> None:
        html = build_document(row("1-9:00", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY))
        table_id, program = scrape.find_group_entry(html, "8676")
        self.assertEqual(table_id, "table_42_DETAILED")
        self.assertEqual(program, "მაგისტრატურა - პროგრამა ინფორმატიკა")

    def test_reports_a_missing_group(self) -> None:
        html = build_document(row("1-9:00", EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY))
        with self.assertRaisesRegex(scrape.ScrapeError, "not listed"):
            scrape.find_group_entry(html, "1234")

    def test_recognises_the_combined_all_groups_layout(self) -> None:
        html = '<table id="table_LESS_DETAILED"><tr><th class="yAxis">8676</th></tr></table>'
        with self.assertRaisesRegex(scrape.ScrapeError, "combined all-groups layout"):
            scrape.find_group_entry(html, "8676")


class HelperTest(unittest.TestCase):
    def test_academic_year_prefixes_roll_over_in_august(self) -> None:
        from datetime import datetime, timezone

        autumn = scrape.academic_year_prefixes(datetime(2026, 10, 2, tzinfo=timezone.utc))
        spring = scrape.academic_year_prefixes(datetime(2027, 3, 2, tzinfo=timezone.utc))
        self.assertEqual(autumn[0], "groups 2026_2027")
        self.assertEqual(spring[0], "groups 2026_2027")

    def test_shift_time_wraps_at_midnight(self) -> None:
        self.assertEqual(scrape.shift_time("22:00", 1), "23:00")
        self.assertEqual(scrape.shift_time("23:00", 1), "00:00")


if __name__ == "__main__":
    unittest.main(verbosity=2)
