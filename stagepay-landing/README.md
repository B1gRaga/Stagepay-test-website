# StagePay Landing Page

Static landing page for StagePay.

## Structure
- `index.html` — main page
- `css/styles.css` — all styles
- `js/main.js` — scroll reveal, sticky bar, signup handler
- `assets/` — place logo and images here

## Setup
Open `index.html` in a browser, or serve with any static server:
  npx serve .

## Notes
- Update `stagepay-app_6.html` links in `index.html` and `js/main.js` to point to your live app URL before deploying.
- To wire up the signup form, replace the `console.log` in `handleSignup()` inside `js/main.js` with a POST to your backend.
