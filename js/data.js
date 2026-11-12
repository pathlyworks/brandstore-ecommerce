/*
 * data.js — the content the data-driven sections are built from.
 *
 * Editing a product or a testimonial means editing an object here; no HTML
 * changes are needed. Each product's `image.slug` maps to the files
 * assets/<slug>-400.svg and assets/<slug>-800.svg (see render.js).
 */
(function () {
    'use strict';

    var products = [
        {
            id: 'headphones-pro',
            name: 'Wireless Headphones Pro',
            category: 'Electronics',
            description: 'Active noise cancellation with 40-hour battery life and studio-grade drivers.',
            price: 199.99,
            badge: { label: 'Best Seller', variant: 'bestseller' },
            image: { slug: 'headphones', alt: 'Wireless Headphones Pro with cobalt earcups' }
        },
        {
            id: 'smartwatch',
            name: 'Ergonomic Smartwatch',
            category: 'Electronics',
            description: '7-day battery, IP68 swimproof rating, and continuous wellness tracking.',
            price: 149.99,
            badge: { label: 'New Arrival', variant: 'new' },
            image: { slug: 'smartwatch', alt: 'Ergonomic Smartwatch with blue strap and crisp display' }
        },
        {
            id: 'leather-backpack',
            name: 'Minimalist Leather Backpack',
            category: 'Accessories',
            description: 'Water-resistant full-grain finish with padded 16-inch laptop compartment.',
            price: 89.99,
            badge: { label: 'Save 15%', variant: 'deal' },
            image: { slug: 'backpack', alt: 'Minimalist Leather Backpack in deep blue' }
        }
    ];

    var testimonials = [
        {
            id: 'sarah-m',
            quote: 'The build quality exceeded my expectations. Shipping was fast and the headphones last all week on a single charge.',
            author: 'Sarah M.',
            role: 'Verified Buyer'
        },
        {
            id: 'david-k',
            quote: 'Clean design, zero clutter, and reliable everyday performance. The side-by-side comparison made choosing effortless.',
            author: 'David K.',
            role: 'Verified Buyer'
        }
    ];

    window.BrandStore.data = { products: products, testimonials: testimonials };
})();
