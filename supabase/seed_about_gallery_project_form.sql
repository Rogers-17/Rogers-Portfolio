-- Phase 4 seed: About page, Gallery page, project form settings and About accordion rows.
-- Safe to re-run: singletons use "on conflict do nothing"; facts only seed while the table is empty.
-- The text matches the defaults in lib/pages/schema.ts. Replace it from the admin dashboard.

insert into public.about_page (
  id, badge, title, highlight, intro, photo_alt,
  early_eyebrow, early_title, early_body,
  journey_eyebrow, journey_title, journey_body, journey_image_alt,
  cta_title, cta_label
) values (
  1,
  'About Me 😍',
  'My name is Rogers.',
  'Full-stack Designer.',
  E'I''m Mohammed N. Rogers, a full-stack designer harnessing AI, design and code to rapidly deliver intuitive solutions for startups and financial institutions.\n\nDepending on who''s asking, I''m a product designer, a frontend and backend developer, a brand thinker, or the person who turns a rough idea into a working product.\n\nI own products end to end: from the first sketch and design system to the database, the APIs and the polished interface people actually use.\n\nDesigned & built with passion in Nigeria, shipped for clients around the world.',
  'Portrait of Rogers',
  'Let''s get closer …',
  'My Early Life',
  E'Every builder has an origin story, and mine starts with curiosity: taking things apart, asking how they worked and wanting to make my own.\n\nThat curiosity found a home on the computer. What began as exploring and experimenting slowly turned into design, then code, and eventually into a career.',
  'The Journey',
  'Work Life',
  E'Over the years I''ve worked across design and engineering, helping startups and financial institutions go from idea to launch.\n\nToday I pair product thinking with modern tools like Next.js, Supabase and AI to ship fast, reliable products that people enjoy using.',
  'Illustration of Rogers',
  'Ready to create something huge?',
  'Let''s Work'
) on conflict (id) do nothing;

insert into public.gallery_page (id, badge, title, highlight, quote, signature, hero_alt, cta_title, cta_label)
values (
  1,
  'Gallery 🖼️',
  'Welcome to',
  'My Gallery.',
  E'Behind every project there''s a life being lived. These are the moments between the builds: the places, the people and the days worth remembering.\n\nEvery photo here is a small reminder of where I''ve been and who I''m becoming.',
  'Rogers',
  'Rogers',
  'Ready to create something huge?',
  'Let''s Work'
) on conflict (id) do nothing;

insert into public.project_form_settings (id, countries, project_types, budgets, steps)
values (
  1,
  array['Nigeria', 'United Kingdom', 'United States', 'Canada'],
  array['Website', 'Web App', 'Mobile App', 'UI/UX Design', 'Branding', 'Other'],
  array['< $1,000', '$1,000 – $3,000', '$3,000 – $7,000', '$7,000 – $15,000', '$15,000+'],
  '{
    "name":     {"eyebrow": "Hey there 👋", "title": "What''s your name?", "subtitle": "Your first name would do just fine."},
    "location": {"eyebrow": "Nice to meet you, {name} 🤝", "title": "Where are you based?", "subtitle": "Pick your country, or choose Other."},
    "type":     {"eyebrow": "Let''s talk shop 🛠️", "title": "What type of project is it?", "subtitle": "Pick the one that fits best."},
    "business": {"eyebrow": "Tell me more 🏢", "title": "What''s the name of your business or product?", "subtitle": "A working name is fine too."},
    "deadline": {"eyebrow": "Timeline ⏳", "title": "When do you need it done?", "subtitle": "Pick a target date, or let me know you''re flexible."},
    "budget":   {"eyebrow": "Almost there 💰", "title": "What''s your budget?", "subtitle": "A rough range helps me plan the right approach."},
    "details":  {"eyebrow": "Last step ✍️", "title": "Tell me about the project", "subtitle": "Goals, features, links: anything that helps me understand what you need."},
    "send":     {"eyebrow": "All done! 🎉", "title": "How would you like to send this?", "subtitle": "Choose your preferred method and your project details will be formatted and ready to send."}
  }'::jsonb
) on conflict (id) do nothing;

insert into public.about_facts (icon, title, body, sort_order)
select * from (values
  ('calendar',   'Born',      'The start of the story. Add where and when you were born.', 1),
  ('graduation', 'Education', 'Schools, courses and the lessons that stuck. Add your education here.', 2),
  ('briefcase',  'Career',    'From the first client to today. Add your career milestones here.', 3),
  ('users',      'Family',    'The people behind the work. Add a note about your family here.', 4)
) as seed(icon, title, body, sort_order)
where not exists (select 1 from public.about_facts);
