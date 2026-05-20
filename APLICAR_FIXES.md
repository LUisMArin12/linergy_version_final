# Pasos para aplicar las correcciones

## 1) Base de datos
Aplica la migración nueva:

```bash
npx supabase db push
```

Si no quieres usar la CLI, pega el contenido de:

- `supabase/migrations/20260323230000_fix_get_lineas_geojson_after_prioridad_removal.sql`

en el SQL Editor de Supabase y ejecútalo.

## 2) Edge Functions
Estas funciones fueron corregidas para autenticación manual y compatibilidad con JWT Signing Keys:

- `compute-fault-location`
- `import-kmz`

Despliega ambas:

```bash
npx supabase functions deploy compute-fault-location
npx supabase functions deploy import-kmz
```

## 3) Frontend
Instala dependencias y levanta la app:

```bash
npm install
npm run dev
```

## 4) Si sigue fallando
Revisa el log de la función desplegada en Supabase. Con estas correcciones ya no debería devolverte 401 por validación legacy de JWT.
