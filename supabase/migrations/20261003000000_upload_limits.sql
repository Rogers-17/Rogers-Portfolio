-- Raise every storage bucket to a 10 MB file limit, and let the private resume bucket accept
-- PDFs (CV imports; they are deleted right after being read). Safe to re-run.
-- Run in Supabase Dashboard -> SQL Editor.

update storage.buckets
set file_size_limit = 10 * 1024 * 1024
where id in ('project-images', 'tech-icons', 'site-images', 'resume-assets');

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
where id = 'resume-assets';
