"""python3 -m unittest discover -s <this folder>. Standard library only; Garmin is never called."""
import unittest
from datetime import date

import coach

MON = date(2026, 10, 12)


def db(plans, runs):
    conn = coach.connect(":memory:")
    conn.executemany("INSERT INTO plans(date, kind, distance_km, pace_s) VALUES (?,?,?,?)", plans)
    conn.executemany("INSERT INTO runs(id, date, distance_m, duration_s) VALUES (?,?,?,?)", runs)
    return conn


class WeekTest(unittest.TestCase):
    def setUp(self):
        self.conn = db([("2026-10-13", "easy", 8, 330), ("2026-10-14", "tempo", 10, 270),
                        ("2026-10-15", "rest", 0, None), ("2026-10-16", "easy", 6, None),
                        ("2026-10-18", "long", 14, None)],
                       [("a", "2026-10-13", 8000, 8 * 300), ("b", "2026-10-14", 8000, 8 * 270),
                        ("c", "2026-10-15", 5000, 5 * 330), ("d", "2026-10-14", 3000, 3 * 400)])

    def test_verdicts_and_totals(self):
        w = coach.week(self.conn, date(2026, 10, 15), today=date(2026, 10, 20))
        self.assertEqual(w["monday"], MON.isoformat())
        verdicts = [p["verdict"] for d in w["days"] for p in d["plans"]]
        # Friday's 6 km is met by Thursday's 5 km run (a day early): too short, not missed.
        self.assertEqual(verdicts, ["too fast", "too short", "rest", "too short", "missed"])
        self.assertEqual([r["id"] for d in w["days"] for r in d["extras"]], ["d"])
        self.assertEqual((w["planned_km"], w["done_km"]), (38, 24))

    def test_run_a_day_early_counts_for_the_plan(self):
        conn = db([("2026-10-13", "easy", 6, None)], [("m", "2026-10-12", 6000, 6 * 360)])
        w = coach.week(conn, MON, today=date(2026, 10, 17))
        tuesday = w["days"][1]["plans"][0]
        self.assertEqual((tuesday["run"]["id"], tuesday["verdict"]), ("m", "on target"))
        monday = w["days"][0]
        self.assertEqual((monday["extras"], monday["counts_for"][0]["plan_date"]), ([], "2026-10-13"))

    def test_same_day_run_wins_over_a_neighbour(self):
        conn = db([("2026-10-13", "easy", 6, None), ("2026-10-14", "easy", 6, None)],
                  [("tue", "2026-10-13", 6000, 2000), ("wed", "2026-10-14", 6000, 2000)])
        plans = [p for d in coach.days(conn, MON, MON, date(2026, 10, 17)) + coach.days(
            conn, date(2026, 10, 13), date(2026, 10, 14), date(2026, 10, 17)) for p in d["plans"]]
        self.assertEqual([p["run"]["id"] for p in plans], ["tue", "wed"])

    def test_yesterdays_plan_can_still_be_done_today(self):
        day = coach.days(self.conn, date(2026, 10, 16), date(2026, 10, 16), today=date(2026, 10, 17))[0]
        self.assertEqual(day["plans"][0]["verdict"], "too short")  # matched to Thursday's run
        day = coach.days(self.conn, date(2026, 10, 18), date(2026, 10, 18), today=date(2026, 10, 19))[0]
        self.assertEqual(day["plans"][0]["verdict"], "to do")

    def test_both_weeks_agree_on_a_run_at_their_boundary(self):
        # Monday's plan is met by Tuesday's run; Sunday's run belongs to no plan, whichever week is viewed.
        conn = db([("2026-10-19", "easy", 8, None)],
                  [("sun", "2026-10-18", 8000, 2900), ("tue", "2026-10-20", 8000, 2900)])
        before = coach.week(conn, MON, today=date(2026, 10, 25))["days"][6]
        after = coach.week(conn, date(2026, 10, 19), today=date(2026, 10, 25))["days"][0]
        self.assertEqual(([r["id"] for r in before["extras"]], before["counts_for"]), (["sun"], []))
        self.assertEqual(after["plans"][0]["run"]["id"], "tue")

    def test_run_without_distance_does_not_crash(self):
        conn = db([("2026-10-13", "easy", 6, 360)], [("z", "2026-10-13", 0, 600)])
        day = coach.days(conn, date(2026, 10, 13), date(2026, 10, 13), today=date(2026, 10, 17))[0]
        self.assertEqual(day["plans"][0]["verdict"], "too short")
        self.assertIn("0.0 km at ?", coach.day_text(day))


if __name__ == "__main__":
    unittest.main()
