import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/pantrypal.css';

const HERO = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1800&q=80';

// CLEAN REBUILD — Pantry / Recipes Generate page (matches PantryPal screenshot)
function Pantry() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [items, setItems] = useState(['Oil', 'Salt', 'Spices', 'Onion', 'Chicken', 'Garlic']);
  const [imagePreview, setImagePreview] = useState('');
  const [imageName, setImageName] = useState('');

  const add = (e) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    if (!items.map((x) => x.toLowerCase()).includes(v.toLowerCase())) setItems([...items, v]);
    setInput('');
  };
  const remove = (name) => setItems(items.filter((x) => x !== name));

  const onImage = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setImageName(f.name);
    try { setImagePreview(URL.createObjectURL(f)); } catch (err) { /* ignore */ }
  };

  return (
    <div className="pp-page">
      <header className="pp-hero">
        <img className="pp-hero-bg" src={HERO} alt="" />
        <div className="pp-hero-inner">
          <h1>Delicious Recipes, Matched to<br /><span className="coral">What&apos;s in Your Kitchen</span></h1>
          <p>Get smart suggestions based on your pantry. Our AI finds the best recipes with exact or smart substitutes, no more wasted ingredients.</p>
        </div>
      </header>

      <div className="pp-title-rule"><h2>What&apos;s in Your Pantry Today</h2></div>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 48 }}>
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, margin: '0 0 16px' }}>Add your ingredients below to generate the best matching recipes</h3>
          <form onSubmit={add} style={{ display: 'flex', gap: 10 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter Your Email"
              style={{ flex: 1, height: 42, borderRadius: 8, border: '1px solid #ff6b4a', padding: '0 14px', fontSize: 13, background: '#fff' }} />
            <button type="submit" className="pp-btn-coral" style={{ boxShadow: 'none' }}>Add</button>
          </form>
          <div style={{ marginTop: 14, background: '#5f2708', color: '#f5e6d3', borderRadius: 10, padding: '14px 16px', fontSize: 12.5, textAlign: 'center' }}>
            Tip: Add staple items like oil, salt, and spices for better matches.
          </div>
          <div style={{ fontSize: 64, marginTop: 26 }}>🍲🥗🍅</div>
        </div>
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 15, margin: '0 0 16px', textAlign: 'right' }}>Unless Add your ingredient Image Here</h3>
          <label style={{ display: 'block', border: '1.5px dashed #ff6b4a', borderRadius: 6, minHeight: 250, background: '#fffaf3', cursor: 'pointer', textAlign: 'center', padding: '40px 20px' }}>
            {imagePreview ? (
              <img src={imagePreview} alt="Ingredient preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: 44 }}>🖼️+</div>
            )}
            <span className="pp-btn-coral" style={{ marginTop: 16, fontSize: 12, padding: '8px 16px', boxShadow: 'none', display: 'inline-block' }}>
              {imageName ? imageName : 'Upload image from the device'}
            </span>
            <input type="file" accept="image/*" hidden onChange={onImage} />
          </label>
        </div>
      </section>

      <div className="pp-title-rule"><h2>What&apos;s in Your Pantry Today</h2></div>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ border: '1px solid #7c2d0e', outline: '1px solid #7c2d0e', outlineOffset: 5, borderRadius: 2, minHeight: 220, padding: '26px 28px', background: '#fffaf3' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {items.length === 0 && <span style={{ fontSize: 13, color: '#8a7a68' }}>No ingredients yet — add some above.</span>}
            {items.map((it) => (
              <span key={it} style={{ background: '#7c2d0e', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                {it} <button onClick={() => remove(it)} style={{ background: 'none', border: 'none', color: '#ff4d4d', fontWeight: 800, cursor: 'pointer' }} aria-label={'Remove ' + it}>✕</button>
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 26, paddingBottom: 10 }}>
          <button className="pp-btn-coral" onClick={() => navigate('/recipes')}>Let&apos;s Generate Recipes <span>✦</span></button>
        </div>
      </section>
      <style>{`@media (max-width:900px){.pp-page section{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

export default Pantry;


  return (
    <div className="pp-page">
      <header className="pp-hero">
        <img className="pp-hero-bg" src={HERO} alt="" />
        <div className="pp-hero-inner">
          <h1>Delicious Recipes, Matched to<br /><span className="coral">What&apos;s in Your Kitchen</span></h1>
          <p>Get smart suggestions based on your pantry. Our AI finds the best recipes with exact or smart substitutes, no more wasted ingredients.</p>
        </div>
      </header>

      <div className="pp-title-rule"><h2>What&apos;s in Your Pantry Today</h2></div>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 48 }}>
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, margin: '0 0 16px' }}>Add your ingredients below to generate the best matching recipes</h3>
          <form onSubmit={add} style={{ display: 'flex', gap: 10 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter Your Email"
              style={{ flex: 1, height: 42, borderRadius: 8, border: '1px solid #ff6b4a', padding: '0 14px', fontSize: 13, background: '#fff' }} />
            <button type="submit" className="pp-btn-coral" style={{ boxShadow: 'none' }}>Add</button>
          </form>
          <div style={{ marginTop: 14, background: '#5f2708', color: '#f5e6d3', borderRadius: 10, padding: '14px 16px', fontSize: 12.5, textAlign: 'center' }}>
            Tip: Add staple items like oil, salt, and spices for better matches.
          </div>
          <div style={{ fontSize: 64, marginTop: 26 }}>🍲🥗🍅</div>
        </div>
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 15, margin: '0 0 16px', textAlign: 'right' }}>Unless Add your ingredient Image Here</h3>
          <label style={{ display: 'block', border: '1.5px dashed #ff6b4a', borderRadius: 6, minHeight: 250, background: '#fffaf3', cursor: 'pointer', textAlign: 'center', padding: '40px 20px' }}>
            {imagePreview ? (
              <img src={imagePreview} alt="Ingredient preview" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover' }} />
            ) : (
              <div style={{ fontSize: 44 }}>🖼️+</div>
            )}
            <span className="pp-btn-coral" style={{ marginTop: 16, fontSize: 12, padding: '8px 16px', boxShadow: 'none', display: 'inline-block' }}>
              {imageName ? imageName : 'Upload image from the device'}
            </span>
            <input type="file" accept="image/*" hidden onChange={onImage} />
          </label>
        </div>
      </section>

      <div className="pp-title-rule"><h2>What&apos;s in Your Pantry Today</h2></div>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ border: '1px solid #7c2d0e', outline: '1px solid #7c2d0e', outlineOffset: 5, borderRadius: 2, minHeight: 220, padding: '26px 28px', background: '#fffaf3' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {items.length === 0 && <span style={{ fontSize: 13, color: '#8a7a68' }}>No ingredients yet — add some above.</span>}
            {items.map((it) => (
              <span key={it} style={{ background: '#7c2d0e', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                {it} <button onClick={() => remove(it)} style={{ background: 'none', border: 'none', color: '#ff4d4d', fontWeight: 800, cursor: 'pointer' }} aria-label={`Remove ${it}`}>✕</button>
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 26, paddingBottom: 10 }}>
          <button className="pp-btn-coral" onClick={() => navigate('/recipes')}>Let&apos;s Generate Recipes <span>✦</span></button>
        </div>
      </section>
      <style>{`@media (max-width:900px){.pp-page section{grid-template-columns:1fr !important}}`}</style>
    </div>
  );
}

/* DISABLE-LEGACY

export default Pantry;




function Pantry() {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [items, setItems] = useState(['Oil', 'Salt', 'Spices', 'Onion', 'Chicken', 'Garlic']);

  const add = (e) => {
/* DISABLED-LEGACY-CHUNK-START

    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    if (!items.map((x) => x.toLowerCase()).includes(v.toLowerCase())) setItems([...items, v]);
    setInput('');
  };
  const remove = (name) => setItems(items.filter((x) => x !== name));

  return (
    <div className="pp-page">
      <header className="pp-hero">
        <img className="pp-hero-bg" src={HERO} alt="" />
        <div className="pp-hero-inner">
 XX
/* TRUNCATE-HERE-DISABLED-REST

          <h1>Delicious Recipes, Matched to<br /><span className="coral">What&apos;s in Your Kitchen</span></h1>
          <p>Get smart suggestions based on your pantry.</p>
        </div>
      </header>

      <div className="pp-title-rule"><h2>What&apos;s in Your Pantry Today</h2></div>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px', display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 48 }}>
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 16, margin: '0 0 16px' }}>Add your ingredients below to generate the best matching recipes</h3>
          <form onSubmit={add} style={{ display: 'flex', gap: 10 }}>
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter Your Email"
              style={{ flex: 1, height: 42, borderRadius: 8, border: '1px solid #ff6b4a', padding: '0 14px', fontSize: 13, background: '#fff' }} />
            <button type="submit" className="pp-btn-coral" style={{ boxShadow: 'none' }}>Add</button>
          </form>
          <div style={{ marginTop: 14, background: '#5f2708', color: '#f5e6d3', borderRadius: 10, padding: '14px 16px', fontSize: 12.5, textAlign: 'center' }}>
            Tip: Add staple items like oil, salt, and spices for better matches.
          </div>
          <div style={{ fontSize: 64, marginTop: 26 }}>🍲🥗🍅</div>
        </div>
        <div>
          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: 15, margin: '0 0 16px', textAlign: 'right' }}>Unless Add your ingredient Image Here</h3>
          <label style={{ display: 'block', border: '1.5px dashed #ff6b4a', borderRadius: 6, minHeight: 250, background: '#fffaf3', cursor: 'pointer', textAlign: 'center', padding: '56px 20px' }}>
            <div style={{ fontSize: 44 }}>🖼️+</div>
            <span className="pp-btn-coral" style={{ marginTop: 16, fontSize: 12, padding: '8px 16px', boxShadow: 'none', display: 'inline-block' }}>Upload image from the device</span>
            <input type="file" accept="image/*" hidden onChange={() => {}} />
          </label>
        </div>
      </section>

      <div className="pp-title-rule"><h2>What&apos;s in Your Pantry Today</h2></div>
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ border: '1px solid #7c2d0e', outline: '1px solid #7c2d0e', outlineOffset: 5, borderRadius: 2, minHeight: 220, padding: '26px 28px', background: '#fffaf3' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18 }}>
            {items.map((it) => (
              <span key={it} style={{ background: '#7c2d0e', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                {it} <button onClick={() => remove(it)} style={{ background: 'none', border: 'none', color: '#ff4d4d', fontWeight: 800, cursor: 'pointer' }}>✕</button>
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 26 }}>
/* LEGACY-LEFTOVER commented out (was duplicating old pantry logic after export; new UI above is canonical).

          <button className="pp-btn-coral" onClick={() => navigate('/recipes')}>Let&apos;s Generate Recipes <span>✦</span></button>
        </div>
      </section>
    </div>
  );
XX-MARKER-FIX
            {items.map((it) => (
              <span key={it} style={{ background: '#7c2d0e', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, display: 'inline-flex', gap: 10, alignItems: 'center' }}>
                {it} <button onClick={() => remove(it)} style={{ background: 'none', border: 'none', color: '#ff4d4d', fontWeight: 800, cursor: 'pointer' }}>✕</button>
              </span>
            ))}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 26 }}>
          <button className="pp-btn-coral" onClick={() => navigate('/recipes')}>Let&apos;s Generate Recipes <span>✦</span></button>
        </div>
      </section>
    </div>
  );
}

*/}
export default Pantry;
{/* DISABLED-LEGACY-BLOCK-START

{/* BROKEN-LEGACY-DISABLED


}

*/}
export default Pantry;

  return (
    <div className="text-center mt-10">
      <h1 className="text-4xl font-bold text-orange-600">Pantry Page</h1>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">My Pantry</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Item</h2>
          <form onSubmit={handleAddItem} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name*</label>
              <input
*/}
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="text"
                value={newItem.quantity}
*/}
                onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="e.g., 2 cups"
              />
            </div>
*/}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {categories.filter(c => c !== 'all').map(category => (
*/}
                  <option key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
// BROKEN-LINE-DISABLED
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition"
              >
 XX
                Add Item
              </button>
            </div>
          </form>
          
          <IngredientUpload onUploadSuccess={stableFetchPantryItems} />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <h2 className="text-xl font-semibold mb-4 md:mb-0">My Ingredients</h2>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search ingredients..."
END-DISABLED */
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm || filterCategory !== 'all' 
                ? 'No matching items found' 
                : 'Your pantry is empty. Add some ingredients to get started!'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map(item => (
                <PantryItem 
                  key={item.id} 
                  item={item} 
                  onUpdate={updatePantryItem} 
                  onDelete={deletePantryItem} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
/* DISABLED-DUPLICATE-START

    </div>
  );
/* DISABLED-LEGACY-BELOW

}
END-LEGACY */


export default Pantry;
DISABLED-END */