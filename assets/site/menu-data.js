// Single source of truth for the Bunzai menu. Home, menu.html, product.html and order.html render from it.
(function () {
  const IMG = {
    classic: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfjwRd5cvykPBguRjQtFbMB8XvKdoe21CawzKmjqGAZBt6izFwMHC_JVWxAFL8WtOmqkweQo5ByxxdCyUDumTz1amv4gjC_qqqr3TRJsmVWtoAcOffu-c3Upe8VmmYwbK2L4zMSq2SYttJtBMCETecB76OrgHC-XTxjWPsAteLB4pPi-QDiH0-d_78PFaRcZOEuno6tSrP4Fa9OmhxHHAG-ou0r-TpS3fWI78ubF2yIfFkLCN9rp9TrQ',
    firecracker: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYI7wzXUVdjGM88ko3uxiKFrjM0YzmY58eK2NK3Ns4BMQNalr3zP02Jhjn8XSdnR1sHKCudC7wEDvTbk4qDOHONrGBUO6AGO_243EdXzxV7ISzVDnP2Tsdyn2l-aFgZzPsgEegWgp-jxQtFrZbLP4f1bMnHbweu3K989vwQWEtU2bEcZiSxNSJkD6cYIapMlA-GvZ6N28ackvo24mFhPKrXAqqu234rbsDT6EjG-bRdYuTLJpwryfIvw',
    truffle: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2NmroVKD4LD4QKkALVY86U-QIL2kDharmRm4voJJ0foeqpNzuZd4deg_VYvhJG5UiOYMU3flrvEuuV10jvTw4wCgEfovlrmw9xF5jKYaObvSyIbtkOuYk52Qms7RtbHFTGY7yUSTU-W7ae6rUKOTZcZLg0HBFR8-xD-Iv5YOyT1MhVCwa_STqDzW_qIE6E6qY9WD58RBAZUHhFBJ32azPbCNijupxlaclgVpVqbcTt_uLYnk-NzupAA',
    fries: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBnDYiabi_secgsBQr-4o5mcoGf8hU4rpXFuEHfi7DIULG3glk6csOjduItf-8aXBnyPQRnJ7l-_zB1YLlTqiwKNa_4AYz475VhFQNhZJMGZ1ASoayhlFNNSN8rZ_h8z9TRwZdeZ165HLdncUwaC-cTVqD3NeKNyyjn0i7JA0Lf7fa7884MCDHk0OsidyYK4zngmW3W9TkRtS4HdnoWMAh6ZehbjHKj-x6SoiZcy4k960B0MIa36VPIvA'
  };

  window.BUNZAI_HERO_IMAGE = IMG.classic;

  window.BUNZAI_MENU = [
    {
      slug: 'bunzai-classic',
      name: 'Bunzai Classic',
      category: 'burgers',
      price: 32,
      badge: { label: 'Bestseller', className: 'bg-brand-yellow text-black' },
      image: IMG.classic,
      summary: 'Double smashed Angus beef, triple aged cheddar, dill pickles & house glaze on buttery brioche.',
      description: 'The burger that started it all. Two 100% prime Angus patties smashed hard on 600°F cast iron for lacy, caramelized edges, layered with triple aged cheddar that melts into every crevice. Crunchy dill pickles cut through the richness, and our signature house glaze ties it together on a toasted, butter-sealed brioche.',
      ingredients: ['2 × smashed Angus patties', 'Triple aged cheddar', 'Dill pickles', 'Signature house glaze', 'Toasted brioche bun'],
      allergens: ['Gluten', 'Dairy', 'Egg', 'Mustard'],
      related: ['firecracker-smash', 'loaded-fries', 'draft-cola']
    },
    {
      slug: 'firecracker-smash',
      name: 'Firecracker Smash',
      category: 'burgers',
      price: 36,
      badge: { label: 'Spicy', className: 'bg-red-600 text-white' },
      image: IMG.firecracker,
      summary: 'Smoky Angus beef, pickled jalapeño crunch, molten cheddar & hot fire drizzle sauce on brioche.',
      description: 'For the heat seekers. Smoky smashed Angus beef stacked with pickled jalapeños for bright, tangy crunch, molten cheddar to calm things down, and our fire drizzle — a slow-building chilli sauce with a smoky finish. Served on toasted brioche that holds up to every drop.',
      ingredients: ['2 × smashed Angus patties', 'Pickled jalapeños', 'Molten cheddar', 'Hot fire drizzle', 'Toasted brioche bun'],
      allergens: ['Gluten', 'Dairy', 'Egg'],
      related: ['bunzai-classic', 'onion-rings', 'draft-cola']
    },
    {
      slug: 'bunzai-truffle',
      name: 'Bunzai Truffle',
      category: 'burgers',
      price: 42,
      badge: { label: 'Signature', className: 'bg-amber-400 text-black' },
      image: IMG.truffle,
      summary: 'Double Angus, wild sautéed mushrooms, caramelized onions, rich black truffle aioli & shaved parmesan.',
      description: 'Our most indulgent build. Double Angus smashed to a deep crust, topped with wild mushrooms sautéed in garlic butter, slow-caramelized onions, a generous spread of black truffle aioli and shaved aged parmesan. Earthy, rich and unapologetically bold.',
      ingredients: ['2 × smashed Angus patties', 'Wild sautéed mushrooms', 'Caramelized onions', 'Black truffle aioli', 'Shaved parmesan', 'Toasted brioche bun'],
      allergens: ['Gluten', 'Dairy', 'Egg'],
      related: ['bunzai-classic', 'loaded-fries', 'onion-rings']
    },
    {
      slug: 'loaded-fries',
      name: 'Loaded Fries',
      category: 'sides',
      price: 18,
      badge: { label: 'Loaded', className: 'bg-brand-yellow text-black' },
      image: IMG.fries,
      summary: 'Crisp seasoned fries smothered in warm molten cheddar sauce, signature glaze & smoky bacon crumbles.',
      description: 'Double-fried for a shatter-crisp shell and fluffy middle, tossed in our house seasoning, then buried under warm cheddar sauce, a zig-zag of signature glaze and smoky beef bacon crumbles. Made for sharing — or not.',
      ingredients: ['Double-fried seasoned fries', 'Molten cheddar sauce', 'Signature glaze', 'Smoky beef bacon crumbles', 'Spring onion'],
      allergens: ['Dairy', 'Mustard'],
      related: ['bunzai-classic', 'onion-rings', 'draft-cola']
    },
    {
      slug: 'onion-rings',
      name: 'Bunzai Onion Rings',
      category: 'sides',
      price: 16,
      badge: null,
      illustration: 'rings',
      summary: 'Extra-thick yellow sweet onions, beer-battered, flash-fried golden and served with smoky dipping sauce.',
      description: 'Thick-cut sweet yellow onions dipped in a light, crackly batter and flash-fried until deep golden. Sweet inside, crunchy outside, and served with our smoky dipping sauce on the side.',
      ingredients: ['Thick-cut sweet onions', 'Crisp golden batter', 'Smoky dipping sauce'],
      allergens: ['Gluten', 'Egg'],
      related: ['firecracker-smash', 'loaded-fries', 'draft-cola']
    },
    {
      slug: 'draft-cola',
      name: 'Bunzai Draft Cola',
      category: 'drinks',
      price: 10,
      badge: null,
      illustration: 'cola',
      summary: 'Cold, fizzy house draft craft cola infused with natural vanilla bean. Custom-built to balance rich burgers.',
      description: 'Our house craft cola, poured ice-cold from the tap. Natural vanilla bean and a hint of citrus peel give it a smooth, rounded finish that cuts through rich, cheesy burgers.',
      ingredients: ['Sparkling water', 'Cane sugar', 'Natural vanilla bean', 'Citrus peel', 'Cola botanicals'],
      allergens: [],
      related: ['bunzai-classic', 'bunzai-truffle', 'loaded-fries']
    }
  ];
})();
