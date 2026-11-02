// Single source of truth for the Bunzai menu. Home, menu.html, product.html and order.html render from it.
(function () {
  const img = (slug) => `./assets/menu/${slug}.webp`;
  const SPICY = { label: 'Spicy', className: 'bg-red-600 text-white' };

  window.BUNZAI_HERO_IMAGE = img('single-smash');

  // Display order for category tabs and labels.
  window.BUNZAI_CATEGORIES = [
    { id: 'beef-burgers', label: 'Beef Burgers' },
    { id: 'chicken-burgers', label: 'Chicken Burgers' },
    { id: 'tenders', label: 'Tenders & More' },
    { id: 'fries', label: 'Fries' },
    { id: 'beverages', label: 'Beverages' }
  ];

  // Display-only extras; customers mention them in their order notes.
  window.BUNZAI_ADDONS = [
    {
      id: 'beef',
      title: 'Beef Burger Add-Ons',
      items: [['Extra Beef Patty', 8], ['Extra Beef Bacon', 4], ['Extra Cheese', 2], ['Extra Jalapeños', 1], ['Extra Caramelised Onion', 2]]
    },
    {
      id: 'sauce',
      title: 'Sauce Add-Ons',
      items: [['Garlic Parmesan', 2], ['Honey Sriracha', 2]]
    }
  ];

  // summary doubles as description: the copy is the client's own menu text.
  const item = (fields) => ({ badge: null, featured: false, ingredients: [], related: [], ...fields, description: fields.summary });

  window.BUNZAI_MENU = [
    // ---------- Beef Burgers ----------
    item({
      slug: 'single-smash',
      name: 'Single Smash',
      category: 'beef-burgers',
      price: 18,
      image: img('single-smash'),
      featured: true,
      summary: 'Smashed beef patty, cheese, jalapeños & our house sauce.',
      ingredients: ['Smashed beef patty', 'Cheese', 'Jalapeños', 'House sauce', 'Brioche bun'],
      addOns: 'beef',
      related: ['double-smash', 'fries', 'iced-milo']
    }),
    item({
      slug: 'double-smash',
      name: 'Double Smash',
      category: 'beef-burgers',
      price: 25,
      badge: { label: 'Bestseller', className: 'bg-brand-yellow text-black' },
      image: img('double-smash'),
      featured: true,
      summary: 'Two smashed beef patties, beef bacon, caramelised onion, cheese, jalapeños & our house sauce.',
      ingredients: ['2 × smashed beef patties', 'Beef bacon', 'Caramelised onion', 'Cheese', 'Jalapeños', 'House sauce', 'Brioche bun'],
      addOns: 'beef',
      related: ['remix', 'truffle-fries', 'pink-tropic']
    }),
    item({
      slug: 'remix',
      name: 'REMIX',
      category: 'beef-burgers',
      price: 32,
      badge: { label: 'Signature', className: 'bg-amber-400 text-black' },
      image: img('remix'),
      featured: true,
      summary: 'Two beef patties, a jalapeño popper, cheese, pickled onion & cabbage with our Signature Tahini Sauce.',
      ingredients: ['2 × beef patties', 'Jalapeño popper', 'Cheese', 'Pickled onion', 'Pickled cabbage', 'Signature Tahini Sauce', 'Brioche bun'],
      addOns: 'beef',
      related: ['double-smash', 'beef-fries', 'iced-milo']
    }),

    // ---------- Chicken Burgers ----------
    item({
      slug: 'chicken-sando',
      name: 'Chicken Sando',
      category: 'chicken-burgers',
      price: 15,
      image: img('chicken-sando'),
      summary: 'Crispy fried chicken, lettuce & garlic Parmesan sauce.',
      ingredients: ['Crispy fried chicken', 'Lettuce', 'Garlic Parmesan sauce', 'Brioche bun'],
      addOns: 'sauce',
      related: ['hot-chicken-sando', 'fries', 'pink-tropic']
    }),
    item({
      slug: 'hot-chicken-sando',
      name: 'Hot Chicken Sando',
      category: 'chicken-burgers',
      price: 18,
      badge: SPICY,
      image: img('hot-chicken-sando'),
      featured: true,
      summary: 'Nashville-spiced chicken, coleslaw & garlic Parmesan sauce.',
      ingredients: ['Nashville-spiced chicken', 'Coleslaw', 'Garlic Parmesan sauce', 'Brioche bun'],
      addOns: 'sauce',
      related: ['chicken-sando', 'chicken-fries', 'iced-milo']
    }),

    // ---------- Tenders & More ----------
    item({
      slug: 'chicken-tenders',
      name: 'Chicken Tenders',
      category: 'tenders',
      price: 15,
      image: img('chicken-tenders'),
      summary: 'Crispy chicken tenders served with our Maple Blaze dip.',
      ingredients: ['Crispy chicken tenders', 'Maple Blaze dip'],
      addOns: 'sauce',
      related: ['nashville-tenders', 'fries', 'pink-tropic']
    }),
    item({
      slug: 'nashville-tenders',
      name: 'Nashville Tenders',
      category: 'tenders',
      price: 18,
      badge: SPICY,
      image: img('nashville-tenders'),
      featured: true,
      summary: 'Chicken tenders coated in spiced Nashville butter, served with garlic Parmesan dip.',
      ingredients: ['Chicken tenders', 'Spiced Nashville butter', 'Garlic Parmesan dip'],
      addOns: 'sauce',
      related: ['chicken-slaw', 'chicken-tenders', 'iced-milo']
    }),
    item({
      slug: 'chicken-slaw',
      name: 'Chicken Slaw',
      category: 'tenders',
      price: 20,
      image: img('chicken-slaw'),
      summary: 'Chopped Nashville chicken tenders with slaw & pickled onion.',
      ingredients: ['Chopped Nashville chicken tenders', 'Slaw', 'Pickled onion'],
      addOns: 'sauce',
      related: ['nashville-tenders', 'hot-chicken-sando', 'pink-tropic']
    }),

    // ---------- Fries ----------
    item({
      slug: 'fries',
      name: 'Fries',
      category: 'fries',
      price: 9,
      image: img('fries'),
      summary: 'Lightly salted skin-on fries.',
      ingredients: ['Skin-on fries', 'Sea salt'],
      addOns: 'sauce',
      related: ['single-smash', 'chicken-sando', 'cold-drinks']
    }),
    item({
      slug: 'truffle-fries',
      name: 'Truffle Fries',
      category: 'fries',
      price: 17,
      image: img('truffle-fries'),
      featured: true,
      summary: 'Skin-on fries topped with truffle sauce & grated Parmesan.',
      ingredients: ['Skin-on fries', 'Truffle sauce', 'Grated Parmesan'],
      addOns: 'sauce',
      related: ['double-smash', 'remix', 'iced-milo']
    }),
    item({
      slug: 'beef-fries',
      name: 'Beef Fries',
      category: 'fries',
      price: 23,
      image: img('beef-fries'),
      summary: 'Curly fries with beef, beef bacon & garlic Parmesan sauce.',
      ingredients: ['Curly fries', 'Beef', 'Beef bacon', 'Garlic Parmesan sauce'],
      addOns: 'sauce',
      related: ['remix', 'single-smash', 'cold-drinks']
    }),
    item({
      slug: 'chicken-fries',
      name: 'Chicken Fries',
      category: 'fries',
      price: 20,
      image: img('chicken-fries'),
      summary: 'Curly fries with crispy chicken, jalapeños & our house sauces.',
      ingredients: ['Curly fries', 'Crispy chicken', 'Jalapeños', 'House sauces'],
      addOns: 'sauce',
      related: ['hot-chicken-sando', 'chicken-tenders', 'pink-tropic']
    }),

    // ---------- Beverages ----------
    item({
      slug: 'iced-milo',
      name: 'Iced Milo',
      category: 'beverages',
      price: 15,
      image: img('iced-milo'),
      summary: 'Ice-cold Iced Milo.',
      related: ['double-smash', 'nashville-tenders', 'truffle-fries']
    }),
    item({
      slug: 'pink-tropic',
      name: 'PINK TROPIC',
      category: 'beverages',
      price: 13,
      image: img('pink-tropic'),
      summary: 'Our ice-cold pink tropical fruit cooler.',
      related: ['hot-chicken-sando', 'chicken-tenders', 'fries']
    }),
    item({
      slug: 'cold-drinks',
      name: 'Cold Drinks',
      category: 'beverages',
      price: 3,
      illustration: 'cola',
      summary: 'Chilled soft drinks.',
      related: ['single-smash', 'fries', 'chicken-sando']
    })
  ];
})();
