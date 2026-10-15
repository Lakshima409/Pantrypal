# ai-services/recommender/preprocessing.py
# Turns recipes into TF-IDF documents (blueprint §19): title + ingredients +
# tags, normalised so "Chicken Curry" and its ingredients live in one bag of
# words the vectoriser can compare with cosine similarity.
#
# Phase 3.1 — content-based hardening:
#   * canonical ingredient normalisation (case, punctuation, plurals, dataset
#     id suffixes, quantity/unit fragments) shared with scoring.pantry_match
#   * small curated synonym map (chickpea/garbanzo, capsicum/bell pepper, …)
#   * per-recipe ingredient dedup so repeated rows can't inflate TF
#   * missing-data guards: empty title / no ingredients / no tags degrade to
#     "" rather than crashing the vectoriser
import re

_TOKEN_RE = re.compile(r"[^a-z0-9\s]+")
_ID_SUFFIX_RE = re.compile(r"\s+\d+$")          # dataset ids: 'spinach 108'
_QTY_FRAG_RE = re.compile(
    r"\b(\d+[\d./]*\s*(?:g|kg|mg|oz|lb|ml|l|tsp|tbsp|cup|cups|clove|cloves|"
    r"slice|slices|piece|pieces|can|cans|pinch|bunch))\b"
)
_WS_RE = re.compile(r"\s+")

STOPWORDS = {
    "the", "and", "of", "with", "a", "an", "to", "in", "on", "for", "fresh",
    "cup", "cups", "tbsp", "tsp", "oz", "large", "small", "medium", "chopped",
    "diced", "sliced", "minced", "grated", "ground", "whole", "free",
}

# Canonical forms for common variants. Keys and values are already normalised
# (lowercase, single spaces). Keep this list small and food-specific — it is
# checked into the repo so experiments stay reproducible.
SYNONYMS = {
    "garbanzo": "chickpea",
    "garbanzos": "chickpea",
    "chick peas": "chickpea",
    "chickpea": "chickpea",
    "capsicum": "bell pepper",
    "scallion": "spring onion",
    "scallions": "spring onion",
    "spring onions": "spring onion",
    "cilantro": "coriander",
    "coriander leaves": "coriander",
    "eggplant": "aubergine",
    "zucchini": "courgette",
    "arugula": "rocket",
    "chilly": "chilli",
    "chillies": "chilli",
    " chilies": "chilli",
    "yoghurt": "yogurt",
    "grey yogurt": "greek yogurt",
    "mozzarella cheese": "mozzarella",
    "cheddar": "cheddar cheese",
    "tomatos": "tomato",
    "tomatoes": "tomato",
    "potatos": "potato",
    "potatoes": "potato",
    "leafs": "leaves",
}

# Lightweight plural strip for the long tail (…es/…s). Applied AFTER the
# synonym map; guarded so short words and …ss words are untouched.
_PLURAL_ES_RE = re.compile(r"^(.*(?:ch|sh|x|s|z|o))es$")
_PLURAL_S_RE = re.compile(r"^(.*[^s])s$")


def _strip_plural(token):
    if len(token) <= 3 or token in SYNONYMS:
        return token
    m = _PLURAL_ES_RE.match(token)
    if m:
        return m.group(1)
    if token.endswith("ss"):
        return token
    m = _PLURAL_S_RE.match(token)
    if m:
        return m.group(1)
    return token


def normalise(text):
    """Lowercase, strip punctuation, drop dataset id suffixes ('spinach 108')."""
    text = _TOKEN_RE.sub(" ", str(text or "").lower())
    text = _ID_SUFFIX_RE.sub("", text)
    return " ".join(text.split())


def canonical_ingredient(name):
    """Canonical form of one ingredient name (Phase 3.1).

    normalise → drop quantity fragments → synonym map → plural strip.
    Returns "" for empty input so callers can filter it out.
    """
    text = normalise(name)
    if not text:
        return ""
    text = _QTY_FRAG_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip()
    if not text:
        return ""
    if text in SYNONYMS:
        return SYNONYMS[text]
    # Multi-word: map each token, then re-check the joined phrase.
    tokens = [_strip_plural(t) for t in text.split()]
    joined = " ".join(tokens)
    return SYNONYMS.get(joined, joined)


def dedupe_ingredients(names):
    """Dedupe one recipe's ingredients by canonical form (keeps first)."""
    seen, out = set(), []
    for name in names or []:
        key = canonical_ingredient(name)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(key)
    return out


def recipe_document(title, ingredient_names, tag_names, cuisine=None):
    """One TF-IDF document per recipe (missing-data safe)."""
    parts = []
    title_norm = normalise(title)
    if title_norm:
        parts.append(title_norm)
    parts.extend(dedupe_ingredients(ingredient_names))
    for tag in tag_names or []:
        t = normalise(tag)
        if t:
            parts.append(t)
    if cuisine:
        c = normalise(cuisine)
        if c:
            parts.append(c)
    tokens = [t for t in " ".join(parts).split() if t and t not in STOPWORDS and not t.isdigit()]
    return " ".join(tokens)



def parse_instruction_count(instructions):
    """Newlines or JSON list → step count (used as light metadata, not TF-IDF)."""
    if isinstance(instructions, list):
        return len(instructions)
    return len([s for s in re.split(r"\r?\n+", str(instructions or "")) if s.strip()])
