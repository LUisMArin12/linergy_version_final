/*
  # Eliminar Sistema de Auditoría

  1. Cambios
    - Eliminar trigger de fallas
    - Eliminar funciones de auditoría
    - Eliminar tabla audit_logs
    - Eliminar índices relacionados

  2. Notas
    - Se elimina completamente el sistema de auditoría
    - No afecta otras funcionalidades del sistema
*/

-- Eliminar trigger
DROP TRIGGER IF EXISTS trigger_audit_fallas ON fallas;

-- Eliminar funciones
DROP FUNCTION IF EXISTS audit_fallas_changes();
DROP FUNCTION IF EXISTS get_audit_logs(uuid, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS insert_audit_log(text, text, uuid, jsonb);

-- Eliminar tabla y sus índices
DROP TABLE IF EXISTS audit_logs CASCADE;
