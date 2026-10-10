# ai-services/recommender/preprocessing.py
# Turns recipes into TF-IDF documents (blueprint §19): title + ingredients +
# tags, normalised so "Chicken Curry" and its ingredients live in one bag of
# words the vectoriser can compare with cosine similarity.
import re

_TOKEN_RE = re.compile(r"[^a-z0-9\s]+")

STOPWORDS = {
    "the", "and", "of", "with", "a", "an", "to", "in", "on", "for", "fresh",
    "cup", "cups", "tbsp", "tsp", "oz", "large", "small", "medium", "chopped",
    "diced", "sliced", "minced", "grated", "ground", "whole", "free",
}


def normalise(text):
    """Lowercase, strip punctuation, drop dataset id suffixes ('spinach 108')."""
    text = _TOKEN_RE.sub(" ", str(text or "").lower())
    return " ".join(text.split())


def recipe_document(title, ingredient_names, tag_names, cuisine=None):
    """One TF-IDF document per recipe."""
    parts = [normalise(title)]
    parts.extend(normalise(name) for name in (ingredient_names or []))
    parts.extend(normalise(tag) for tag in (tag_names or []))
    if cuisine:
        parts.append(normalise(cuisine))
    tokens = [t for t in " ".join(parts).split() if t and t not in STOPWORDS and not t.isdigit()]
    return " ".join(tokens)


def parse_instruction_count(instructions):
    """Newlines or JSON list → step count (used as light metadata, not TF-IDF)."""
    if isinstance(instructions, list):
        return len(instructions)
    return len([s for s in re.split(r"\r?\n+", str(instructions or "")) if s.strip()])
