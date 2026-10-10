SELECT
  SUM(title IS NULL OR title='') AS empty_titles,
  SUM(image_url IS NULL OR image_url='') AS empty_images,
  COUNT(*) AS total
FROM recipes;
