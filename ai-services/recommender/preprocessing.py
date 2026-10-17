# ai-services/recommender/preprocessing.py
# Turns recipes into TF-IDF documents (blueprint §19): title + ingredients +
# tags, normalised so "Chicken Curry" and its ingredients live in one bag of
# words the vectoriser can compare with cosine similarity.
import re

_TOKEN_RE = re.compile(r"[^a-z0-9\s]+")
_ID_SUFFIX_RE = re.compile(r"\s+\d+$")
_QTY_FRAG_RE = re.compile(
    r"\b(\d+(?:\.\d+)?\s+(?:g|kg|mg|oz|lb|ml|l|tsp|tbsp|cup|cups|clove|cloves|"
    r"slice|slices|piece|pieces|can|cans|pinch|bunch|gram|gramme|litre|liters|"
    r"sticks|stalk|stalks|bag|bags|jar|jug|pint|quart|tablespoon))"
)
_SIZE_FOOD_RE = re.compile(r"^(large|small|medium|extra-large|extra large|big|tiny)\s+", re.IGNORECASE)
_WS_RE = re.compile(r"\s+")
STOPWORDS = {
    "the", "and", "of", "with", "a", "an", "to", "in", "on", "for", "fresh",
    "cup", "cups", "tbsp", "tsp", "oz", "large", "small", "medium", "chopped",
    "diced", "sliced", "minced", "grated", "ground", "whole", "free",
}
SYNONYMS = {
    "garbanzo": "chickpea", "garbanzos": "chickpea", "chick peas": "chickpea",
    "chickpea": "chickpea", "capsicum": "bell pepper",
    "scallion": "spring onion", "scallions": "spring onion",
    "spring onions": "spring onion", "cilantro": "coriander",
    "coriander leaves": "coriander",
    "eggplant": "aubergine", "zucchini": "courgette", "arugula": "rocket",
    "chilly": "chilli", "chillies": "chilli", "chilies": "chilli",
    "yoghurt": "yogurt", "grey yogurt": "greek yogurt",
    "mozzarella cheese": "mozzarella", "cheddar": "cheddar cheese",
    "tomatos": "tomato", "tomatoes": "tomato", "tomatoe": "tomato",
    "tomatillo": "tomatillo", "tomato paste": "tomato paste",
    "tomato sauce": "tomato sauce", "sweet basil": "basil", "basil": "basil",
    "bay leaf": "bay leaf", "bay leaves": "bay leaf",
    "garlic clove": "garlic", "garlic cloves": "garlic", "garlic": "garlic",
    "rosemary": "rosemary", "thyme": "thyme", "oregano": "oregano",
    "parsley": "parsley", "sage": "sage",
    "pepper": "black pepper", "black pepper": "black pepper",
    "white pepper": "white pepper", "red pepper flakes": "red pepper flakes",
    "cumin seeds": "cumin", "cumin powder": "cumin",
    "curry powder": "curry powder", "nutmeg": "nutmeg",
    "cinnamon": "cinnamon", "cardamom": "cardamom", "cloves": "clove",
    "allspice": "allspice", "mustard seeds": "mustard seeds",
    "mustard powder": "mustard powder", "paprika": "paprika",
    "smoked paprika": "paprika", "turmeric": "turmeric", "ginger": "ginger",
    "sunflower seeds": "sunflower seeds", "pumpkin seeds": "pumpkin seeds",
    "sesame seeds": "sesame seeds", "poppy seeds": "poppy seeds",
    "macadamia": "macadamia nuts", "cashews": "cashews",
    "almonds": "almonds", "peanuts": "peanuts", "walnuts": "walnuts",
    "pecans": "pecans", "hazelnuts": "hazelnuts", "pistachios": "pistachios",
    "bacon": "bacon", "ham": "ham", "sausage": "sausage", "chorizo": "chorizo",
    "hot dog": "hot dog", "hamburger": "hamburger", "cheeseburger": "cheeseburger",
    "salmon fillet": "salmon fillet", "cod fillet": "cod fillet",
    "prawns": "prawns", "shrimp": "shrimp",
    "ghost pepper": "chilli", "habanero": "chilli",
    "jalapeno": "jalapeno", "jalapenos": "jalapeno",
    "poblano": "poblano", "pasilla": "pasilla", "ancho": "ancho chile",
}
_OPTIONAL_KEYWORDS = {
"for garnish", "optional", "optional garnish", "topping", "sprinkle",
    "dressing", "garnish", "for topping", "as topping", "for sauce",
    "for dressing", "as a", "with", "in",
}
_FUNCTIONAL_KEYWORDS = {"salt", "pepper", "oil", "butter", "water", "broth", "stock"}
_PLURALS = {
    "tomatoes": "tomato", "tomatillos": "tomatillo", "jalapenos": "jalapeno",
    "cherries": "cherry", "peaches": "peach", "peppers": "pepper",
    "onions": "onion", "lemons": "lemon", "bananas": "banana",
    "apples": "apple", "oranges": "orange", "grapes": "grape",
    "mushrooms": "mushroom", "broccoli": "broccoli", "cauliflower": "cauliflower",
    "spinach": "spinach", "zucchini": "zucchini",
}

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



