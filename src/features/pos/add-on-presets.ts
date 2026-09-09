/**
 * Common add-ons for speed — tapping one fills the editor instantly instead
 * of typing name + price for the same handful of extras every time. Still
 * just a shortcut into the same free-text editor: nothing here is a real
 * catalog (none exists yet), so a barista can always type something custom.
 * Prices seeded from what this merchant has actually charged for each
 * add-on historically (checked live against existing orders), not guessed.
 */
export const ADD_ON_PRESETS: { name: string; price_cents: number }[] = [
  { name: "Extra shot", price_cents: 2500 },
  { name: "Oat milk", price_cents: 1500 },
  { name: "Extra syrup", price_cents: 1500 },
  { name: "Whipped cream", price_cents: 1000 },
  { name: "Less ice", price_cents: 2500 },
];
