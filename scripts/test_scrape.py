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


def teacher_document(rows: str, name: str = "სიხარულიძე ნუგზარი", table_id: str = "table_1067") -> str:
    return f"""
    <table id="{table_id}" border="1">
      <thead>
        <tr><td rowspan="2"></td><th colspan="6">{name}</th></tr>
        <tr><th class="xAxis">ორშ./Mon.</th><th class="xAxis">სამშ./Tues.</th>
        <th class="xAxis">ოთხშ./Wed.</th><th class="xAxis">ხუთშ./Thurs.</th>
        <th class="xAxis">პარ./Fri.</th><th class="xAxis">შაბ./Sat.</th></tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
    """


class CrossCheckTest(unittest.TestCase):
    """The lecturers' file lists attending groups, so it can confirm each lesson."""

    MONDAY_LECTURE = (
        "8684, 8695, 8696, 8676, 8641<br>"
        "საქმიანი კომუნიკაცია უცხოურ ენაზე (ინგლისური) (LEH16312G3-LP) ლექცია<br>06-502ა<br>"
    )

    def test_finds_the_group_in_a_lecturer_table(self) -> None:
        html = teacher_document(row("12-20:00", lesson_cell(self.MONDAY_LECTURE), *([EMPTY] * 5)))
        found = scrape.extract_group_from_teachers(html, "8676")
        self.assertEqual(len(found), 1)
        self.assertEqual(found[0]["day"], 0)
        self.assertEqual(found[0]["start"], "20:00")
        self.assertEqual(found[0]["courseCode"], "LEH16312G3-LP")
        self.assertEqual(found[0]["lecturer"], "სიხარულიძე ნუგზარი")
        self.assertEqual(found[0]["room"], "06-502ა")
        self.assertIn("8684", found[0]["groups"])

    def test_ignores_slots_belonging_to_other_groups(self) -> None:
        html = teacher_document(
            row(
                "11-19:00",
                lesson_cell("8651, 8686, 8671<br>რაღაც (LEH16312G3-LP) ლექცია<br>06-503ა<br>"),
                *([EMPTY] * 5),
            )
        )
        self.assertEqual(scrape.extract_group_from_teachers(html, "8676"), [])

    def test_does_not_match_a_group_code_that_is_only_a_substring(self) -> None:
        html = teacher_document(
            row("11-19:00", lesson_cell("86761, 18676<br>რაღაც (X-LP) ლექცია<br>1<br>"), *([EMPTY] * 5))
        )
        self.assertEqual(scrape.extract_group_from_teachers(html, "8676"), [])

    def test_confirms_matching_lessons_and_records_the_other_groups(self) -> None:
        lessons = [{"day": 0, "slot": 12, "start": "20:00", "courseCode": "LEH16312G3-LP"}]
        confirmations = [
            {
                "day": 0,
                "slot": 12,
                "start": "20:00",
                "courseCode": "LEH16312G3-LP",
                "groups": ["8684", "8676", "8641"],
                "lecturer": "სიხარულიძე ნუგზარი",
            }
        ]
        warnings = scrape.cross_check(lessons, confirmations, "8676")
        self.assertEqual(warnings, [])
        self.assertTrue(lessons[0]["confirmed"])
        self.assertEqual(lessons[0]["sharedWith"], ["8684", "8641"])

    def test_warns_when_a_lesson_is_not_backed_by_a_lecturer_table(self) -> None:
        lessons = [{"day": 0, "slot": 12, "start": "20:00", "courseCode": "LEH16312G3-LP"}]
        warnings = scrape.cross_check(lessons, [], "8676")
        self.assertFalse(lessons[0]["confirmed"])
        self.assertEqual(len(warnings), 1)
        self.assertIn("does not list group 8676", warnings[0])

    def test_warns_when_the_lecturers_file_knows_a_class_the_group_table_omits(self) -> None:
        confirmations = [
            {
                "day": 3,
                "slot": 9,
                "start": "17:00",
                "courseCode": "ICT1-LP",
                "groups": ["8676"],
                "lecturer": "ვიღაც ვინმე",
            }
        ]
        warnings = scrape.cross_check([], confirmations, "8676")
        self.assertEqual(len(warnings), 1)
        self.assertIn("missing from the group's own table", warnings[0])

    def test_derives_the_lecturers_file_name_from_the_groups_file(self) -> None:
        self.assertEqual(
            scrape.teachers_key_for("groups 2026_2027_I_3.html"), "teachers 2026_2027_I_3.html"
        )
        self.assertIsNone(scrape.teachers_key_for("something-else.html"))