# ---------- Priority 3.1: quantity/unit and size helpers ----------
def _remove_quantity_fragments(text):
    return _QTY_FRAG_RE.sub(' ', text)

def _strip_size_word(text):
    return _SIZE_FOOD_RE.sub('', text)
def canonical_ingredient(name):
    """Canonical form of one ingredient name (Phase 3.1 + 3.3).

    normalise -> drop quantity fragments -> strip size word -> synonym map ->
    plural strip.  Returns "" for empty input so callers can filter it out.
    """
    text = normalise(name)
    if not text:
        return ""
    text = _remove_quantity_fragments(text)
    text = _strip_size_word(text)
    text = _WS_RE.sub(" ", text).strip()
    if not text:
        return ""
    if text in SYNONYMS:
        return SYNONYMS[text]
    tokens = [_strip_plural(t) for t in text.split()]
    joined = " ".join(tokens)
    if joined in SYNONYMS:
        return SYNONYMS[joined]
    return joined




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


# ---------- Priority 3: Ingredient matching helpers ----------
_OPTIONAL_KEYWORDS = {
"for garnish", "optional", "optional garnish", "topping", "sprinkle",
    "dressing", "garnish", "for topping", "as topping", "for sauce",
    "for dressing", "as a", "with", "in",
}
_FUNCTIONAL_KEYWORDS = {"salt", "pepper", "oil", "butter", "water", "broth", "stock"}

def classify_required_ingredient(name, instructions=None):
    if not name:
        return 1
    text = str(name).strip().lower()
    if not text:
        return 1
    for kw in _OPTIONAL_KEYWORDS:
        if kw in ("with", "in", "as a"):
            continue  # too broad as a substring match; kept for reference only
        if kw in text:
            return 0
    m = re.search(r'\(([^)]*)\)', text)
    if m and any(w in m.group(1).lower() for w in ('garnish', 'topping', 'sprinkle', 'optional')):
        return 0
    return 1
def extract_ingredients_from_text(text):
    if not text:
        return []
    required = []
    for line in str(text).splitlines():
        line = line.strip()
        if not line:
            continue
        segments = [s.strip() for s in re.split(r'[;,]', line) if s.strip()]
        if not segments:
            segments = [line]
        for seg in segments:
            if any(kw in seg.lower() for kw in _OPTIONAL_KEYWORDS):
                continue
            cleaned = re.sub(r'^\d+\s*(?:/+\d+)?\s*', '', seg).strip()
            cleaned = re.sub(r'^(tbsp|tsp|cups?|tablespoons?|teaspoons?|g|kg|mg|oz|lb|ml|l|cloves?|slices?|pieces?|cans?|pinch|bunch|grams?)\b\s*', '', cleaned, flags=re.IGNORECASE).strip()
            if not cleaned:
                continue
            canonical = canonical_ingredient(cleaned)
            if canonical:
                required.append(canonical)
    return required

def classify_ingredients(ingredient_names, instructions=None):
    required = []
    optional = []
    for name in ingredient_names or []:
        if not name:
            continue
        key = canonical_ingredient(name)
        if key and classify_required_ingredient(name):
            required.append(str(name).strip())
        else:
            optional.append(str(name).strip())
    return {'required': required, 'optional': optional}
class IngredientMatcher:
    def __init__(self, recipe_ingredients, pantry_ingredients=None, instructions=None):
        self.recipe_ingredients = recipe_ingredients or []
        self.pantry_ingredients = pantry_ingredients or []
        self.instructions = instructions
        self.recipe_classified = classify_ingredients(self.recipe_ingredients, instructions)
        self.required_ingredients = self.recipe_classified['required']
        self.optional_ingredients = self.recipe_classified['optional']
        self._pantry_set = set()
        for ing in self.pantry_ingredients:
            key = canonical_ingredient(ing)
            if key:
                self._pantry_set.add(key)
        self._canonical_map = {}
        for ing in self.recipe_ingredients:
            key = canonical_ingredient(ing)
            if key and key not in self._canonical_map:
                self._canonical_map[key] = ing

    def match(self):
        req = [canonical_ingredient(n) for n in self.required_ingredients]
        req = [k for k in req if k]
        avail = sum(1 for k in req if k in self._pantry_set)
        missing = [self._canonical_map.get(k, k) for k in req if k not in self._pantry_set]
        opt = [canonical_ingredient(n) for n in self.optional_ingredients]
        opt = [k for k in opt if k]
        opt_avail = sum(1 for k in opt if k in self._pantry_set)
        opt_missing = [self._canonical_map.get(k, k) for k in opt if k not in self._pantry_set]
        total_req = len(req)
        return {
            'total_required': total_req,
            'required_available': avail,
            'required_missing': missing,
            'total_optional': len(opt),
            'optional_available': opt_avail,
            'optional_missing': opt_missing,
            'match_percent': round(avail / total_req, 4) if total_req > 0 else 0.0,
        }

    def required_remaining(self):
        req = [canonical_ingredient(n) for n in self.required_ingredients]
        req = [k for k in req if k]
        return [self._canonical_map.get(k, k) for k in req if k not in self._pantry_set]

    def required_met(self):
        req = [canonical_ingredient(n) for n in self.required_ingredients]
        req = [k for k in req if k]
        return [self._canonical_map.get(k, k) for k in req if k in self._pantry_set]
