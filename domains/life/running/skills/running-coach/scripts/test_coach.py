"""python3 -m unittest discover -s <this folder>. Standard library only; Garmin is never called."""
import unittest
from datetime import date

import coach

MON = date(2026, 10, 12)


class WeekTest(unittest.TestCase):
    def setUp(self):
        self.conn = coach.connect(":memory:")
        plans = [("2026-10-13", "easy", 8, 330), ("2026-10-14", "tempo", 10, 270),
                 ("2026-10-15", "rest", 0, None), ("2026-10-16", "easy", 6, None)]
        self.conn.executemany("INSERT INTO plans(date, kind, distance_km, pace_s) VALUES (?,?,?,?)", plans)
        runs = [("a", "2026-10-13", 8000, 8 * 300), ("b", "2026-10-14", 8000, 8 * 270),
                ("c", "2026-10-15", 5000, 5 * 330), ("d", "2026-10-14", 3000, 3 * 400)]
        self.conn.executemany("INSERT INTO runs(id, date, distance_m, duration_s) VALUES (?,?,?,?)", runs)

    def test_verdicts_and_totals(self):
        w = coach.week(self.conn, date(2026, 10, 15), today=date(2026, 10, 17))
        self.assertEqual(w["monday"], MON.isoformat())
        verdicts = [p["verdict"] for d in w["days"] for p in d["plans"]]
        self.assertEqual(verdicts, ["too fast", "too short", "rest", "missed"])
        extras = [r["id"] for d in w["days"] for r in d["extras"]]
        self.assertEqual(extras, ["d", "c"])  # the shorter run of a two-run day, and the run on a rest day
        self.assertEqual((w["planned_km"], w["done_km"]), (24, 24))

    def test_future_plan_is_to_do(self):
        day = coach.days(self.conn, date(2026, 10, 16), date(2026, 10, 16), today=date(2026, 10, 16))[0]
        self.assertEqual(day["plans"][0]["verdict"], "to do")


if __name__ == "__main__":
    unittest.main()
