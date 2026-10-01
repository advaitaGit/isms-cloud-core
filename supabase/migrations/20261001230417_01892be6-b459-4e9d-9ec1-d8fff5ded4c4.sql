CREATE OR REPLACE FUNCTION public.log_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  rec jsonb; old_rec jsonb; changes jsonb := '{}'::jsonb; k text; org uuid; label text; email text := '';
BEGIN
  -- Server-side admin actions are logged explicitly by the app with the real actor.
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' THEN rec := to_jsonb(OLD); ELSE rec := to_jsonb(NEW); END IF;
  IF TG_TABLE_NAME = 'organizations' THEN org := (rec->>'id')::uuid;
  ELSE org := (rec->>'organization_id')::uuid; END IF;
  label := COALESCE(rec->>'title', rec->>'control_name', rec->>'name', '');
  IF TG_OP = 'UPDATE' THEN
    old_rec := to_jsonb(OLD);
    FOR k IN SELECT jsonb_object_keys(rec) LOOP
      IF rec->k IS DISTINCT FROM old_rec->k THEN
        changes := changes || jsonb_build_object(k, jsonb_build_object('from', old_rec->k, 'to', rec->k));
      END IF;
    END LOOP;
    IF changes = '{}'::jsonb THEN RETURN NEW; END IF;
  ELSE
    changes := rec;
  END IF;
  SELECT p.email INTO email FROM profiles p WHERE p.id = auth.uid();
  INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, entity_type, entity_id, summary, details)
  VALUES (org, auth.uid(), COALESCE(email, ''),
          left(TG_TABLE_NAME, -1) || '.' || CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'UPDATE' THEN 'updated' ELSE 'deleted' END,
          left(TG_TABLE_NAME, -1), rec->>'id', label, changes);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_row_change() FROM anon, public, authenticated;