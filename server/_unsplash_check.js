const urls = {
  bowl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  wrap: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f',
  stew: 'https://images.unsplash.com/photo-1547592166-23ac45744acd',
  curry: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd',
  salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
  soup: 'https://images.unsplash.com/photo-1547592180-85f173990554',
  pasta: 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9',
  pizza: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38',
  taco: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47',
  sandwich: 'https://images.unsplash.com/photo-1509722747041-616f39b57569',
  rice: 'https://images.unsplash.com/photo-1516684732162-798a0062be99',
  noodles: 'https://images.unsplash.com/photo-1585032226651-759b368d7246',
  bake: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3',
  skillet: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6',
  salmon: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
  chicken: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b',
};

(async () => {
  for (const [k, u] of Object.entries(urls)) {
    try {
      const r = await fetch(u + '?w=200', { method: 'HEAD' });
      console.log(k, '->', r.status, r.headers.get('content-type'));
    } catch (e) {
      console.log(k, '-> ERR', e.message);
    }
  }
})();
