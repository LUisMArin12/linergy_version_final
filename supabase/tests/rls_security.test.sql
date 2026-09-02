BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT extensions.plan(25);

-- Object-level access: signed-out clients cannot reach application data or RPCs.
SELECT extensions.ok(
  NOT has_schema_privilege('anon', 'public', 'USAGE'),
  'anon cannot use the public schema'
);

SELECT extensions.ok(
  NOT has_table_privilege('anon', 'public.lineas', 'SELECT'),
  'anon cannot read lineas'
);

SELECT extensions.ok(
  NOT has_function_privilege('anon', 'public.get_lineas_geojson()', 'EXECUTE'),
  'anon cannot execute public read RPCs'
);

SELECT extensions.ok(
  has_table_privilege('authenticated', 'public.lineas', 'SELECT'),
  'authenticated can read operational tables'
);

SELECT extensions.ok(
  has_table_privilege('authenticated', 'public.lineas', 'INSERT'),
  'authenticated reaches write operations so RLS can authorize admins'
);

SELECT extensions.ok(
  NOT has_function_privilege(
    'authenticated',
    'public.get_point_coords(public.geometry)',
    'EXECUTE'
  ),
  'authenticated cannot execute server-only geometry helpers'
);

SELECT extensions.ok(
  NOT has_function_privilege(
    'authenticated',
    'public.update_updated_at_column()',
    'EXECUTE'
  ),
  'authenticated cannot call trigger functions directly'
);

-- Elevated application RPCs must obey the caller's RLS policies.
SELECT extensions.ok(
  NOT (
    SELECT procedure.prosecdef
    FROM pg_proc AS procedure
    WHERE procedure.oid = 'public.insert_falla_with_wkt(uuid,double precision,text,text,timestamptz,public.estado_falla,text)'::regprocedure
  ),
  'insert_falla_with_wkt is security invoker'
);

SELECT extensions.ok(
  NOT (
    SELECT procedure.prosecdef
    FROM pg_proc AS procedure
    WHERE procedure.oid = 'public.update_falla_geom(uuid,text)'::regprocedure
  ),
  'update_falla_geom is security invoker'
);

SELECT extensions.ok(
  NOT (
    SELECT procedure.prosecdef
    FROM pg_proc AS procedure
    WHERE procedure.oid = 'public.get_reportes_geojson()'::regprocedure
  ),
  'get_reportes_geojson is security invoker'
);

SELECT extensions.is(
  (
    SELECT count(*)
    FROM pg_proc AS procedure
    JOIN pg_namespace AS namespace ON namespace.oid = procedure.pronamespace
    WHERE namespace.nspname = 'public'
      AND procedure.prokind = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend AS dependency
        WHERE dependency.classid = 'pg_proc'::regclass
          AND dependency.objid = procedure.oid
          AND dependency.deptype = 'e'
      )
      AND COALESCE(array_to_string(procedure.proconfig, ','), '') NOT LIKE
        '%search_path=pg_catalog, public, auth%'
  ),
  0::bigint,
  'all application functions have a fixed search_path'
);

-- Reuse the seeded administrator as a regular user inside this transaction.
SELECT set_config(
  'test.user_id',
  (SELECT profile.id::text FROM public.profiles AS profile WHERE profile.role = 'admin' LIMIT 1),
  true
);

UPDATE public.profiles
SET role = 'user'
WHERE id = current_setting('test.user_id')::uuid;

SELECT set_config('request.jwt.claim.sub', current_setting('test.user_id'), true);
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SET LOCAL ROLE authenticated;

SELECT extensions.is(
  public.is_admin(),
  false,
  'a regular user is not an administrator'
);

SELECT extensions.ok(
  (SELECT count(*) FROM public.lineas) > 0,
  'a regular user can read lineas'
);

SELECT extensions.is(
  (SELECT count(*) FROM public.profiles),
  1::bigint,
  'a regular user can read only their own profile'
);

SELECT extensions.results_eq(
  $$
    UPDATE public.lineas
    SET nombre = 'RLS must block this update'
    WHERE id = (SELECT id FROM public.lineas ORDER BY id LIMIT 1)
    RETURNING id
  $$,
  ARRAY[]::uuid[],
  'a regular-user update affects no rows'
);

SELECT extensions.throws_ok(
  $$INSERT INTO public.lineas (numero) VALUES ('RLS-BLOCKED-INSERT')$$,
  '42501',
  'new row violates row-level security policy for table "lineas"',
  'a regular user cannot insert lineas'
);

SELECT extensions.throws_ok(
  $$
    SELECT *
    FROM public.insert_falla_with_wkt(
      p_linea_id := (SELECT id FROM public.lineas ORDER BY id LIMIT 1),
      p_km := 1,
      p_tipo := 'RLS blocked test',
      p_geom_wkt := 'POINT(-104.65 24.03)'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "fallas"',
  'a regular user cannot bypass RLS through insert_falla_with_wkt'
);

RESET ROLE;

-- A caller without a profile must fail closed in delete_user.
SELECT set_config('request.jwt.claim.sub', '90000000-0000-4000-8000-000000000099', true);
SET LOCAL ROLE authenticated;

SELECT extensions.throws_ok(
  format(
    'SELECT public.delete_user(%L::uuid)',
    current_setting('test.user_id')
  ),
  '42501',
  'Only admins can delete users',
  'delete_user rejects callers without a profile'
);

RESET ROLE;

-- Restore the seeded admin role and exercise allowed administrator flows.
UPDATE public.profiles
SET role = 'admin'
WHERE id = current_setting('test.user_id')::uuid;

SELECT set_config('request.jwt.claim.sub', current_setting('test.user_id'), true);
SET LOCAL ROLE authenticated;

SELECT extensions.is(
  public.is_admin(),
  true,
  'the seeded administrator is recognized'
);

SELECT extensions.lives_ok(
  $$
    UPDATE public.lineas
    SET nombre = nombre
    WHERE id = (SELECT id FROM public.lineas ORDER BY id LIMIT 1)
  $$,
  'an administrator can update lineas'
);

SELECT extensions.lives_ok(
  $$
    INSERT INTO public.lineas (id, numero, nombre)
    VALUES (
      '90000000-0000-4000-8000-000000000001',
      'RLS-ADMIN-TEST',
      'Temporary pgTAP row'
    )
  $$,
  'an administrator can insert lineas'
);

SELECT extensions.lives_ok(
  $$
    DELETE FROM public.lineas
    WHERE id = '90000000-0000-4000-8000-000000000001'
  $$,
  'an administrator can delete lineas'
);

SELECT extensions.lives_ok(
  $$
    SELECT *
    FROM public.insert_falla_with_wkt(
      p_linea_id := (SELECT id FROM public.lineas ORDER BY id LIMIT 1),
      p_km := 1,
      p_tipo := 'Administrator RPC test',
      p_geom_wkt := 'POINT(-104.65 24.03)'
    )
  $$,
  'an administrator can create a falla through the RPC'
);

SELECT extensions.throws_ok(
  format(
    'SELECT public.delete_user(%L::uuid)',
    current_setting('test.user_id')
  ),
  '42501',
  'Admins cannot delete their own account',
  'an administrator cannot delete their own account'
);

RESET ROLE;

SET LOCAL ROLE service_role;

SELECT extensions.ok(
  (SELECT count(*) FROM public.lineas) > 0,
  'service_role retains server-side table access'
);

RESET ROLE;

SELECT * FROM extensions.finish();

ROLLBACK;
