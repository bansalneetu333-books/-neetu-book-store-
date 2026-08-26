# Neetu Book Store

Complete static storefront connected to your existing Supabase `books` table.

## Expected columns
id, title, slug, author, description, category, age_group, emoji, price_inr,
storage_path, cover_path, published, featured, created_at

## Expected buckets
- `book-covers` — public
- `ebooks` — preferably private for paid books

For Door 2050:
- title: Door 2050
- slug: door-2050
- price_inr: 99
- storage_path: Door 2050.pdf
- cover_path: door-2050-cover.PNG
- published: true
- featured: false

## Setup
Open `app.js` and replace:
PASTE_YOUR_SUPABASE_PROJECT_URL
PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY

Use the publishable/anon key only. Never expose a secret/service_role key.

## Important
The Buy button is intentionally a placeholder. A real paid bookstore should keep ebook PDFs private and use a payment provider + server/Edge Function + signed URLs after successful payment.

## Deploy
Upload these files to a static host such as Vercel or Netlify after adding the two Supabase values.

## Supabase connection
The supplied Supabase Project URL and publishable key have been placed in `app.js`.
The browser uses the publishable key only; never replace it with a secret/service-role key.

Current database table: `public.books`
Current storage buckets: `book-covers` and `ebooks`

For the public storefront, `books` must allow SELECT for published rows. The cover bucket must allow public object access if the site uses public cover URLs. If `ebooks` is private, the Read/Open button should later be changed to use signed URLs generated securely after purchase.
