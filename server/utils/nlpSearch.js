// server/utils/nlpSearch.js
// Blueprint §37: rule-based NLP search (keyword parsing, tokenization,
// stop-word removal). Deterministic, dependency-free, fully unit-tested.
//
// parse("spicy vegan dinner under 500 calories")
//   -> { query:'spicy', dietary:['vegan','dinner'], maxCalories:500 }

const STOPWORDS = new Set(
  'a,an,the,and,or,with,for,of,to,in,on,at,from,by,please,show,find,get,give,me,i,want,need,looking,recipes,recipe,dish,dishes,meal,meals,food,something,anything,that,are,is,has,have,make,cook,cooking,using,use,used,my,what,can,could,would,should,like,just,some,any,all,easy,quickly,tasty,delicious,best,good,great,nice,healthy,today,tonight,now,dinner-time'.split(',')
);

const MEASURE_WORDS = new Set(
  'g,gram,grams,kg,kilo,kilos,ml,millilitre,milliliter,l,litre,liter,cup,cups,tbsp,tablespoon,tablespoons,tsp,teaspoon,teaspoons,oz,ounce,ounces,lb,lbs,pound,pounds,clove,cloves,slice,slices,piece,pieces,can,cans,pack,packet,bunch,head,inch'.split(',')
);

const DIET_TAGS = {
  vegan: 'vegan', vegetarian: 'vegetarian', veggie: 'vegetarian',
  keto: 'keto', ketogenic: 'keto', paleo: 'paleo',
  lowcarb: 'low-carb', glutenfree: 'gluten-free', dairyfree: 'dairy-free',
  nutfree: 'nut-free', halal: 'halal', pescatarian: 'pescatarian', pescetarian: 'pescatarian',
  highprotein: 'high-protein', mediterranean: 'mediterranean', lowsodium: 'low-sodium',
};

const CUISINES = {
  italian: 'italian', mexican: 'mexican', indian: 'indian', chinese: 'chinese',
  thai: 'thai', japanese: 'japanese', asian: 'asian', mediterranean: 'mediterranean',
  american: 'american', french: 'french', greek: 'greek', spanish: 'spanish',
  korean: 'korean', vietnamese: 'vietnamese', turkish: 'turkish', lebanese: 'lebanese',
  caribbean: 'caribbean', african: 'african',
};

const MEALS = {
  breakfast: 'breakfast', brunch: 'brunch', lunch: 'lunch', dinner: 'dinner',
  supper: 'dinner', snack: 'snack', snacks: 'snack', dessert: 'dessert', desserts: 'dessert',
  appetizer: 'appetizer', appetizers: 'appetizer', starter: 'appetizer', starters: 'appetizer',
};

const FREE_EXPANSIONS = {
  dairyfree: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'yoghurt', 'ghee'],
  glutenfree: ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'gluten'],
  nutfree: ['peanut', 'almond', 'walnut', 'cashew', 'hazelnut', 'pecan', 'pistachio', 'nut'],
};

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function parse(text) {
  const out = { query: '', dietary: [], ingredients: [], exclude: [], maxCalories: null, maxTime: null, meal: null, cuisine: null, raw: String(text || '') };
  const raw = String(text || '').toLowerCase();
  if (!raw.trim()) return out;
  let work = ` ${raw.replace(/[^a-z0-9\s\-<>,]/g, ' ')} `;
  const dietSet = new Set();

  let m = work.match(/(?:under|below|less\s+than|max|maximum|up\s+to)\s*(\d+)\s*(?:cal|cals|calorie|calories|kcal)\b/) || work.match(/<\s*(\d+)\s*(?:cal|kcal)?\b/);
  if (m) { out.maxCalories = Number(m[1]); work = work.replace(m[0], ' '); }
  else {
    m = work.match(/\b(\d+)\s*(?:cal|calories|kcal)\b/);
    if (m) { out.maxCalories = Number(m[1]); work = work.replace(m[0], ' '); }
  }

  m = work.match(/(?:under|below|less\s+than|within|max|maximum|about|around|in)\s*(\d+)\s*(hours?|hrs?|h|minutes?|mins?|m)\b/) || work.match(/\b(\d+)\s*(hours?|hrs?|minutes?|mins?)\b/);
  if (m) {
    const n = Number(m[1]);
    out.maxTime = /h/.test(m[2][0]) ? n * 60 : n;
    work = work.replace(m[0], ' ');
  } else if (/\b(quick|fast|speedy|express)\b/.test(work)) {
    out.maxTime = 20;
  }

  work = work.replace(/(?:without|no|minus|avoid(?:ing)?|skip(?:ping)?)\s+([a-z][a-z\s,&-]*?)(?=\s+(?:under|below|less|within|max|with|for|in|that|which)|$)/g, (full, list) => {
    list.split(/,|\band\b|\b&\b|\bwith\b/).map((s) => s.trim()).filter(Boolean).forEach((phrase) => {
      phrase.split(/\s+/).forEach((w) => {
        const n = norm(w);
        if (n && n.length > 1 && !STOPWORDS.has(n) && !MEASURE_WORDS.has(n) && !/^\d+$/.test(n)) out.exclude.push(w.toLowerCase());
      });
    });
    return ' ';
  });

  const FREE_TAGS = { dairyfree: 'dairy-free', glutenfree: 'gluten-free', nutfree: 'nut-free' };
  for (const key of Object.keys(FREE_EXPANSIONS)) {
    if (work.includes(key) || work.includes(key.replace('free', '-free'))) {
      dietSet.add(FREE_TAGS[key]);
      FREE_EXPANSIONS[key].forEach((w) => out.exclude.push(w));
    }
  }

  const tokens = work.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  const used = new Set();
  tokens.forEach((t, i) => {
    const n = norm(t);
    if (DIET_TAGS[n]) { dietSet.add(DIET_TAGS[n]); used.add(i); }
    else if (CUISINES[n]) { out.cuisine = CUISINES[n]; dietSet.add(CUISINES[n]); used.add(i); }
    else if (MEALS[n]) { out.meal = out.meal || MEALS[n]; dietSet.add(MEALS[n]); used.add(i); }
  });

  const leftovers = tokens.filter((t, i) => {
    if (used.has(i)) return false;
    const n = norm(t);
    if (!n || n.length < 2 || /^\d+$/.test(n)) return false;
    if (STOPWORDS.has(n) || MEASURE_WORDS.has(n)) return false;
    if (DIET_TAGS[n] || CUISINES[n] || MEALS[n]) return false;
    return true;
  });
  const seen = new Set();
  out.ingredients = leftovers.map((t) => t.toLowerCase()).filter((t) => (seen.has(t) ? false : (seen.add(t), true))).slice(0, 6);
  out.query = out.ingredients.slice(0, 4).join(' ');
  out.dietary = [...dietSet];
  out.exclude = [...new Set(out.exclude)].slice(0, 12);
  return out;
}

module.exports = { parse };
