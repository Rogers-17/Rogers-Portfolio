-- Phase 3 seed: the existing homepage dummy entries, unchanged.
-- Safe to re-run: each table is only seeded while it is empty.

insert into public.testimonials (quote, author_name, author_role, rating, sort_order)
select * from (values
  ('Rogers took our vague idea and shipped a product that felt designed, engineered, and polished from day one. Our investors were blown away by the demo.',
   'Ada Onyeka', 'CEO, Lendify', 5, 1),
  ('One of the rare people who can bridge design and code. He rebuilt our platform, cut page loads by 60%, and made the team fall in love with the interface.',
   'Marcus Bell', 'CTO, Restack', 5, 2),
  ('Fast, communicative, and obsessed with detail. Our mobile app finally feels like a product our users want to open every day.',
   'Sara Adeyemi', 'Product Lead, Vault', 5, 3)
) as seed(quote, author_name, author_role, rating, sort_order)
where not exists (select 1 from public.testimonials);

insert into public.experiences (role, company, start_year, end_year, is_current, description, skills, sort_order)
select * from (values
  ('Senior Full-Stack Designer', 'Lendify', 2024, null::smallint, true,
   'Leading design and frontend architecture for a lending platform, building a scalable design system and shipping fintech products to thousands of users.',
   array['Next.js', 'TypeScript', 'Figma', 'Supabase'], 1),
  ('Product Designer & Frontend Developer', 'Restack', 2023, 2024::smallint, false,
   'Designed and built a realtime SaaS workspace, owning the product from research through polished, accessible UI to production.',
   array['React', 'Firebase', 'Tailwind', 'Figma'], 2),
  ('Freelance Web Developer', 'Self Employed', 2021, 2023::smallint, false,
   'Delivered websites and web apps for startups and financial institutions, pairing rapid prototyping with clean, maintainable code.',
   array['Javascript', 'HTML5', 'CSS3', 'WordPress'], 3)
) as seed(role, company, start_year, end_year, is_current, description, skills, sort_order)
where not exists (select 1 from public.experiences);
