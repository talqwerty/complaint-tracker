-- Supabase Storage bucket for complaint image attachments.
-- Run via the Supabase MCP (execute_sql) or the Dashboard SQL editor.
-- Private bucket: the API uses S3 access keys (full access) and serves
-- images through time-limited signed URLs, so no RLS policies are required.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'complaint-attachments',
  'complaint-attachments',
  false,
  5242880, -- 5 MB, matches MAX_FILE_SIZE in cases.controller.ts
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
