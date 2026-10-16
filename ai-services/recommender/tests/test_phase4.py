# ai-services/recommender/tests/test_phase4.py
# Phase 4 — expired-vs-expiring distinction (safety), plus regression locks
# for the expiry boost semantics. Pure functions only.
import sys
from datetime import date, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

import scoring

TODAY = date.today()
iso = lambda d: d.isoformat()  # noqa: E731


def _item(name, days_from_today):
    return {"name": name, "expiry_date": iso(TODAY + timedelta(days=days_from_today))}


def test_expiry_boost_ramp_within_three_days():
    assert scoring.expiry_priority(["tomato"], [_item("tomato", 0)]) == 1.0    # today
    assert abs(scoring.expiry_priority(["tomato"], [_item("tomato", 1)]) - 0.75) < 1e-9
    assert abs(scoring.expiry_priority(["tomato"], [_item("tomato", 3)]) - 0.25) < 1e-9
    assert scoring.expiry_priority(["tomato"], [_item("tomato", 4)]) == 0.0     # too far


def test_expired_item_gets_no_use_me_boost():
    # Phase 4 safety fix: expired must NOT score like "use today".
    assert scoring.expiry_priority(["tomato"], [_item("tomato", -1)]) == 0.0
    assert scoring.expiry_priority(["tomato"], [_item("tomato", -30)]) == 0.0


def test_expired_flag_separates_expired_from_expiring():
    assert scoring.expired_flag(["tomato"], [_item("tomato", -1)]) is True
    assert scoring.expired_flag(["tomato"], [_item("tomato", 0)]) is False   # expiring today ≠ expired
    assert scoring.expired_flag(["tomato"], [_item("tomato", 2)]) is False
    assert scoring.expired_flag(["rice"], [_item("tomato", -1)]) is False    # not in recipe
    assert scoring.expired_flag(["tomato"], []) is False


def test_expired_flag_handles_prefix_and_bad_dates():
    # Prefix matching kept in sync with expiry_priority ('chopped spinach 108').
    assert scoring.expired_flag(["chopped spinach 108"], [_item("chopped spinach", -1)]) is True
    assert scoring.expired_flag(["tomato"], [{"name": "tomato", "expiry_date": "not-a-date"}]) is False
