import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { useProfile } from '../stores/profileStore';
import { usePlanStore } from '../stores/planStore';
import '../styles/plan-pages.css';

// Map the profile's stored diet value to the planner's diet-focus keys.
const DIET_TO_FOCUS = { vegetarian: 'vegetarian', vegan: 'vegan', pescatarian: 'pescatarian', keto: 'low-carb', 'gluten-free': 'any', paleo: 'high-protein', halal: 'any', none: 'any', '': 'any' };

function MealPlanClean() {
  const { user } = useUser();
  const { profile } = useProfile(user);
  const {
    plan, DAYS, SLOTS, DIET_OPTIONS, dietFilter,
    generateWeek, setMeal, clearMeal, setDietFilter, dayTotals, weekTotals,
  } = usePlanStore();

  // Personalise: adopt the user's saved diet as the planner's initial focus (once).
  useEffect(() => {
    if (profile && profile.diet !== undefined) {
      const focus = DIET_TO_FOCUS[profile.diet] || 'any';
      if (focus !== dietFilter) setDietFilter(focus);
    }
    // eslint-disable-next-line
  }, [profile.diet]);

  const week = weekTotals();
  const todayIdx = 0; // highlight Monday as the "active" day for the demo

  return (
    <div className="pl-page">
      <header className="pl-hero">
        <div className="pl-hero-card">
          <h1>Plan Your Week the <span className="coral">Smart Way</span></h1>
          <p>Build a 7-day meal plan matched to your diet, watch your nutrition totals, and auto-generate a de-duplicated shopping list.</p>
          <div className="pl-hero-actions">
            <button type="button" className="pl-btn" onClick={generateWeek}>Regenerate Plan <span>✦</span></button>
            <Link to="/shopping-list" className="pl-btn-ghost">View Shopping List</Link>
          </div>
        </div>
      </header>

      <div className="pl-wrap">
        <section className="pl-card">
          <h2 className="pl-pref-title">Weekly Meal Planner</h2>
          <div className="pl-pref-rule" />
          <div className="pl-card-head" style={{ justifyContent: 'center', marginTop: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#3a2a20' }}>Diet focus:</span>
          </div>
          <div className="pl-chips">
            {DIET_OPTIONS.map((d) => (
              <button
                key={d.key}
                type="button"
                className={`pl-chip ${dietFilter === d.key ? 'on' : ''}`}
                onClick={() => setDietFilter(d.key)}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="pl-days">
            {DAYS.map((day, di) => {
              const t = dayTotals(day);
              return (
                <div key={day} className={`pl-day ${di === todayIdx ? 'pl-day-today' : ''}`}>
                  <div className="pl-day-head">{day}</div>
                  {SLOTS.map((slot) => {
                    const meal = plan[day] ? plan[day][slot] : null;
                    return (
                      <div className="pl-slot" key={slot}>
                        <div className="pl-slot-label">{slot}</div>
                        {meal ? (
                          <div className="pl-meal">
                            <img src={meal.img} alt={meal.title} />
                            <div className="pl-meal-info">
                              <div className="pl-meal-title">{meal.title}</div>
                              <div className="pl-meal-meta">{meal.kcal} kcal · {meal.protein}g protein</div>
                            </div>
                            <div className="pl-meal-actions">
                              <button type="button" className="pl-icon-btn" title="Swap" onClick={() => setMeal(day, slot)}>⇄</button>
                              <button type="button" className="pl-icon-btn" title="Remove" onClick={() => clearMeal(day, slot)}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" className="pl-empty" onClick={() => setMeal(day, slot)}>+ Add</button>
                        )}
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 'auto', padding: '8px 10px', borderTop: '1px solid #f0e6d8', fontSize: 11, fontWeight: 700, color: '#6b5b4d', textAlign: 'center' }}>
                    {t.meals} meals · {t.kcal} kcal
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="pl-stats">
          <div className="pl-stat"><div className="pl-stat-num">{week.meals}</div><div className="pl-stat-lbl">Meals Planned</div></div>
          <div className="pl-stat"><div className="pl-stat-num">{week.avgKcal}</div><div className="pl-stat-lbl">Avg kcal / day</div></div>
          <div className="pl-stat"><div className="pl-stat-num">{week.avgProtein}g</div><div className="pl-stat-lbl">Avg protein / day</div></div>
          <div className="pl-stat"><div className="pl-stat-num">{week.kcal}</div><div className="pl-stat-lbl">Total kcal / week</div></div>
        </section>
      </div>
    </div>
  );
}

export default MealPlanClean;
