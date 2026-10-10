function RatingStars({ value = 0, max = 5, onRate }) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
      {stars.map((star) => {
        const filled = star <= Math.round(value);
        return (
          <button
            key={star}
            type="button"
            disabled={!onRate}
            onClick={() => onRate && onRate(star)}
            aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
            className={`${filled ? 'text-yellow-500' : 'text-gray-300'} ${
              onRate ? 'hover:text-yellow-400 cursor-pointer' : 'cursor-default'
            } text-xl leading-none`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export default RatingStars;

