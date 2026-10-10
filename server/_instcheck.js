const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({ host: 'localhost', port: 3306, user: 'root', password: 'Parth@2013kanha', database: 'recipe_db' });
  const [rows] = await c.query('SELECT recipe_id, title, instructions FROM recipes ORDER BY recipe_id LIMIT 5');
  rows.forEach(r => console.log(`#${r.recipe_id} [${r.title}] -> ${JSON.stringify(r.instructions)}\n`));
  const [maxlen] = await c.query('SELECT MAX(CHAR_LENGTH(instructions)) mx, AVG(CHAR_LENGTH(instructions)) avg, SUM(instructions REGEXP "[\\n]") multiline FROM recipes');
  console.log('length_stats', JSON.stringify(maxlen[0]));
  await c.end();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
