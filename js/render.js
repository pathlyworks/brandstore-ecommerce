/*
 * render.js — builds the data-driven sections from the arrays in data.js.
 *
 * Featured products, their filter buttons and the testimonials are created
 * with document.createElement and filled with textContent, so nothing from
 * the data is ever parsed as HTML. The HTML only holds empty containers:
 *   #product-filter, #product-grid, #testimonial-grid
 */
(function () {
    'use strict';

    var dom = BrandStore.dom;
    var data = BrandStore.data;

    var IMAGE_WIDTHS = [400, 800];
    var IMAGE_DISPLAY = { width: 400, height: 300 };
    var IMAGE_SIZES = '(max-width: 767px) 90vw, (max-width: 1023px) 44vw, 380px';
    var ALL_FILTER = 'all';

    var priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

    /* ---------- Products ---------- */

    /**
     * Check that a data object has everything a product card needs, so one
     * malformed entry is skipped instead of breaking the whole grid.
     * @param {object} item
     * @returns {boolean}
     */
    function isProduct(item) {
        return Boolean(item) &&
            typeof item.name === 'string' && item.name !== '' &&
            typeof item.category === 'string' && item.category !== '' &&
            typeof item.description === 'string' &&
            typeof item.price === 'number' && isFinite(item.price) &&
            Boolean(item.image) && typeof item.image.slug === 'string';
    }

    /**
     * Path of a product image at one of the generated widths.
     * @param {string} slug
     * @param {number} width
     * @returns {string}
     */
    function imagePath(slug, width) {
        return 'assets/' + slug + '-' + width + '.svg';
    }

    /**
     * The "Best Seller" / "New Arrival" pill positioned over the image.
     * @param {{label: string, variant: string}} badge
     * @returns {HTMLElement}
     */
    function createBadge(badge) {
        return dom.el('span', {
            className: 'product-card__badge product-card__badge--' + badge.variant,
            text: badge.label
        });
    }

    /**
     * Responsive product image with intrinsic size (prevents layout shift).
     * @param {{slug: string, alt: string}} image
     * @returns {HTMLElement}
     */
    function createImage(image) {
        var srcset = IMAGE_WIDTHS.map(function (width) {
            return imagePath(image.slug, width) + ' ' + width + 'w';
        }).join(', ');

        return dom.el('img', {
            className: 'product-card__image',
            attrs: {
                src: imagePath(image.slug, IMAGE_WIDTHS[0]),
                srcset: srcset,
                sizes: IMAGE_SIZES,
                width: IMAGE_DISPLAY.width,
                height: IMAGE_DISPLAY.height,
                alt: image.alt || ''
            }
        });
    }

    /**
     * Top half of a card: optional badge plus the image.
     * @param {object} product
     * @returns {HTMLElement}
     */
    function createProductMedia(product) {
        var children = [];
        if (product.badge) {
            children.push(createBadge(product.badge));
        }
        children.push(createImage(product.image));
        return dom.el('div', { className: 'product-card__media' }, children);
    }

    /**
     * Bottom half of a card: tag, title, description, price and the link.
     * The link repeats the product name in visually hidden text so three
     * identical "Compare Specs" links are distinguishable by screen readers.
     * @param {object} product
     * @returns {HTMLElement}
     */
    function createProductBody(product) {
        var link = dom.el('a', { className: 'btn btn--secondary', attrs: { href: 'comparison.html' } }, [
            'Compare Specs',
            dom.el('span', { className: 'u-visually-hidden', text: ': ' + product.name })
        ]);

        return dom.el('div', { className: 'product-card__body' }, [
            dom.el('span', { className: 'product-card__tag', text: product.category }),
            dom.el('h3', { className: 'product-card__title', text: product.name }),
            dom.el('p', { className: 'product-card__text', text: product.description }),
            dom.el('p', { className: 'product-card__price', text: priceFormat.format(product.price) }),
            link
        ]);
    }

    /**
     * One complete product card.
     * @param {object} product
     * @returns {HTMLElement}
     */
    function createProductCard(product) {
        return dom.el('article', {
            className: 'product-card',
            dataset: { category: product.category }
        }, [createProductMedia(product), createProductBody(product)]);
    }

    /**
     * Fill #product-grid from data.products.
     */
    function renderProducts() {
        var grid = dom.qs('#product-grid');
        if (!grid) {
            return;
        }
        dom.clear(grid);
        data.products.filter(isProduct).forEach(function (product) {
            grid.appendChild(createProductCard(product));
        });
    }

    /* ---------- Filter buttons ---------- */

    /**
     * The distinct categories in the order they first appear in the data.
     * @param {object[]} products
     * @returns {string[]}
     */
    function uniqueCategories(products) {
        var categories = [];
        products.forEach(function (product) {
            if (categories.indexOf(product.category) === -1) {
                categories.push(product.category);
            }
        });
        return categories;
    }

    /**
     * One toggle button; its state is carried by aria-pressed.
     * @param {string} label  Visible text.
     * @param {string} value  Value stored in data-filter.
     * @param {boolean} pressed
     * @returns {HTMLElement}
     */
    function createFilterButton(label, value, pressed) {
        return dom.el('button', {
            className: 'filter__btn',
            text: label,
            dataset: { filter: value },
            attrs: { type: 'button', 'aria-pressed': pressed }
        });
    }

    /**
     * Fill #product-filter with "All Products" plus one button per category.
     */
    function renderFilterButtons() {
        var group = dom.qs('#product-filter');
        if (!group) {
            return;
        }
        dom.clear(group);
        group.appendChild(createFilterButton('All Products', ALL_FILTER, true));
        uniqueCategories(data.products.filter(isProduct)).forEach(function (category) {
            group.appendChild(createFilterButton(category, category, false));
        });
    }

    /* ---------- Testimonials ---------- */

    /**
     * One testimonial: quote in a blockquote, attribution with <cite>.
     * The typographic quotation marks are added here, not stored in the data.
     * @param {{quote: string, author: string, role: string}} item
     * @returns {HTMLElement}
     */
    function createTestimonialCard(item) {
        var quote = dom.el('blockquote', { className: 'testimonial__quote' }, [
            dom.el('p', { text: '“' + item.quote + '”' })
        ]);
        var author = dom.el('p', { className: 'testimonial__author' }, [
            '— ',
            dom.el('cite', { text: item.author }),
            ', ' + item.role
        ]);
        return dom.el('article', { className: 'testimonial' }, [quote, author]);
    }

    /**
     * Fill #testimonial-grid from data.testimonials.
     */
    function renderTestimonials() {
        var grid = dom.qs('#testimonial-grid');
        if (!grid) {
            return;
        }
        dom.clear(grid);
        data.testimonials.forEach(function (item) {
            grid.appendChild(createTestimonialCard(item));
        });
    }

    /**
     * Render everything this page has a container for.
     */
    function init() {
        renderFilterButtons();
        renderProducts();
        renderTestimonials();
    }

    BrandStore.register('render', init);
})();
