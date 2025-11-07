-- Script para crear todas las secuencias necesarias antes de ejecutar prisma db push
-- Base de datos: isp_db

SET search_path TO public;

-- Crear todas las secuencias necesarias
CREATE SEQUENCE IF NOT EXISTS plan_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9999 CACHE 1 OWNED BY NONE;

CREATE SEQUENCE IF NOT EXISTS invoice_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

CREATE SEQUENCE IF NOT EXISTS payment_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

CREATE SEQUENCE IF NOT EXISTS receipt_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

CREATE SEQUENCE IF NOT EXISTS contract_seq
  START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 999999 CACHE 1 OWNED BY NONE;

-- Verificar que se crearon correctamente
SELECT schemaname, sequencename, start_value, increment_by
FROM pg_sequences
WHERE sequencename IN ('plan_seq', 'invoice_seq', 'payment_seq', 'receipt_seq', 'contract_seq')
ORDER BY sequencename;

