-- Cover letters: formal business-letter structure (sender block, recipient block, salutation,
-- subject line, closing) and a style choice. Safe to re-run.
-- Run in Supabase Dashboard -> SQL Editor.

alter table public.cover_letters
  add column if not exists sender_name    text,
  add column if not exists sender_contact text,
  add column if not exists sender_address text,
  add column if not exists salutation     text,
  add column if not exists subject        text,
  add column if not exists closing        text,
  add column if not exists style          text not null default 'formal';

alter table public.cover_letters drop constraint if exists cover_letters_recipient_check;
alter table public.cover_letters drop constraint if exists cover_letters_sender_name_check;
alter table public.cover_letters drop constraint if exists cover_letters_sender_contact_check;
alter table public.cover_letters drop constraint if exists cover_letters_sender_address_check;
alter table public.cover_letters drop constraint if exists cover_letters_salutation_check;
alter table public.cover_letters drop constraint if exists cover_letters_subject_check;
alter table public.cover_letters drop constraint if exists cover_letters_closing_check;
alter table public.cover_letters drop constraint if exists cover_letters_style_check;

alter table public.cover_letters
  add constraint cover_letters_recipient_check      check (char_length(recipient) <= 600),
  add constraint cover_letters_sender_name_check    check (char_length(sender_name) <= 120),
  add constraint cover_letters_sender_contact_check check (char_length(sender_contact) <= 300),
  add constraint cover_letters_sender_address_check check (char_length(sender_address) <= 300),
  add constraint cover_letters_salutation_check     check (char_length(salutation) <= 120),
  add constraint cover_letters_subject_check        check (char_length(subject) <= 200),
  add constraint cover_letters_closing_check        check (char_length(closing) <= 60),
  add constraint cover_letters_style_check          check (style in ('formal', 'resume'));
