// Dev-only mock API for the recipe suggester system.
// The original backend (`server/` + `ai-services/`) was lost with the missing
// files, so this plugin serves the exact /api endpoints the frontend calls
// with in-memory data. It is only active on the Vite dev server (configureServer).

function placeholderImage(title, colorA, colorB) {
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
    `<stop offset="0" stop-color="${colorA}"/><stop offset="1" stop-color="${colorB}"/>` +
    '</linearGradient></defs>' +
    '<rect width="600" height="400" fill="url(#g)"/>' +
    `<text x="300" y="200" fill="#ffffff" font-size="30" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">${title}</text>` +
    '</svg>';
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

const recipes = [
  {
    id: 1,
    title: 'Spaghetti Bolognese',
    description: 'Classic Italian pasta with a rich beef and tomato sauce, simmered to perfection.',
    image: placeholderImage('Spaghetti Bolognese', '#f97316', '#b91c1c'),
    cookTime: 45, servings: 4, difficulty: 'medium', rating: 4.7, tags: [],
    ingredients: [
      { name: 'spaghetti', amount: 400, unit: 'g' },
      { name: 'ground beef', amount: 500, unit: 'g' },
      { name: 'tomato sauce', amount: 400, unit: 'ml' },
      { name: 'onion', amount: 1, unit: '' },
      { name: 'garlic', amount: 2, unit: 'cloves' },
      { name: 'parmesan cheese', amount: 50, unit: 'g' },
    ],
    instructions: [
      'Finely chop the onion and garlic, then sauté in olive oil until soft.',
      'Add the ground beef and cook until browned.',
      'Pour in the tomato sauce, season with salt and pepper, and simmer for 20 minutes.',
      'Cook the spaghetti according to the package directions until al dente.',
      'Drain the pasta and toss it with the sauce.',
      'Serve topped with grated parmesan cheese.',
    ],
    nutrition: { calories: 650, protein: 32, carbs: 72, fat: 24, fiber: 6, sugar: 12 },
  },
  {
    id: 2,
    title: 'Chicken Stir Fry',
    description: 'A quick and colourful stir fry with tender chicken and crisp vegetables.',
    image: placeholderImage('Chicken Stir Fry', '#f59e0b', '#dc2626'),
    cookTime: 25, servings: 4, difficulty: 'easy', rating: 4.5, tags: ['dairy-free'],
    ingredients: [
      { name: 'chicken breast', amount: 500, unit: 'g' },
      { name: 'bell peppers', amount: 2, unit: '' },
      { name: 'broccoli', amount: 1, unit: 'head' },
      { name: 'soy sauce', amount: 3, unit: 'tbsp' },
      { name: 'rice', amount: 300, unit: 'g' },
      { name: 'ginger', amount: 1, unit: 'inch' },
    ],
    instructions: [
      'Slice the chicken into thin strips and season with soy sauce and ginger.',
      'Cook the rice according to the package directions.',
      'Stir fry the chicken over high heat until golden.',
      'Add the vegetables and cook for a further 4 minutes.',
      'Serve immediately over steamed rice.',
    ],
    nutrition: { calories: 480, protein: 38, carbs: 45, fat: 14, fiber: 5, sugar: 8 },
  },
  {
    id: 3,
    title: 'Vegetable Curry',
    description: 'A comforting coconut curry packed with chickpeas and fresh spinach.',
    image: placeholderImage('Vegetable Curry', '#22c55e', '#0f766e'),
    cookTime: 40, servings: 4, difficulty: 'easy', rating: 4.6, tags: ['vegetarian', 'vegan', 'dairy-free'],
    ingredients: [
      { name: 'coconut milk', amount: 400, unit: 'ml' },
      { name: 'chickpeas', amount: 1, unit: 'can' },
      { name: 'spinach', amount: 200, unit: 'g' },
      { name: 'curry paste', amount: 2, unit: 'tbsp' },
      { name: 'onion', amount: 1, unit: '' },
      { name: 'rice', amount: 300, unit: 'g' },
    ],
    instructions: [
      'Sauté the diced onion until translucent.',
      'Stir in the curry paste and cook for one minute.',
      'Add chickpeas and coconut milk, then simmer for 20 minutes.',
      'Fold in the spinach and cook until wilted.',
      'Serve with fluffy steamed rice.',
    ],
    nutrition: { calories: 520, protein: 15, carbs: 68, fat: 20, fiber: 12, sugar: 10 },
  },
  {
    id: 4,
    title: 'Caesar Salad',
    description: 'Crisp romaine, crunchy croutons and parmesan with a classic Caesar dressing.',
    image: placeholderImage('Caesar Salad', '#84cc16', '#15803d'),
    cookTime: 15, servings: 2, difficulty: 'easy', rating: 4.3, tags: ['vegetarian'],
    ingredients: [
      { name: 'romaine lettuce', amount: 1, unit: 'head' },
      { name: 'parmesan cheese', amount: 40, unit: 'g' },
      { name: 'croutons', amount: 100, unit: 'g' },
      { name: 'caesar dressing', amount: 4, unit: 'tbsp' },
      { name: 'chicken breast', amount: 200, unit: 'g' },
    ],
    instructions: [
      'Grill the chicken breast and slice into strips.',
      'Chop the romaine lettuce into bite-sized pieces.',
      'Toss the lettuce with the dressing.',
      'Top with croutons, parmesan and the sliced chicken.',
    ],
    nutrition: { calories: 350, protein: 22, carbs: 24, fat: 18, fiber: 4, sugar: 5 },
  },
  {
    id: 5,
    title: 'Banana Pancakes',
    description: 'Fluffy pancakes naturally sweetened with ripe bananas — a weekend favourite.',
    image: placeholderImage('Banana Pancakes', '#facc15', '#f97316'),
    cookTime: 20, servings: 3, difficulty: 'easy', rating: 4.8, tags: ['vegetarian'],
    ingredients: [
      { name: 'flour', amount: 200, unit: 'g' },
      { name: 'bananas', amount: 2, unit: '' },
      { name: 'milk', amount: 250, unit: 'ml' },
      { name: 'eggs', amount: 2, unit: '' },
      { name: 'sugar', amount: 2, unit: 'tbsp' },
      { name: 'baking powder', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Mash the bananas in a large bowl.',
      'Whisk in the eggs, milk and sugar.',
      'Fold in the flour and baking powder until just combined.',
      'Cook ladlefuls on a buttered pan until golden on both sides.',
    ],
    nutrition: { calories: 410, protein: 12, carbs: 62, fat: 11, fiber: 4, sugar: 22 },
  },
  {
    id: 6,
    title: 'Beef Tacos',
    description: 'Seasoned beef in crispy shells with all your favourite fresh toppings.',
    image: placeholderImage('Beef Tacos', '#ef4444', '#b45309'),
    cookTime: 30, servings: 4, difficulty: 'medium', rating: 4.5, tags: [],
    ingredients: [
      { name: 'ground beef', amount: 500, unit: 'g' },
      { name: 'taco shells', amount: 8, unit: '' },
      { name: 'cheddar cheese', amount: 100, unit: 'g' },
      { name: 'lettuce', amount: 1, unit: 'head' },
      { name: 'tomato', amount: 2, unit: '' },
      { name: 'sour cream', amount: 100, unit: 'g' },
    ],
    instructions: [
      'Brown the ground beef in a hot skillet.',
      'Stir in taco seasoning and a splash of water.',
      'Warm the taco shells following the packet.',
      'Fill the shells with beef and top with cheese, lettuce, tomato and sour cream.',
    ],
    nutrition: { calories: 540, protein: 30, carbs: 40, fat: 26, fiber: 6, sugar: 7 },
  },
  {
    id: 7,
    title: 'Mushroom Risotto',
    description: 'Creamy arborio rice slow-cooked with earthy mushrooms and parmesan.',
    image: placeholderImage('Mushroom Risotto', '#a3a3a3', '#57534e'),
    cookTime: 35, servings: 4, difficulty: 'hard', rating: 4.4, tags: ['vegetarian'],
    ingredients: [
      { name: 'arborio rice', amount: 300, unit: 'g' },
      { name: 'mushrooms', amount: 400, unit: 'g' },
      { name: 'vegetable broth', amount: 1, unit: 'l' },
      { name: 'parmesan cheese', amount: 60, unit: 'g' },
      { name: 'onion', amount: 1, unit: '' },
      { name: 'white wine', amount: 100, unit: 'ml' },
    ],
    instructions: [
      'Sauté the mushrooms until golden, then set aside.',
      'Cook the onion gently, add the rice and toast for two minutes.',
      'Deglaze with the white wine.',
      'Add the hot broth a ladle at a time, stirring, until the rice is creamy.',
      'Stir in the parmesan and the reserved mushrooms before serving.',
    ],
    nutrition: { calories: 470, protein: 14, carbs: 66, fat: 15, fiber: 5, sugar: 4 },
  },
  {
    id: 8,
    title: 'Grilled Salmon',
    description: 'Juicy salmon fillets with lemon, dill and charred asparagus.',
    image: placeholderImage('Grilled Salmon', '#fb7185', '#e11d48'),
    cookTime: 25, servings: 2, difficulty: 'medium', rating: 4.7, tags: ['gluten-free', 'dairy-free'],
    ingredients: [
      { name: 'salmon fillets', amount: 2, unit: '' },
      { name: 'lemon', amount: 1, unit: '' },
      { name: 'olive oil', amount: 2, unit: 'tbsp' },
      { name: 'asparagus', amount: 200, unit: 'g' },
      { name: 'garlic', amount: 2, unit: 'cloves' },
      { name: 'dill', amount: 1, unit: 'tbsp' },
    ],
    instructions: [
      'Marinate the salmon with olive oil, lemon, garlic and dill.',
      'Grill the fillets for 4 minutes per side.',
      'Grill the asparagus alongside until tender.',
      'Serve with extra lemon wedges.',
    ],
    nutrition: { calories: 430, protein: 40, carbs: 12, fat: 24, fiber: 4, sugar: 4 },
  },
  {
    id: 9,
    title: 'Chocolate Chip Cookies',
    description: 'Soft, chewy cookies loaded with melting chocolate chips.',
    image: placeholderImage('Chocolate Chip Cookies', '#fbbf24', '#92400e'),
    cookTime: 25, servings: 24, difficulty: 'easy', rating: 4.9, tags: ['vegetarian'],
    ingredients: [
      { name: 'flour', amount: 300, unit: 'g' },
      { name: 'butter', amount: 150, unit: 'g' },
      { name: 'sugar', amount: 150, unit: 'g' },
      { name: 'eggs', amount: 2, unit: '' },
      { name: 'chocolate chips', amount: 200, unit: 'g' },
      { name: 'vanilla extract', amount: 1, unit: 'tsp' },
    ],
    instructions: [
      'Cream the butter and sugar until light and fluffy.',
      'Beat in the eggs and vanilla.',
      'Fold in the flour and chocolate chips.',
      'Bake at 180°C for 12 minutes until golden at the edges.',
    ],
    nutrition: { calories: 280, protein: 4, carbs: 36, fat: 14, fiber: 2, sugar: 22 },
  },
];

const SUBSTITUTIONS = {
  butter: ['olive oil', 'coconut oil'],
  milk: ['oat milk', 'almond milk'],
  egg: ['flax egg', 'applesauce'],
  eggs: ['flax eggs', 'applesauce'],
  chicken: ['tofu', 'tempeh'],
  'chicken breast': ['tofu', 'turkey breast'],
  'ground beef': ['lentils', 'plant-based mince'],
  beef: ['lentils', 'portobello mushrooms'],
  flour: ['almond flour', 'oat flour'],
  sugar: ['honey', 'maple syrup'],
  'parmesan cheese': ['nutritional yeast', 'pecorino'],
  parmesan: ['nutritional yeast', 'pecorino'],
  rice: ['quinoa', 'cauliflower rice'],
};

// ---- mutable in-memory state ----
let idCounter = 100;
const uid = (prefix) => `${prefix}${++idCounter}`;

const favorites = new Set([1, 9]);

let pantryItems = [
  { id: 'p1', name: 'Tomato', quantity: '4', category: 'vegetables', expiryDate: '' },
  { id: 'p2', name: 'Chicken Breast', quantity: '500 g', category: 'meat', expiryDate: '' },
  { id: 'p3', name: 'Rice', quantity: '1 kg', category: 'grains', expiryDate: '' },
  { id: 'p4', name: 'Milk', quantity: '1 l', category: 'dairy', expiryDate: '' },
  { id: 'p5', name: 'Onion', quantity: '3', category: 'vegetables', expiryDate: '' },
];

const mealPlanByWeek = {
  0: {
    Monday: [{ id: 'm1', recipeId: 1, name: 'Spaghetti Bolognese' }],
    Wednesday: [{ id: 'm2', recipeId: 3, name: 'Vegetable Curry' }],
  },
};

let shoppingList = [
  { id: 's1', name: 'Spaghetti', amount: 400, unit: 'g', completed: false },
  { id: 's2', name: 'Parmesan cheese', amount: 50, unit: 'g', completed: true },
];

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

async function handleApi(req, res) {
  const [rawPath] = req.url.split('?');
  const path = rawPath.replace(/^\/api/, '') || '/';
  const query = new URLSearchParams(req.url.includes('?') ? req.url.split('?')[1] : '');
  const method = req.method || 'GET';

  const send = (status, payload) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(payload));
  };

  // ---- recipes ----
  if (method === 'GET' && path === '/recipes/recommended') {
    return send(200, recipes.slice(0, 6));
  }
  if (method === 'GET' && path === '/recipes/trending') {
    return send(200, [...recipes].sort((a, b) => b.rating - a.rating).slice(0, 3));
  }
  if (method === 'GET' && path === '/recipes/favorites') {
    return send(200, recipes.filter((recipe) => favorites.has(recipe.id)));
  }
  if (method === 'GET' && path === '/recipes/search') {
    const q = (query.get('query') || '').toLowerCase();
    const dietary = (query.get('dietary') || '').split(',').filter(Boolean);
    const cookTime = parseInt(query.get('cookTime'), 10) || 0;
    const difficulty = query.get('difficulty') || '';
    const wanted = (query.get('ingredients') || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);

    const results = recipes.filter((recipe) => {
      const haystack = (
        recipe.title + ' ' + recipe.description + ' ' +
        recipe.ingredients.map((i) => i.name).join(' ')
      ).toLowerCase();
      if (q && !haystack.includes(q)) return false;
      if (dietary.length && !dietary.every((d) => (recipe.tags || []).includes(d))) return false;
      if (cookTime && recipe.cookTime > cookTime) return false;
      if (difficulty && recipe.difficulty !== difficulty) return false;
      if (wanted.length && !wanted.every((ing) => haystack.includes(ing))) return false;
      return true;
    });
    return send(200, results);
  }
  if (method === 'POST' && path === '/recipes/substitutions') {
    const body = await readBody(req);
    const names = Array.isArray(body.ingredients) ? body.ingredients : [];
    const substitutions = names.map((name) => ({
      original: name,
      substitutes: SUBSTITUTIONS[name.toLowerCase()] || ['a suitable alternative'],
    }));
    return send(200, { substitutions });
  }

  const favoriteMatch = path.match(/^\/recipes\/(\d+)\/favorite$/);
  if (favoriteMatch) {
    const id = Number(favoriteMatch[1]);
    if (method === 'POST') favorites.add(id);
    if (method === 'DELETE') favorites.delete(id);
    return send(200, { success: true, isFavorite: favorites.has(id) });
  }

  const detailMatch = path.match(/^\/recipes\/(\d+)$/);
  if (method === 'GET' && detailMatch) {
    const recipe = recipes.find((r) => r.id === Number(detailMatch[1]));
    if (!recipe) return send(404, { message: 'Recipe not found' });
    return send(200, { recipe, isFavorite: favorites.has(recipe.id) });
  }

  // ---- auth & profile ----
  if (method === 'POST' && (path === '/auth/login' || path === '/auth/register')) {
    const body = await readBody(req);
    if (!body.email || (path === '/auth/login' && !body.password)) {
      return send(400, { message: 'Email and password are required' });
    }
    const name = body.name || String(body.email).split('@')[0];
    return send(200, {
      user: { id: 'u1', name, email: body.email, dietaryRestrictions: [], preferences: [] },
    });
  }
  if (method === 'PUT' && path === '/users/profile') {
    const body = await readBody(req);
    return send(200, { user: { id: 'u1', ...body } });
  }

  // ---- pantry ----
  if (method === 'GET' && path === '/pantry') {
    return send(200, pantryItems);
  }
  if (method === 'POST' && path === '/pantry') {
    const body = await readBody(req);
    const item = {
      id: uid('p'),
      name: body.name || 'Item',
      quantity: body.quantity || '',
      category: body.category || 'other',
      expiryDate: body.expiryDate || '',
    };
    pantryItems = [...pantryItems, item];
    return send(200, item);
  }
  const pantryMatch = path.match(/^\/pantry\/([^/]+)$/);
  if (pantryMatch) {
    const id = pantryMatch[1];
    const index = pantryItems.findIndex((item) => item.id === id);
    if (index === -1) return send(404, { message: 'Pantry item not found' });
    if (method === 'PUT') {
      const body = await readBody(req);
      pantryItems = pantryItems.map((item) => (item.id === id ? { ...item, ...body } : item));
      return send(200, pantryItems[index]);
    }
    if (method === 'DELETE') {
      pantryItems = pantryItems.filter((item) => item.id !== id);
      return send(200, { success: true });
    }
  }

  // ---- meal plan ----
  if (method === 'GET' && path === '/mealplan') {
    const week = query.get('week') || '0';
    return send(200, { mealPlan: mealPlanByWeek[week] || {}, shoppingList });
  }
  if (method === 'POST' && path === '/mealplan') {
    const body = await readBody(req);
    const recipe = recipes.find((r) => r.id === Number(body.recipeId));
    if (!recipe) return send(404, { message: 'Recipe not found' });
    const week = body.week || '0';
    if (!mealPlanByWeek[week]) mealPlanByWeek[week] = {};
    if (!mealPlanByWeek[week][body.day]) mealPlanByWeek[week][body.day] = [];
    const meal = { id: uid('m'), recipeId: recipe.id, name: recipe.title };
    mealPlanByWeek[week][body.day].push(meal);
    return send(200, { success: true, meal });
  }
  const mealMatch = path.match(/^\/mealplan\/([^/]+)$/);
  if (method === 'DELETE' && mealMatch) {
    const mealId = mealMatch[1];
    Object.values(mealPlanByWeek).forEach((days) => {
      Object.keys(days).forEach((day) => {
        days[day] = days[day].filter((meal) => meal.id !== mealId);
      });
    });
    return send(200, { success: true });
  }

  // ---- shopping list ----
  if (method === 'POST' && path === '/shoppinglist/generate') {
    const body = await readBody(req);
    const plan = body.mealPlan || {};
    const totals = new Map();
    Object.values(plan).forEach((meals) => {
      (meals || []).forEach((meal) => {
        const recipe = recipes.find((r) => r.id === Number(meal.recipeId));
        if (!recipe) return;
        recipe.ingredients.forEach((ingredient) => {
          const key = `${ingredient.name}|${ingredient.unit}`;
          const existing = totals.get(key);
          if (existing) {
            existing.amount += ingredient.amount;
          } else {
            totals.set(key, { name: ingredient.name, amount: ingredient.amount, unit: ingredient.unit });
          }
        });
      });
    });
    shoppingList = [...totals.values()].map((item) => ({ ...item, id: uid('s'), completed: false }));
    return send(200, { shoppingList });
  }
  if (method === 'GET' && path === '/shoppinglist') {
    return send(200, shoppingList);
  }
  if (method === 'POST' && path === '/shoppinglist') {
    const body = await readBody(req);
    if (Array.isArray(body.items)) {
      body.items.forEach((item) => {
        shoppingList = [
          ...shoppingList,
          { id: uid('s'), name: item.name, amount: item.amount || null, unit: item.unit || '', completed: false },
        ];
      });
      return send(200, { success: true });
    }
    const item = { id: uid('s'), name: body.name || 'Item', amount: body.amount ?? null, unit: body.unit || '', completed: false };
    shoppingList = [...shoppingList, item];
    return send(200, item);
  }
  const shoppingMatch = path.match(/^\/shoppinglist\/([^/]+)$/);
  if (shoppingMatch) {
    const id = shoppingMatch[1];
    const index = shoppingList.findIndex((item) => item.id === id);
    if (index === -1) return send(404, { message: 'Shopping list item not found' });
    if (method === 'PATCH') {
      const body = await readBody(req);
      shoppingList = shoppingList.map((item) =>
        item.id === id ? { ...item, completed: body.completed } : item
      );
      return send(200, { success: true });
    }
    if (method === 'DELETE') {
      shoppingList = shoppingList.filter((item) => item.id !== id);
      return send(200, { success: true });
    }
  }

  return send(404, { message: `Mock API: no handler for ${method} ${path}` });
}

export function mockApiPlugin() {
  return {
    name: 'recipe-mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) return next();
        try {
          await handleApi(req, res);
        } catch (err) {
          console.error('[mock-api]', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify({ message: 'Mock API error' }));
        }
      });
    },
  };
}

