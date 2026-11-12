/**
 * Seed data for the mock server. Every request to a fresh server starts from this state.
 * Prices are integers in cents so that cart math never touches floating point.
 * The first three products are the Phase 1 catalogue (same ids, names and prices).
 */

/** Brand of every product (added in Phase 2 Task 2 for the brand filter). */
const BRAND_BY_ID = {
  'headphones-pro': 'Sonique',
  smartwatch: 'Pulse',
  'leather-backpack': 'Northline',
  'bluetooth-speaker': 'Sonique',
  'usb-c-hub': 'Pulse',
  'merino-tee': 'Northline',
  'rain-shell': 'Northline',
  'wool-socks': 'Trailhead',
  'ceramic-mug': 'Hearth',
  'desk-lamp': 'Hearth',
  'linen-throw': 'Hearth',
  'card-wallet': 'Northline',
};

export const BRANDS = ['Hearth', 'Northline', 'Pulse', 'Sonique', 'Trailhead'];

/** @param {string} id @param {string} name @param {string} category @param {number} price */
function product(id, name, category, price, extra = {}) {
  return {
    id,
    name,
    category,
    brand: BRAND_BY_ID[id],
    price,
    compareAtPrice: null,
    currency: 'USD',
    rating: 4.5,
    reviewCount: 0,
    stock: 25,
    image: { url: '/assets/product-placeholder.svg', alt: name },
    ...extra,
  };
}

export const CATEGORIES = ['electronics', 'apparel', 'home-living', 'accessories'];

export const PRODUCTS = [
  product('headphones-pro', 'Wireless Headphones Pro', 'electronics', 19999, {
    rating: 4.8,
    reviewCount: 1240,
    image: {
      url: '/assets/headphones-800.svg',
      alt: 'Wireless Headphones Pro with cobalt earcups',
    },
  }),
  product('smartwatch', 'Ergonomic Smartwatch', 'electronics', 14999, {
    rating: 4.6,
    reviewCount: 860,
    image: { url: '/assets/smartwatch-800.svg', alt: 'Ergonomic Smartwatch with blue strap' },
  }),
  product('leather-backpack', 'Minimalist Leather Backpack', 'accessories', 8999, {
    compareAtPrice: 10599,
    rating: 4.7,
    reviewCount: 412,
    image: { url: '/assets/backpack-800.svg', alt: 'Minimalist Leather Backpack in deep blue' },
  }),
  product('bluetooth-speaker', 'Portable Bluetooth Speaker', 'electronics', 5999, {
    rating: 4.3,
    reviewCount: 530,
  }),
  product('usb-c-hub', 'USB-C 7-in-1 Hub', 'electronics', 3999, {
    rating: 4.1,
    reviewCount: 220,
    stock: 0,
  }),
  product('merino-tee', 'Merino Crew T-Shirt', 'apparel', 4500, { rating: 4.4, reviewCount: 310 }),
  product('rain-shell', 'Packable Rain Shell', 'apparel', 11900, {
    compareAtPrice: 14900,
    rating: 4.2,
    reviewCount: 95,
  }),
  product('wool-socks', 'Trail Wool Socks (3 pack)', 'apparel', 2400, {
    rating: 4.9,
    reviewCount: 1500,
  }),
  product('ceramic-mug', 'Stoneware Mug Set', 'home-living', 3200, {
    rating: 4.5,
    reviewCount: 180,
  }),
  product('desk-lamp', 'Adjustable LED Desk Lamp', 'home-living', 6450, {
    rating: 4.0,
    reviewCount: 75,
    stock: 3,
  }),
  product('linen-throw', 'Linen Throw Blanket', 'home-living', 7800, {
    rating: 4.6,
    reviewCount: 60,
  }),
  product('card-wallet', 'Slim Card Wallet', 'accessories', 2999, {
    rating: 4.2,
    reviewCount: 340,
  }),
];

/** Specs taken from the Phase 1 comparison table for the three original products. */
const SPECS_BY_ID = {
  'headphones-pro': [
    ['Battery life', '40 hours'],
    ['Water resistance', 'IPX4 splashproof'],
    ['Weight', '250 g'],
    ['Warranty', '2 years limited'],
  ],
  smartwatch: [
    ['Battery life', '7 days'],
    ['Water resistance', 'IP68 swimproof'],
    ['Weight', '42 g'],
    ['Warranty', '1 year limited'],
  ],
  'leather-backpack': [
    ['Laptop sleeve', '16 inch, padded'],
    ['Water resistance', 'Water-resistant coating'],
    ['Weight', '890 g'],
    ['Warranty', 'Lifetime guarantee'],
  ],
};

/**
 * Fields only returned by GET /products/{id}: description, a 3-image gallery and a specs table.
 * @param {object} p product
 * @returns {{ description: string, images: { url: string, alt: string }[], specs: { label: string, value: string }[] }}
 */
export function detailsFor(p) {
  const specs = [
    ['Brand', p.brand],
    ['SKU', p.id.toUpperCase()],
    ...(SPECS_BY_ID[p.id] || [['Warranty', '2 years']]),
    ['Returns', '30 days, free'],
  ];
  return {
    description: `${p.name} by ${p.brand}. Free returns within 30 days.`,
    images: [
      { ...p.image },
      { url: '/assets/gallery-side.svg', alt: `${p.name}, side view` },
      { url: '/assets/gallery-box.svg', alt: `${p.name}, what's in the box` },
    ],
    specs: specs.map(([label, value]) => ({ label, value })),
  };
}

export const USERS = [
  { id: 'u-1', name: 'Demo Shopper', email: 'demo@brandstore.test', password: 'Passw0rd!' },
];

/** Orders belong to u-1. Only "processing" orders can be cancelled. */
export function seedOrders() {
  return [
    order('o-1001', '2026-10-02T09:15:00Z', 'delivered', [['headphones-pro', 1]]),
    order('o-1002', '2026-10-20T14:40:00Z', 'shipped', [
      ['merino-tee', 2],
      ['wool-socks', 1],
    ]),
    order('o-1003', '2026-11-10T08:05:00Z', 'processing', [
      ['smartwatch', 1],
      ['card-wallet', 1],
    ]),
  ];
}

/** @param {string} id @param {string} createdAt @param {string} status @param {[string, number][]} lines */
function order(id, createdAt, status, lines) {
  const items = lines.map(([productId, quantity]) => {
    const p = PRODUCTS.find((x) => x.id === productId);
    return { productId, name: p.name, quantity, unitPrice: p.price, lineTotal: p.price * quantity };
  });
  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const shipping = subtotal >= 10000 ? 0 : 799;
  return {
    id,
    userId: 'u-1',
    createdAt,
    status,
    items,
    subtotal,
    shipping,
    total: subtotal + shipping,
    currency: 'USD',
  };
}

export function seedAddresses() {
  return [
    {
      id: 'home',
      label: 'Home',
      fullName: 'Demo Shopper',
      line1: '12 Nile Street',
      line2: null,
      city: 'Cairo',
      postalCode: '11511',
      country: 'EG',
      phone: '+20 100 000 0000',
      isDefault: true,
    },
  ];
}
