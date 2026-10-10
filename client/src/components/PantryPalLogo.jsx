const LOGO_URL = '/assets/pantrypal-logo.png';

function PantryPalLogo({ size = 96, compact = false }) {
  const box = compact
    ? { width: 80, height: 80, radius: 14, margin: '12px auto 14px' }
    : { width: size, height: size, radius: 18, margin: '0 auto 16px' };
  return (
    <img
      src={LOGO_URL}
      alt="PantryPal"
      draggable={false}
      style={{
        width: box.width,
        height: box.height,
        objectFit: 'contain',
        borderRadius: box.radius,
        margin: box.margin,
        background: '#fff8e8',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      }}
    />
  );
}

export default PantryPalLogo;


