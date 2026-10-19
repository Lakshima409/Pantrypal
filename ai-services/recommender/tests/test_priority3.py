# ai-services/recommender/tests/test_priority3.py
# Priority 3 tests: ingredient matching, required/optional classification,
# and pantry-match integration.  No MySQL required.
# Run: python -m pytest tests/test_priority3.py -v
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # service root

import pytest

from preprocessing import (
    canonical_ingredient,
    classify_required_ingredient,
    classify_ingredients,
    extract_ingredients_from_text,
    IngredientMatcher,
)
from scoring import pantry_match


# ---------------------------------------------------------------------------
# 1. Canonical ingredient tests (Phase 3.1 + 3.3 helpers)
# ---------------------------------------------------------------------------

def test_canonical_tomato_variants():
    assert canonical_ingredient("tomato") == "tomato"
    assert canonical_ingredient("Tomatoes") == "tomato"
    assert canonical_ingredient("tomatos") == "tomato"
    assert canonical_ingredient("tomatoe") == "tomato"
    assert canonical_ingredient("tomatillo") == "tomatillo"
    assert canonical_ingredient("Tomato paste") == "tomato paste"
    assert canonical_ingredient("Tomato sauce") == "tomato sauce"


def test_canonical_garlic():
    assert canonical_ingredient("garlic") == "garlic"
    assert canonical_ingredient("garlic cloves") == "garlic"
    assert canonical_ingredient("garlic clove") == "garlic"


def test_canonical_herbs_spices():
    assert canonical_ingredient("basil") == "basil"
    assert canonical_ingredient("sweet basil") == "basil"
    assert canonical_ingredient("black pepper") == "black pepper"
    assert canonical_ingredient("red pepper flakes") == "red pepper flakes"
    assert canonical_ingredient("cumin powder") == "cumin"


def test_canonical_meat_variants():
    assert canonical_ingredient("chicken") == "chicken"
    assert canonical_ingredient("bacon") == "bacon"
    assert canonical_ingredient("prawns") == "prawns"
    assert canonical_ingredient("shrimp") == "shrimp"
    assert canonical_ingredient("salmon fillet") == "salmon fillet"


def test_canonical_size_word_removed():
    assert canonical_ingredient("large egg") == "egg"
    assert canonical_ingredient("small onion") == "onion"
    assert canonical_ingredient("medium potato") == "potato"


def test_canonical_quantity_removed():
    assert canonical_ingredient("2 cups rice") == "rice"
    assert canonical_ingredient("50 g butter") == "butter"
    assert canonical_ingredient("1 clove garlic") == "garlic"
    assert canonical_ingredient("3 tbsp olive oil") == "olive oil"


def test_canonical_quantity_with_unit():
    assert canonical_ingredient("3 tbsp oil") == "oil"
    assert canonical_ingredient("50 g sugar") == "sugar"


def test_canonical_plurals():
    assert canonical_ingredient("chickpeas") == "chickpea"
    assert canonical_ingredient("onions") == "onion"
    assert canonical_ingredient("lemons") == "lemon"
    assert canonical_ingredient("peppers") == "black pepper"


def test_canonical_garbanzo():
    assert canonical_ingredient("Garbanzo") == "chickpea"
    assert canonical_ingredient("garbanzos") == "chickpea"


# ---------------------------------------------------------------------------
# 2. Required / optional classification (Phase 3.3)
# ---------------------------------------------------------------------------

def test_classify_required_basic():
    assert classify_required_ingredient('salt') == 1
    assert classify_required_ingredient('chicken breast') == 1
    assert classify_required_ingredient('olive oil') == 1


def test_classify_optional_garnish():
    assert classify_required_ingredient('parsley for garnish') == 0
    assert classify_required_ingredient('lemon wedges for garnish') == 0
    assert classify_required_ingredient('coriander as garnish') == 0
    assert classify_required_ingredient('fresh coriander sprinkled on top') == 0


def test_classify_optional_keyword():
    assert classify_required_ingredient('chicken, optional') == 0


def test_classify_parenthetical_garnish():
    assert classify_required_ingredient('garlic (for roasting)') == 1
    assert classify_required_ingredient('pepper (for garnish)') == 0
    assert classify_required_ingredient('chives (optional)') == 0


