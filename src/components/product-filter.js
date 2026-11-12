/*
 * src/components/product-filter.js — shows and hides product cards by category.
 *
 * State lives in the DOM: each button's aria-pressed and each card's
 * `hidden` attribute. One click listener on the button group handles every
 * button (event delegation), so buttons created by render.js need no wiring.
 * Each change is announced through #filter-status (aria-live="polite").
 */
import * as dom from '../utils/dom.js';
const ALL_FILTER = 'all';

/**
 * Update the visually announced result line.
 * @param {string} selected  Active filter value.
 * @param {number} shown  Cards now visible.
 * @param {number} total  Cards in the grid.
 */
function announce(selected, shown, total) {
  const status = dom.qs('#filter-status');
  if (!status) {
    return;
  }
  status.textContent =
    selected === ALL_FILTER
      ? 'Showing all ' + total + ' products.'
      : 'Showing ' + shown + ' of ' + total + ' products in ' + selected + '.';
}

/**
 * Apply one filter: press the matching button, hide the other cards.
 * @param {string} selected  'all' or a category name.
 */
function applyFilter(selected) {
  const cards = dom.qsa('.product-card');
  let shown = 0;

  dom.qsa('.filter__btn').forEach(function (button) {
    button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
  });

  cards.forEach(function (card) {
    const matches = selected === ALL_FILTER || card.dataset.category === selected;
    card.hidden = !matches;
    if (matches) {
      shown += 1;
    }
  });

  announce(selected, shown, cards.length);
}

/**
 * Click on the filter group: find which button was used.
 * @param {MouseEvent} event
 */
function onFilterClick(event) {
  const button = event.target.closest('.filter__btn');
  if (button) {
    applyFilter(button.dataset.filter);
  }
}

/**
 * Click on a category card link: pre-filter the featured grid when that
 * category has products, otherwise show everything.
 * @param {MouseEvent} event
 */
function onCategoryLinkClick(event) {
  const wanted = event.currentTarget.dataset.filterLink;
  const hasProducts = dom.qsa('.filter__btn').some(function (button) {
    return button.dataset.filter === wanted;
  });
  applyFilter(hasProducts ? wanted : ALL_FILTER);
}

/**
 * Attach the listeners (only on pages that have the filter).
 */
export function init() {
  const group = dom.qs('#product-filter');
  if (!group) {
    return;
  }
  group.addEventListener('click', onFilterClick);
  dom.qsa('[data-filter-link]').forEach(function (link) {
    link.addEventListener('click', onCategoryLinkClick);
  });
}
