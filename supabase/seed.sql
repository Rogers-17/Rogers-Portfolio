-- Phase 1 seed: the 3 projects from the design + shared technologies.
-- Safe to re-run: projects/technologies upsert on slug, children are replaced.
-- Lines marked "-- VERIFY" were cut off in the design screenshot and completed by hand.

-- ---------------------------------------------------------------------------
-- Technologies (icon_path = file name inside the `tech-icons` bucket)
-- ---------------------------------------------------------------------------
insert into public.technologies (name, slug, icon_path) values
  ('JavaScript',   'javascript',   'javascript.svg'),
  ('TypeScript',   'typescript',   'typescript.svg'),
  ('HTML5',        'html5',        'html5.svg'),
  ('CSS3',         'css3',         'css3.svg'),
  ('Firebase',     'firebase',     'firebase.svg'),
  ('Supabase',     'supabase',     'supabase.svg'),
  ('Figma',        'figma',        'figma.svg'),
  ('WordPress',    'wordpress',    'wordpress.svg'),
  ('Google Cloud', 'google-cloud', null),
  ('Sentry',       'sentry',       null),
  ('Vercel',       'vercel',       null),
  ('GitHub',       'github',       null)
on conflict (slug) do update
  set name = excluded.name,
      icon_path = coalesce(public.technologies.icon_path, excluded.icon_path);

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
insert into public.projects
  (slug, name, tagline, summary, project_type, year, status, is_featured, is_published, sort_order)
values
  ('htmlhost-co', 'htmlhost.co',
   'Paste HTML and get a shareable URL in seconds.',
   'Paste HTML and get a shareable URL in seconds, with AI-powered visual editing for additional tweaks and support for custom domains.',
   'Software', 2026, 'active', true, true, 1),
  ('colorinvoice', 'ColorInvoice',
   'AI-first invoicing built for branded billing, automated payment follow-ups, and full multi-business profile management.',
   'AI-first invoicing built for branded billing, automated payment follow-ups, and full multi-business profile management.',
   'Software', 2026, 'active', true, true, 2),
  ('naya-ai', 'Naya AI',
   'AI-powered RAG chatbot that automates customer support.',
   'Vastly trained AI-powered RAG chatbot that automates customer support, saving 87% of customer care agent time.',
   'Software', 2026, 'active', true, true, 3)
on conflict (slug) do update set
  name = excluded.name,
  tagline = excluded.tagline,
  summary = excluded.summary,
  project_type = excluded.project_type,
  year = excluded.year,
  status = excluded.status,
  is_featured = excluded.is_featured,
  is_published = excluded.is_published,
  sort_order = excluded.sort_order;

-- ColorInvoice case study (from the design)
update public.projects set
  client = 'Yuyu',
  role = 'Founder, COO & CTO',
  website_url = null, -- VERIFY: add the live https:// URL to enable "Visit website"
  overview = $txt$ColorInvoice is an AI-first invoicing and financial management platform purpose-built for freelancers, solopreneurs, and small businesses. It replaces the fragmented mess of spreadsheets, PDF templates, and disconnected accounting tools with a single, intelligent workspace—where users can generate estimates, convert them to invoices, track payments, log expenses, and manage recurring billing, all from one dashboard.

What sets it apart is its AI command layer: users speak or type natural-language instructions, and the system parses them into structured financial documents in seconds. Built entirely from scratch as a solo engineering effort, ColorInvoice is a live, monetized SaaS product, integrated with Stripe and Paystack for global payments, and powered by AI for intelligent automation.$txt$, -- VERIFY: first sentence was cut off in the design
  problem = $txt$Running a small business means wearing every hat—sales, delivery, and finance. But the financial workflow is where most freelancers and solopreneurs silently leak time and money. It starts before a single hour of work is logged: a prospective client asks for a quote, and you scramble to format something professional in a Word document or a generic template that barely represents your brand. If they accept, you now need to convert that estimate into an invoice—manually re-entering the same line items, recalculating tax, and hoping you didn't mistype a number. Once the invoice is sent, the real anxiety begins. There's no system to track whether it was viewed, no automated reminders when it goes overdue, and no centralized place to record partial payments. Meanwhile, your expenses pile up in email receipts and bank notifications you promise yourself you'll organize "later." Multiply this across multiple clients, currencies, and billing cycles, and the back-office becomes a liability—a silent drain on revenue, professionalism, and sanity. The tools that claim to solve this are either bloated enterprise platforms demanding a finance degree to navigate, or bare-bones free alternatives that collapse the moment your business outgrows a handful of clients.$txt$, -- VERIFY: first sentence was cut off in the design
  solution = $txt$I built ColorInvoice to end that cycle. It's a full-stack, cloud-native invoicing and financial management platform that lets you create, send, track, and get paid on professional invoices—all from a single, beautifully designed dashboard. But ColorInvoice isn't just another invoice generator. It's an AI-first financial operating system. Instead of manually filling out line items one field at a time, you can simply speak or type a natural-language command—"Invoice Yoyo Ltd for 10 hours of consulting at $150 per hour, due in 30 days"—and watch the AI parse your words into a perfectly structured, tax-calculated invoice in under two seconds. It handles your customers, expenses, recurring billing, payment tracking, team collaboration, and even a conversational AI assistant that can analyze your entire financial history on demand. ColorInvoice transforms the most dreaded part of running a business into something that feels almost effortless.$txt$,
  dev_role = $txt$I designed, built, finance, and oversee the operations of ColorInvoice end-to-end as a solo effort. I maintain ColorInvoice across frontend, backend, payments, AI, email infrastructure, and platform security.

