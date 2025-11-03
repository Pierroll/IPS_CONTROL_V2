-- =====================================================
-- Archivo: secuencias_iniciales.sql
-- Propósito: Crear y verificar secuencias para folios
--            (invoice/payment/receipt/contract) en PostgreSQL
--            antes de ejecutar `prisma db push`.
-- Nota: Este script es idempotente (usa IF NOT EXISTS).
-- =====================================================

-- Opcional: asegura el esquema por defecto
SET search_path TO public;

-- 1) CREACIÓN DE SECUENCIAS (idempotente)
CREATE SEQUENCE IF NOT EXISTS invoice_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

CREATE SEQUENCE IF NOT EXISTS payment_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

CREATE SEQUENCE IF NOT EXISTS receipt_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

CREATE SEQUENCE IF NOT EXISTS contract_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

-- 2) PERMISOS (ajusta el rol si usas otro usuario de app)
-- Recomendado: evita que PUBLIC use las secuencias y da permisos al rol de la app
REVOKE ALL ON SEQUENCE invoice_seq, payment_seq, receipt_seq, contract_seq FROM PUBLIC;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE invoice_seq, payment_seq, receipt_seq, contract_seq TO gestion_user;

-- 3) VERIFICAR QUE EXISTEN Y SU CONFIGURACIÓN
SELECT schemaname, sequencename, start_value, increment_by, last_value
FROM pg_sequences
WHERE sequencename IN ('invoice_seq','payment_seq','receipt_seq','contract_seq')
ORDER BY sequencename;

-- 4) PRUEBAS: OBTENER SIGUIENTES VALORES FORMATEADOS
-- OJO: nextval() AVANZA la secuencia. Si no quieres “consumir” números en pruebas,
-- comenta este bloque y usa sólo la verificación de arriba.
SELECT
  CONCAT('INV-', TO_CHAR(nextval('invoice_seq'),  'FM000000')) AS invoice_test,
  CONCAT('PAY-', TO_CHAR(nextval('payment_seq'),  'FM000000')) AS payment_test,
  CONCAT('REC-', TO_CHAR(nextval('receipt_seq'), 'FM000000')) AS receipt_test,
  CONCAT('CTR-', TO_CHAR(nextval('contract_seq'),'FM000000')) AS contract_test;

-- (Opcional) RESETEAR LAS SECUENCIAS A 1 DESPUÉS DE PROBAR:
-- Descomenta si deseas que la numeración inicie en 000001 cuando arranque la app.
-- ALTER SEQUENCE invoice_seq  RESTART WITH 1;
-- ALTER SEQUENCE payment_seq  RESTART WITH 1;
-- ALTER SEQUENCE receipt_seq  RESTART WITH 1;
-- ALTER SEQUENCE contract_seq RESTART WITH 1;

-- (Opcional) VISTAS SÓLO PARA PRUEBA MANUAL DE FORMATEO (puedes omitir)
-- CREATE OR REPLACE VIEW v_next_codes AS
-- SELECT
--   CONCAT('INV-', TO_CHAR(nextval('invoice_seq'),  'FM000000')) AS next_invoice_code,
--   CONCAT('PAY-', TO_CHAR(nextval('payment_seq'),  'FM000000')) AS next_payment_code,
--   CONCAT('REC-', TO_CHAR(nextval('receipt_seq'), 'FM000000')) AS next_receipt_code,
--   CONCAT('CTR-', TO_CHAR(nextval('contract_seq'),'FM000000')) AS next_contract_code;

-- 5) (Opcional) CHEQUEO RÁPIDO DE PERMISOS EFECTIVOS PARA TU USUARIO
-- SELECT n.nspname AS schema_name, c.relname AS sequence_name, pg_get_userbyid(c.relowner) AS owner,
--        has_sequence_privilege('gestion_user', c.oid, 'USAGE')  AS can_use,
--        has_sequence_privilege('gestion_user', c.oid, 'SELECT') AS can_select,
--        has_sequence_privilege('gestion_user', c.oid, 'UPDATE') AS can_update
-- FROM pg_class c
-- JOIN pg_namespace n ON n.oid = c.relnamespace
-- WHERE c.relkind = 'S' AND c.relname IN ('invoice_seq','payment_seq','receipt_seq','contract_seq')
-- ORDER BY c.relname;

