/**
 * src/utils/format.js
 *
 * Turns API values into shopper-facing text (labels for categories, ratings and stock).
 */

const CATEGORY_LABELS = {
  electronics: 'Electronics',
  apparel: 'Apparel',
  'home-living': 'Home & Living',
  accessories: 'Accessories',
  // TechSphere API categories
  laptops: 'Laptops',
  phones: 'Phones',
  audio: 'Audio',
  'smart-home': 'Smart Home',
};

/**
 * "home-living" -> "Home & Living"; an unknown slug is made readable: "garden-tools" -> "Garden tools".
 * @param {string} slug
 * @returns {string}
 */
export function categoryLabel(slug) {
  if (CATEGORY_LABELS[slug]) return CATEGORY_LABELS[slug];
  const words = String(slug ?? '')
    .replace(/[-_]+/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Visible and spoken rating text.
 * @param {number} rating 0-5
 * @param {number} reviewCount
 * @returns {{ text: string, label: string }}
 */
export function ratingText(rating, reviewCount) {
  const count = new Intl.NumberFormat('en-US').format(reviewCount);
  return {
    text: `★ ${rating.toFixed(1)} (${count})`,
    label: `Rated ${rating.toFixed(1)} out of 5 from ${count} reviews`,
  };
}

/**
 * Stock message, or "" when there is plenty.
 * @param {number} stock units available
 * @returns {string}
 */
export function stockText(stock) {
  if (stock <= 0) return 'Out of stock';
  if (stock <= 5) return `Only ${stock} left`;
  return '';
}
