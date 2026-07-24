insert into public.menu_categories
  (slug, name, description, parent_slug, image_url, menu_side, sort_order, is_active)
values
  ('food', 'Food', 'Burgers, pizza, sandwiches, and shawarma', null, '/uploads/house/menu-board-reference.jpg', 'food', 1, true),
  ('burgers', 'Burgers', 'House-grilled signatures', 'food', '/uploads/house/menu-board-reference.jpg', 'food', 2, true),
  ('pizza', 'Pizza', 'Hot house pizza', 'food', '/uploads/house/menu-board-reference.jpg', 'food', 3, true),
  ('sandwiches', 'Sandwiches', 'Toasted house sandwiches', 'food', '/uploads/house/menu-board-reference.jpg', 'food', 4, true),
  ('shawarma', 'Shawarma', 'Wrapped house favorites', 'food', '/uploads/house/menu-board-reference.jpg', 'food', 5, true),
  ('drinks', 'Drinks', 'Refreshments and cocktails', null, '/uploads/house/menu-board-reference.jpg', 'drinks', 6, true),
  ('shakes', 'Shakes', 'Creamy milkshakes', 'drinks', '/uploads/house/menu-board-reference.jpg', 'drinks', 7, true),
  ('mojito', 'Mojito', 'Fresh mojito mixes', 'drinks', '/uploads/house/menu-board-reference.jpg', 'drinks', 8, true),
  ('cocktails', 'Alcoholic Cocktails', 'House cocktail selection', 'drinks', '/uploads/house/menu-board-reference.jpg', 'drinks', 9, true)
on conflict (slug) do nothing;

update public.menu_categories
set parent_slug = 'food'
where slug in ('burgers', 'pizza', 'sandwiches', 'shawarma')
  and parent_slug is null;

update public.menu_categories
set parent_slug = 'drinks'
where slug in ('shakes', 'mojito', 'cocktails')
  and parent_slug is null;

insert into public.menu_items
  (slug, category_id, name, description, price, image_url, sort_order, is_available)
values
  (
    'classic-burger',
    (select id from public.menu_categories where slug = 'burgers'),
    'Special Burger',
    'House burger with beef, sauce, fresh garnish, and toasted bun.',
    900,
    '/uploads/house/menu-board-reference.jpg',
    1,
    true
  ),
  (
    'smoky-double',
    (select id from public.menu_categories where slug = 'burgers'),
    'Double Beef Burger',
    'Double beef, house sauce, lettuce, cheese, and sesame bun.',
    850,
    '/uploads/house/menu-board-reference.jpg',
    2,
    true
  ),
  (
    'golden-margherita',
    (select id from public.menu_categories where slug = 'pizza'),
    'Special Pizza',
    'Cheese pull, house tomato base, and premium toppings.',
    900,
    '/uploads/house/menu-board-reference.jpg',
    3,
    true
  ),
  (
    'pepperoni-fire',
    (select id from public.menu_categories where slug = 'pizza'),
    'Meat Lover Pizza',
    'Meat toppings, mozzarella, oregano, and rich house sauce.',
    800,
    '/uploads/house/menu-board-reference.jpg',
    4,
    true
  ),
  (
    'citrus-gold',
    (select id from public.menu_categories where slug = 'shakes'),
    'Strawberry Milkshake',
    'Cold milkshake with strawberry flavor and creamy finish.',
    350,
    '/uploads/house/menu-board-reference.jpg',
    5,
    true
  ),
  (
    'ember-martini',
    (select id from public.menu_categories where slug = 'mojito'),
    'Orange Mojito',
    'Fresh orange mojito with mint and citrus.',
    400,
    '/uploads/house/menu-board-reference.jpg',
    6,
    true
  ),
  (
    'chicken-sandwich',
    (select id from public.menu_categories where slug = 'sandwiches'),
    'Chicken Sandwich',
    'Toasted sandwich with chicken, sauce, and crisp garnish.',
    700,
    '/uploads/house/menu-board-reference.jpg',
    7,
    true
  ),
  (
    'special-shawarma',
    (select id from public.menu_categories where slug = 'shawarma'),
    'Special Shawarma',
    'Warm wrap with seasoned filling and house sauce.',
    950,
    '/uploads/house/menu-board-reference.jpg',
    8,
    true
  ),
  (
    'house-cocktail',
    (select id from public.menu_categories where slug = 'cocktails'),
    'House Cocktail',
    'Signature alcoholic cocktail served with fresh garnish.',
    450,
    '/uploads/house/menu-board-reference.jpg',
    9,
    true
  )
on conflict (slug) do nothing;
