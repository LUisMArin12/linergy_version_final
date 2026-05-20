# Compatibilidad con el cambio de Supabase: Data API y `GRANT`

Supabase notificó que las tablas nuevas creadas en el esquema `public` dejarán de quedar expuestas automáticamente a la Data API. En Linergy sí se usa la Data API mediante `supabase-js`, `.from(...)` y `.rpc(...)`, por lo tanto el proyecto debe declarar permisos SQL explícitos.

## Archivo agregado

Se agregó la migración:

```txt
supabase/migrations/20260520010000_explicit_data_api_grants.sql
```

## Qué corrige

La migración agrega permisos explícitos para que el frontend y las Edge Functions puedan seguir usando:

- `lineas`
- `estructuras`
- `fallas`
- `profiles`
- `reportes`
- `linea_tramos`, cuando exista
- `subestaciones`, cuando exista
- `audit_logs`, cuando exista
- RPC geoespaciales y administrativas usadas por Linergy

También agrega `ALTER DEFAULT PRIVILEGES` para que futuras tablas, rutinas y secuencias creadas por migraciones ejecutadas como `postgres` no queden invisibles para `supabase-js`.

## Decisión de seguridad aplicada

El dashboard de Linergy está protegido por autenticación, por lo tanto los permisos de tablas se otorgan a:

```sql
authenticated, service_role
```

No se otorgan nuevos permisos a `anon`. Esto evita exponer datos operativos del mapa a usuarios no autenticados por el simple hecho de usar la llave pública del frontend.

## Importante

`GRANT` no reemplaza Row Level Security. Son capas diferentes:

1. `GRANT` permite que el rol pueda acceder al objeto desde PostgREST / Data API.
2. RLS define qué filas y acciones puede ejecutar ese rol.

Si falta `GRANT`, la API puede responder errores como `permission denied for table ...` aunque las políticas RLS estén bien definidas.

## Cómo aplicarlo

En local o staging:

```bash
npx supabase db push
```

O, si usas flujo de reset local:

```bash
npx supabase db reset
```

Después valida en la aplicación:

1. Iniciar sesión.
2. Entrar a `/dashboard/mapa`.
3. Cargar líneas, fallas y estructuras.
4. Registrar una falla.
5. Cambiar estado de una falla.
6. Generar reporte.
7. Entrar a módulos administrativos con un usuario admin.

## Síntoma si no se aplica

La app puede fallar en llamadas como:

```ts
supabase.from('fallas').select('*')
supabase.rpc('get_lineas_geojson')
```

con errores del tipo:

```txt
permission denied for table fallas
permission denied for function get_lineas_geojson
```
