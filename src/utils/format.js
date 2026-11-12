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
};

/**
 * "home-living" -> "Home & Living"; unknown slugs are shown as they are.
 * @param {string} slug
 * @returns {string}
 */
export function categoryLabel(slug) {
  return CATEGORY_LABELS[slug] || slug;
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
