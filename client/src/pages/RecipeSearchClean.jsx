
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pantrypal.css';

const PH = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
];

const INITIAL_INGREDIENTS = ['Tomatoes', 'Butter'];

// Sample cards are only displayed when the recommendation API
// fails or returns no recipes. They are not real database recipes.
const FALLBACK = [
  {
    id: 'sample-1',
    title: 'Quick Fried Butter',
    ing: 1,
    kcal: null,
    img: PH[0],
  },
  {
    id: 'sample-2',
    title: 'Classic Cheese Burger',
    ing: 1,
    kcal: null,
    img: PH[1],
  },
  {
    id: 'sample-3',
    title: 'Authentic Onion Tacos',
    ing: 1,
    kcal: null,
    img: PH[2],
  },
  {
    id: 'sample-4',
    title: 'Gourmet Steamed Thyme',
    ing: 1,
    kcal: null,
    img: PH[3],
  },
  {
    id: 'sample-5',
    title: 'Easy Lemon Salad',
    ing: 1,
    kcal: null,
    img: PH[4],
  },
];

function RecipeSearchClean() {
  const [ingredients, setIngredients] = useState(INITIAL_INGREDIENTS);
  const [recipes, setRecipes] = useState(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const remove = (indexToRemove) => {
    setIngredients((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  };

  useEffect(() => {
    let alive = true;

    async function loadRecipes() {
      try {
        const qs = ingredients.filter(Boolean).length
          ? `?pantry=${encodeURIComponent(ingredients.filter(Boolean).join(','))}`
          : '';
        const response = await fetch(`/api/recipes/recommended${qs}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(
            `Failed to load recommendations (${response.status})`
          );
        }

        const data = await response.json();

        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.recipes)
            ? data.recipes
            : Array.isArray(data?.recommendations)
              ? data.recommendations
              : [];

        // Keep fallback cards visible if the API has no recipes.
        if (!alive) return;

        const validRecipes = list
          .map((recipe) => {
            const rawId = recipe.id ?? recipe.recipe_id;

            // The backend expects positive integer recipe IDs.
            const id = Number(rawId);

            if (
              rawId === undefined ||
              rawId === null ||
              String(rawId).trim() === '' ||
              !Number.isSafeInteger(id) ||
              id <= 0
            ) {
              return null;
            }

            const ingredientsList = Array.isArray(recipe.ingredients)
              ? recipe.ingredients
              : [];

            const calories = Number(recipe.nutrition?.calories);

            return {
              id: String(id),
              title: recipe.title || recipe.name || 'Recipe',
              img: recipe.image || recipe.imageUrl || null,
              imgIndex: Number.isSafeInteger(id) ? id % PH.length : 0,
              ing: ingredientsList.length,
              kcal:
                recipe.nutrition?.calories != null &&
                Number.isFinite(calories)
                  ? Math.round(calories)
                  : null,
              score: recipe.score,
              pantryMatch: recipe.pantryMatch,
            };
          })
          .filter(Boolean);

        if (validRecipes.length > 0) {
          setRecipes(validRecipes);
          setUsingFallback(false);
        } else {
          setRecipes(FALLBACK);
          setUsingFallback(true);
        }
      } catch (error) {
        if (!alive) return;

        console.error('Unable to load recipe recommendations:', error);
        setRecipes(FALLBACK);
        setUsingFallback(true);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadRecipes();

    return () => {
      alive = false;
    };
  }, [ingredients]);

  return (
    <div className="pp-page rs-page">
      <div className="rs-wrap">
        <div className="rs-ing-row">
          <span className="rs-ing-label">
            Based on your ingredients
          </span>

          <div className="rs-pills">
            {ingredients.map((ingredient, index) => (
              <button
                key={`${ingredient}-${index}`}
                type="button"
                className="rs-pill"
                onClick={() => remove(index)}
                aria-label={`Remove ${ingredient}`}
              >
                {ingredient}
                <span className="rs-pill-x" aria-hidden="true">
                  ×
                </span>
              </button>
            ))}

            {ingredients.length === 0 && (
              <span className="rs-empty-ingredients">
                No ingredients selected.
              </span>
            )}
          </div>
        </div>

        {loading && (
          <p
            className="rs-message"
            role="status"
            aria-live="polite"
          >
            Finding recipes for you…
          </p>
        )}

        {!loading && usingFallback && (
          <p className="rs-message rs-fallback-message">
            Sample recipes are shown because personalised
            recommendations are currently unavailable.
          </p>
        )}

        {!loading && (
          <div className="rs-grid">
            {recipes.map((recipe) => {
              const cardContent = (
                <>
                  <img
                    className="rs-card-img"
                    src={recipe.img || PH[(typeof recipe.imgIndex === 'number' ? recipe.imgIndex : 0) % PH.length]}
                    alt={recipe.title}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = PH[(typeof recipe.imgIndex === 'number' ? recipe.imgIndex : 0) % PH.length]; }}
                  />

                  <div className="rs-card-body">
                    <div className="rs-card-title">
                      {recipe.title}
                    </div>

                    <div className="rs-card-meta">
                      {recipe.ing}{' '}
                      {recipe.ing === 1 ? 'ingredient' : 'ingredients'}

                      {recipe.kcal != null &&
                        ` • ${recipe.kcal} kcal`}

                      {typeof recipe.pantryMatch === 'number' &&
                        ` • ${Math.round(
                          recipe.pantryMatch * 100
                        )}% pantry match`}
                    </div>
                  </div>
                </>
              );

              return (
                <div key={recipe.id} className="rs-card">
                  {usingFallback ? (
                    <div
                      className="rs-card-link rs-card-static"
                      aria-label={`${recipe.title}, sample recipe`}
                    >
                      {cardContent}
                    </div>
                  ) : (
                    <Link
                      to={`/recipes/${recipe.id}`}
                      className="rs-card-link"
                    >
                      {cardContent}
                    </Link>
                  )}

                  <button
                    type="button"
                    className="rs-heart"
                    aria-label="Save recipe"
                    title="Save recipe"
                    disabled={usingFallback}
                  >
                    ♡
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .rs-wrap {
          max-width: 1120px;
          margin: 0 auto;
          padding: 28px 24px 48px;
        }

        .rs-ing-row {
          margin-bottom: 22px;
        }

        .rs-ing-label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #3a2a20;
          margin-bottom: 12px;
        }

        .rs-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .rs-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #f2542d;
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
        }

        .rs-pill:hover {
          background: #d9431f;
        }

        .rs-pill:focus-visible,
        .rs-heart:focus-visible,
        .rs-card-link:focus-visible {
          outline: 2px solid #f2542d;
          outline-offset: 3px;
        }

        .rs-pill-x {
          font-size: 15px;
          line-height: 1;
          opacity: 0.9;
        }

        .rs-empty-ingredients {
          color: #9a8a7e;
          font-size: 13px;
        }

        .rs-message {
          text-align: center;
          color: #9a8a7e;
          padding: 24px;
          font-size: 14px;
        }

        .rs-fallback-message {
          color: #8a5a32;
          font-size: 12.5px;
          padding: 8px 12px 16px;
          margin: 0;
        }

        .rs-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(260px, 1fr)
          );
          gap: 16px;
        }

        .rs-card {
          position: relative;
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #eee;
          border-radius: 12px;
          padding: 12px;
          padding-right: 42px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: box-shadow 0.15s, transform 0.15s;
          min-width: 0;
        }

        .rs-card:hover {
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .rs-card-link {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
          flex: 1;
          min-width: 0;
          color: inherit;
        }

        .rs-card-static {
          cursor: default;
        }

        .rs-card-img {
          width: 72px;
          height: 72px;
          border-radius: 10px;
          object-fit: cover;
          flex-shrink: 0;
          background: #f5eee8;
        }

        .rs-card-body {
          min-width: 0;
        }

        .rs-card-title {
          font-size: 14.5px;
          font-weight: 700;
          color: #2b1c12;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rs-card-meta {
          font-size: 12px;
          color: #9a8a7e;
          margin-top: 4px;
          line-height: 1.5;
        }

        .rs-heart {
          position: absolute;
          top: 10px;
          right: 12px;
          background: none;
          border: none;
          font-size: 18px;
          color: #cfc6bf;
          line-height: 1;
        }

        .rs-heart:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .rs-heart:not(:disabled) {
          cursor: pointer;
        }

        .rs-heart:not(:disabled):hover {
          color: #f2542d;
        }

        @media (max-width: 640px) {
          .rs-wrap {
            padding: 24px 16px 40px;
          }

          .rs-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default RecipeSearchClean;