class CourseListTest(unittest.TestCase):
    def lesson(self, code: str, lecturer: str) -> dict:
        return {"courseCode": code, "lecturer": lecturer, "start": "18:00", "day": 0}

    def test_without_a_list_everything_counts_as_enrolled(self):
        lessons = [self.lesson("ICT1-P", "ირემაძე ია"), self.lesson("LEH9-LP", "სხვა ვინმე")]
        warnings = scrape.apply_course_list(lessons, None)

        self.assertEqual(warnings, [])
        self.assertTrue(all(lesson["enrolled"] for lesson in lessons))

    def test_sets_aside_a_course_the_student_does_not_take(self):
        lessons = [self.lesson("ICT1-P", "ირემაძე ია"), self.lesson("LEH9-LP", "სიხარულიძე ნუგზარი")]
        courses = [{"code": "ICT1-P", "lecturer": "ირემაძე ია"}]

        scrape.apply_course_list(lessons, courses)

        self.assertTrue(lessons[0]["enrolled"])
        self.assertFalse(lessons[1]["enrolled"])

    def test_same_code_under_a_different_lecturer_is_not_a_match(self):
        lessons = [self.lesson("ICT19608G3-LP", "კაიშაური თინათინ")]
        courses = [{"code": "ICT19608G3-LP", "lecturer": "ჯულაყიძე ლევან"}]

        scrape.apply_course_list(lessons, courses)

        self.assertFalse(lessons[0]["enrolled"])

    def test_tolerates_a_wobbly_given_name(self):
        """The two files spell the same lecturer "ოთარ" and "ოთარი"."""
        lessons = [self.lesson("ICT32508G1-LB", "თავდიშვილი ოთარი")]
        courses = [{"code": "ICT32508G1-LB", "lecturer": "თავდიშვილი ოთარ"}]

        scrape.apply_course_list(lessons, courses)

        self.assertTrue(lessons[0]["enrolled"])

    def test_warns_about_a_course_with_no_class_this_week(self):
        lessons = [self.lesson("ICT1-P", "ირემაძე ია")]
        courses = [
            {"code": "ICT1-P", "lecturer": "ირემაძე ია"},
            {"code": "MAS2-LP", "lecturer": "კვარაცხელია ვახტანგ"},
        ]

        warnings = scrape.apply_course_list(lessons, courses)

        self.assertEqual(len(warnings), 1)
        self.assertIn("MAS2-LP", warnings[0])

    def test_a_code_listed_twice_matches_both_lecturers(self):
        lessons = [
            self.lesson("ICT19608G3-LP", "ჯულაყიძე ლევან"),
            self.lesson("ICT19608G3-LP", "კაიშაური თინათინ"),
        ]
        courses = [
            {"code": "ICT19608G3-LP", "lecturer": "ჯულაყიძე ლევან"},
            {"code": "ICT19608G3-LP", "lecturer": "კაიშაური თინათინ"},
        ]

        warnings = scrape.apply_course_list(lessons, courses)

        self.assertTrue(all(lesson["enrolled"] for lesson in lessons))
        self.assertEqual(warnings, [])

    def test_the_shipped_course_list_loads(self):
        courses = scrape.load_course_list("8676")

        self.assertIsNotNone(courses)
        assert courses is not None
        self.assertEqual(len(courses), 8)
        self.assertTrue(all(course["code"] and course["lecturer"] for course in courses))

    def test_the_list_is_ignored_for_a_different_group(self):
        self.assertIsNone(scrape.load_course_list("8594-1"))


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