def test_classify_ingredients_split():
    result = classify_ingredients(
        ['chicken breast', 'rice', 'parsley for garnish', 'salt']
    )
    assert result['required'] == ['chicken breast', 'rice', 'salt']
    assert result['optional'] == ['parsley for garnish']


def test_extract_ingredients_from_text():
    text = '1 onion, 2 tbsp olive oil, salt and pepper to taste, parsley for garnish'
    extras = extract_ingredients_from_text(text)
    assert 'onion' in extras
    assert 'olive oil' in extras


# ---------------------------------------------------------------------------
# 3. IngredientMatcher tests
# ---------------------------------------------------------------------------

def test_ingredient_matcher_full_match():
    matcher = IngredientMatcher(
        ['chicken', 'broccoli', 'olive oil', 'salt'],
        ['chicken', 'broccoli', 'olive oil', 'salt']
    )
    m = matcher.match()
    assert m['total_required'] == 4
    assert m['required_available'] == 4
    assert m['match_percent'] == 1.0
    assert m['required_missing'] == []


def test_ingredient_matcher_partial_match():
    matcher = IngredientMatcher(
        ['chicken', 'broccoli', 'olive oil', 'salt'],
        ['chicken', 'butter']
    )
    m = matcher.match()
    assert m['total_required'] == 4
    assert m['required_available'] == 1
    assert m['match_percent'] == 0.25


def test_ingredient_matcher_with_optional():
    matcher = IngredientMatcher(
        ['chicken', 'broccoli', 'parsley for garnish', 'salt'],
        ['chicken', 'salt']
    )
    m = matcher.match()
    assert m['total_required'] == 3
    assert m['total_optional'] == 1
    assert m['required_available'] == 2


def test_ingredient_matcher_size_word_removed():
    matcher = IngredientMatcher(
        ['large egg', 'onion'],
        ['egg', 'onion']
    )
    m = matcher.match()
    assert m['match_percent'] == 1.0


def test_ingredient_matcher_quantity_handling():
    matcher = IngredientMatcher(
        ['2 cups rice', '50 g butter'],
        ['rice']
    )
    m = matcher.match()
    assert m['total_required'] == 2
    assert m['required_available'] == 1
    assert m['match_percent'] == 0.5


def test_ingredient_matcher_remaining_and_met():
    matcher = IngredientMatcher(
        ['chicken', 'broccoli', 'rice', 'salt', 'olive oil'],
        ['chicken', 'rice', 'salt']
    )
    assert matcher.required_met() == ['chicken', 'rice', 'salt']
    assert matcher.required_remaining() == ['broccoli', 'olive oil']


# ---------------------------------------------------------------------------
# 4. Backward-compat tests for pantry_match
# ---------------------------------------------------------------------------

def test_pantry_match_unchanged_full():
    ings = ['chicken thigh', 'rice', 'onion', 'soy sauce']
    assert pantry_match(ings, [i for i in ings]) == 1.0


def test_pantry_match_unchanged_partial():
    ings = ['chicken thigh', 'rice', 'onion', 'soy sauce']
    assert pantry_match(ings, ['chicken thigh']) == 0.25
    assert pantry_match(ings, []) == 0.0
    assert pantry_match([], ['rice']) == 0.0


# ---------------------------------------------------------------------------
# 5. Sanity: ordering and no-regression for existing tests
# ---------------------------------------------------------------------------

def test_sanity_no_regression_quantity_and_plural():
    assert canonical_ingredient('2 cups rice') == 'rice'
    assert canonical_ingredient('garbanzo') == 'chickpea'
    assert canonical_ingredient('tomatoes') == 'tomato'
    assert canonical_ingredient('capsicum') == 'bell pepper'


def test_sanity_first_word_preserved():
    assert canonical_ingredient('large egg') == 'egg'
    assert canonical_ingredient('eggplant') == 'aubergine'


def test_matcher_required_met_list():
    matcher = IngredientMatcher(
        ['flour', 'sugar', 'butter', 'egg'],
        ['flour', 'butter']
    )
    assert matcher.required_met() == ['flour', 'butter']
    assert len(matcher.required_remaining()) == 2
