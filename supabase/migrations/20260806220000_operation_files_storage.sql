-- Bucket privado para anexos de operações (Solicitações)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES (
  'operation-files',
  'operation-files',
  false,
  52428800
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS operation_files_select ON storage.objects;
DROP POLICY IF EXISTS operation_files_insert ON storage.objects;
DROP POLICY IF EXISTS operation_files_update ON storage.objects;
DROP POLICY IF EXISTS operation_files_delete ON storage.objects;

CREATE POLICY operation_files_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'operation-files');

CREATE POLICY operation_files_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'operation-files');

CREATE POLICY operation_files_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'operation-files')
  WITH CHECK (bucket_id = 'operation-files');

CREATE POLICY operation_files_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'operation-files');
