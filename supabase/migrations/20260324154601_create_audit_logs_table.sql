/*
  # Sistema de Auditoría de Usuarios

  1. Nueva Tabla: audit_logs
    - `id` (uuid, primary key): Identificador único del log
    - `user_id` (uuid, foreign key): Usuario que realizó la acción
    - `action` (text): Tipo de acción (CREATE, UPDATE, DELETE, LOGIN, LOGOUT)
    - `entity_type` (text): Tipo de entidad afectada (falla, linea, user, etc.)
    - `entity_id` (uuid, nullable): ID de la entidad afectada
    - `details` (jsonb): Detalles adicionales de la acción
    - `ip_address` (text, nullable): Dirección IP del usuario
    - `user_agent` (text, nullable): Navegador/dispositivo del usuario
    - `created_at` (timestamptz): Timestamp de la acción

  2. Seguridad
    - Enable RLS en audit_logs
    - Solo admins pueden leer logs
    - Sistema inserta logs automáticamente mediante triggers

  3. Funciones
    - Función para insertar logs
    - Trigger automático en fallas
    - Función para obtener logs por usuario y fecha
*/

-- Crear tabla de logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VIEW')),
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Sistema puede insertar logs (mediante security definer functions)
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Función para insertar logs de auditoría
CREATE OR REPLACE FUNCTION insert_audit_log(
  p_action text,
  p_entity_type text,
  p_entity_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_details)
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Trigger para auditar cambios en fallas
CREATE OR REPLACE FUNCTION audit_fallas_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_action text;
  v_details jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE';
    v_details := jsonb_build_object(
      'tipo', NEW.tipo,
      'estado', NEW.estado,
      'descripcion', NEW.descripcion
    );
    PERFORM insert_audit_log(v_action, 'falla', NEW.id, v_details);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE';
    v_details := jsonb_build_object(
      'old_estado', OLD.estado,
      'new_estado', NEW.estado,
      'changes', jsonb_build_object(
        'tipo', CASE WHEN OLD.tipo != NEW.tipo THEN NEW.tipo END,
        'descripcion', CASE WHEN OLD.descripcion != NEW.descripcion THEN NEW.descripcion END
      )
    );
    PERFORM insert_audit_log(v_action, 'falla', NEW.id, v_details);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE';
    v_details := jsonb_build_object(
      'tipo', OLD.tipo,
      'estado', OLD.estado,
      'deleted_at', now()
    );
    PERFORM insert_audit_log(v_action, 'falla', OLD.id, v_details);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplicar trigger a fallas
DROP TRIGGER IF EXISTS trigger_audit_fallas ON fallas;
CREATE TRIGGER trigger_audit_fallas
  AFTER INSERT OR UPDATE OR DELETE ON fallas
  FOR EACH ROW
  EXECUTE FUNCTION audit_fallas_changes();

-- Función para obtener logs con información de usuario
CREATE OR REPLACE FUNCTION get_audit_logs(
  p_user_id uuid DEFAULT NULL,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_entity_type text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_email text,
  user_name text,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    au.email as user_email,
    p.nombre as user_name,
    al.action,
    al.entity_type,
    al.entity_id,
    al.details,
    al.created_at
  FROM audit_logs al
  LEFT JOIN auth.users au ON al.user_id = au.id
  LEFT JOIN profiles p ON al.user_id = p.id
  WHERE 
    (p_user_id IS NULL OR al.user_id = p_user_id)
    AND (p_start_date IS NULL OR al.created_at >= p_start_date)
    AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    AND (p_entity_type IS NULL OR al.entity_type = p_entity_type)
  ORDER BY al.created_at DESC;
END;
$$;