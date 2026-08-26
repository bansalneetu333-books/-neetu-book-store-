-- Optional: use this only if your public website cannot read published books.
alter table public.books enable row level security;
drop policy if exists "Public can read published books" on public.books;
create policy "Public can read published books"
on public.books for select to anon, authenticated
using (published = true);

-- book-covers is public in your project.
-- Keep the ebooks bucket PRIVATE for paid PDFs.
-- After payment, use a server/Edge Function to issue a short-lived signed URL.
