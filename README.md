# Hearth — a cosy kitchen for everyday cooking

A warm, calm, editorial recipe and meal-planning site. It's static and runs entirely in the browser: no backend, no sign-up, no trackers, no API keys.

**Live:** https://kumarnikhildeveloperaccount.github.io/hearth/

## Features
- **60 original home recipes**: Indian, Italian, Mexican, Chinese, Mediterranean, baking, 15-minute meals, breakfasts and desserts. Each one has a Veg, Vegan, Egg or Non-veg label.
- **Generated SVG illustrations** for every recipe. There are no external images, and steam rises from the hot dishes.
- **Servings scaler** that shows proper fractions (½, ⅓, ¾) and a **metric ↔ US unit converter** that covers cups, ounces, °F and inches.
- **Cook mode**: big text, swipe or arrow keys between steps, and the screen stays awake (Wake Lock API, with a fallback). It can read the steps aloud with the browser's built-in speech. Gentle sizzle and bubble sounds are made with Web Audio and stay muted until you turn them on.
- **Multiple kitchen timers** that start from the step text or a custom time. They chime, vibrate and keep running across pages.
- Ingredient checklist and an approximate, clearly labelled nutrition estimate.
- **"What can I cook with…" pantry search**, ranked by what you'd still need to buy.
- **Weekly meal planner** that supports drag & drop *and* tap-to-assign for touch and keyboard.
- **Automatic shopping list** grouped by aisle, which you can share, copy or print.
- Favourites and personal notes.
- **Add your own recipes** with a photo (stored locally in IndexedDB).
- Print-friendly recipe cards.
- **Export/import** of all your data as JSON (photos included).
- Four themes: Morning Linen (default), Night Kitchen, Farmhouse and Minimal.
- Reduced-motion support, a low-power mode, safe-area insets and 44px touch targets.
- Two hidden easter eggs 🍲

## Structure
```
index.html          app shell
404.html            friendly not-found page
favicon.svg, manifest.webmanifest
css/base.css        themes, textures, layout, header, page-curl transitions
css/components.css  cards, recipe page, planner, shopping list, cook mode, timers
css/print.css       printable recipe cards and shopping lists
js/data-1.js, js/data-2.js   recipe data
js/util.js          parsing, fractions, unit conversion, aisles, nutrition
js/store.js         localStorage + IndexedDB, export/import
js/art.js           SVG food illustrations and hand-drawn icons
js/audio.js         Web Audio chimes, sizzle and bubbles
js/app.js           router, home, browsing, recipe page
js/views.js         pantry, planner, shopping, favourites, add/edit, settings, about
js/cook.js          cook mode, wake lock, read-aloud, timers
```
Plain scripts (no build step, no modules) are used, so it also works when opened straight from disk.

## Deploy
Push the folder to a GitHub repository named `hearth` and enable GitHub Pages. All paths are relative.

## Credits
Designed & built by **Kumar Nikhil** · [Portfolio](https://kumarnikhildeveloperaccount.github.io/) · [LinkedIn](https://www.linkedin.com/in/kumar-nikhil-1000a9192/) · [Email](mailto:nkashyapnikhilnk@gmail.com)

With gratitude to God — Om Namah Paarvati Pateh, Har Har Mahadev. May God bless you and everyone.

*Nutrition values are rough estimates and not dietary advice.*