ColorInvoice is the result of discipline. It is a mature multi-tenant SaaS product with real operational weight, not a proof of concept.$txt$,
  monetization = $txt$ColorInvoice operates on a carefully designed freemium-to-subscription model. New users receive a 5-day free trial with full platform access, after which subscription is automatically charged to their card, except if user cancels during the trial period.

After the 5-day trial, a Pro subscription is required to continue sending invoices. The subscription system enforces itself automatically and effectively handles grace periods, expiration, and status transitions without manual intervention. This model ensures the platform is self-sustaining while keeping the barrier to entry low enough for any freelancer to experience the full product before committing.$txt$,
  tech_intro = 'Building a platform of this depth required a deliberate, high-performance technology stack:',
  project_summary = $txt$ColorInvoice is the product of a simple conviction: that the financial back-office of a small business should be as intelligent and effortless as the work that generates the revenue. What began as a frustration with fragmented, unintuitive invoicing tools became a fully realized SaaS platform—AI-powered, subscription-monetized, and battle-tested in production. Built entirely from scratch by a single developer managing multiple live products alongside a full-time professional career, ColorInvoice stands as proof that with enough hunger, technical depth, and organizational discipline, one person can architect and ship software that genuinely moves the needle for the people who use it. It's not just an invoice generator—it's a financial command center for the modern freelancer.$txt$
where slug = 'colorinvoice';

-- Replace ColorInvoice children so the seed is re-runnable
delete from public.project_features       where project_id = (select id from public.projects where slug = 'colorinvoice');
delete from public.project_tech_breakdown where project_id = (select id from public.projects where slug = 'colorinvoice');
delete from public.project_technologies   where project_id = (select id from public.projects where slug = 'colorinvoice');

insert into public.project_features (project_id, title, sort_order)
select p.id, f.title, f.sort_order
from public.projects p
cross join (values
  ('AI Voice & Text Command Engine', 1),
  ('AI Business Chat Assistant', 2),
  ('Multi-Gateway Subscription Billing', 3),
  ('Professional Invoice Generation & Delivery', 4),
  ('Real-Time Financial Dashboard & KPIs', 5),
  ('Multi-Tenant Team Collaboration', 6),
  ('Recurring Invoices & Expenses Automation', 7),
  ('Estimates, Inventory & Customer CRM', 8),
  ('Multi-Business Management', 9),
  ('PWA, White-Labeling & Platform Hardening', 10)
) as f(title, sort_order)
where p.slug = 'colorinvoice';

insert into public.project_tech_breakdown (project_id, label, description, sort_order)
select p.id, b.label, b.description, b.sort_order
from public.projects p
cross join (values
  ('Frontend', 'Vanilla JavaScript with Tailwind CSS, delivering a fast, lightweight SPA architecture with no framework overhead. TomSelect for rich dropdowns, Chart.js for data visualization, intl-tel-input for international phone formatting, and Iconify for a consistent icon system.', 1),
  ('Backend & API', 'Firebase Cloud Functions v2 (Node.js 22) serving as the entire serverless backend—handling AI processing, email dispatch, subscription management, team operations, and admin tooling across modular controller files.', 2),
  ('AI Pipeline', 'OpenAI SDK (GPT-4o-mini for text parsing and chat, Whisper for voice transcription) with context-specific system prompts, strict JSON output enforcement, and a DRY voice recorder engine shared across five form contexts.', 3),
  ('Database & Auth', 'Cloud Firestore with tenant-scoped security rules and Firebase Auth with custom claims (tenantId, role) for zero-trust data isolation. Immutable audit logs for compliance.', 4),
  ('Payments', 'Stripe SDK for global card payments and a custom Paystack HTTPS client for African market support—both with webhook verification, subscription lifecycle normalization, and automated cron enforcement.', 5),
  ('Email Infrastructure', 'Nodemailer with custom SMTP configuration, delivering branded HTML transactional emails including invoice delivery, payment receipts, overdue reminders, welcome sequences, ban/reinstatement notices, without third-party email service dependencies.', 6),
  ('Observability', 'Sentry for real-time error tracking with session replay on production errors.', 7),
  ('PWA & Deployment', 'Service worker caching, Firebase Hosting, and a manifest-driven installable experience.', 8)
) as b(label, description, sort_order)
where p.slug = 'colorinvoice';

insert into public.project_technologies (project_id, technology_id, sort_order)
select p.id, t.id, x.sort_order
from public.projects p
cross join (values
  ('javascript', 1), ('firebase', 2), ('google-cloud', 3), ('html5', 4),
  ('sentry', 5), ('vercel', 6), ('github', 7), ('css3', 8)
) as x(slug, sort_order)
join public.technologies t on t.slug = x.slug
where p.slug = 'colorinvoice';
