CREATE SEQUENCE IF NOT EXISTS plan_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    CACHE 1;
CREATE SEQUENCE IF NOT EXISTS invoice_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    CACHE 1;
CREATE SEQUENCE IF NOT EXISTS payment_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    CACHE 1;
CREATE SEQUENCE IF NOT EXISTS contract_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    CACHE 1;
CREATE SEQUENCE IF NOT EXISTS receipt_seq 
    START WITH 1 
    INCREMENT BY 1 
    MINVALUE 1 
    MAXVALUE 999999 
    CACHE 1;
-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'MANAGER', 'SELLER', 'TECHNICIAN', 'SUPPORT');

-- CreateEnum
CREATE TYPE "public"."DocumentType" AS ENUM ('DNI', 'RUC', 'PASSPORT', 'CE');

-- CreateEnum
CREATE TYPE "public"."CustomerType" AS ENUM ('INDIVIDUAL', 'BUSINESS', 'CORPORATION');

-- CreateEnum
CREATE TYPE "public"."CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PROSPECT', 'CHURNED');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "public"."PlanCategory" AS ENUM ('INTERNET', 'TELEVISION', 'TELEPHONE', 'BUNDLE');

-- CreateEnum
CREATE TYPE "public"."SLALevel" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "public"."PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."PlanChangeType" AS ENUM ('UPGRADE', 'DOWNGRADE', 'LATERAL', 'SUSPENSION', 'REACTIVATION');

-- CreateEnum
CREATE TYPE "public"."NetworkDeviceType" AS ENUM ('ROUTER', 'SWITCH', 'ACCESS_POINT', 'FIREWALL', 'MODEM', 'ONT', 'OLT');

-- CreateEnum
CREATE TYPE "public"."ConnectionType" AS ENUM ('SSH', 'TELNET', 'HTTP', 'HTTPS', 'SNMP');

-- CreateEnum
CREATE TYPE "public"."DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AlertType" AS ENUM ('CPU_HIGH', 'MEMORY_HIGH', 'DISK_FULL', 'INTERFACE_DOWN', 'DEVICE_OFFLINE', 'TEMPERATURE_HIGH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."AlertSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "public"."BillingStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'VOID');

-- CreateEnum
CREATE TYPE "public"."PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD', 'CHECK', 'DIGITAL_WALLET');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."LedgerType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "public"."MessageChannel" AS ENUM ('SMS', 'WHATSAPP', 'EMAIL', 'PUSH', 'VOICE');

-- CreateEnum
CREATE TYPE "public"."MessageType" AS ENUM ('WELCOME', 'PAYMENT_REMINDER', 'SERVICE_NOTIFICATION', 'TECHNICAL_ALERT', 'PROMOTIONAL', 'SUPPORT');

-- CreateEnum
CREATE TYPE "public"."MessageStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "public"."TicketCategory" AS ENUM ('INSTALACION', 'SOPORTE_TECNICO', 'MANTENIMIENTO', 'RECLAMO', 'CONSULTA', 'SUSPENSION', 'REACTIVACION', 'CAMBIO_PLAN');

-- CreateEnum
CREATE TYPE "public"."TicketStatus" AS ENUM ('PENDIENTE', 'ASIGNADO', 'EN_PROGRESO', 'ESCALADO', 'EN_ESPERA', 'RESUELTO', 'CERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ReceiptType" AS ENUM ('SERVICE', 'INSTALLATION', 'MAINTENANCE', 'REFUND');

-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('INFO', 'WARNING', 'ERROR', 'SUCCESS');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone" TEXT,
    "avatar" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'SELLER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "last_login" TIMESTAMP(3),
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "settings" JSONB,
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "language" TEXT NOT NULL DEFAULT 'es',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "user_agent" TEXT,
    "ip_address" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_name" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "alternative_phone" TEXT,
    "address" TEXT,
    "district" TEXT,
    "province" TEXT,
    "department" TEXT,
    "document_number" TEXT,
    "document_type" "public"."DocumentType",
    "customer_type" "public"."CustomerType" NOT NULL DEFAULT 'INDIVIDUAL',
    "service_type" TEXT,
    "contract_date" TIMESTAMP(3),
    "status" "public"."CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "credit_limit" DECIMAL(10,2),
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIA',
    "source" TEXT,
    "assigned_seller" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "technician_id" TEXT,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_contacts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."technicians" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "document_number" TEXT,
    "user_id" TEXT,
    "specialties" JSONB,
    "certifications" JSONB,
    "experience" INTEGER,
    "hourly_rate" DECIMAL(8,2),
    "work_schedule" JSONB,
    "is_external" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rating" DECIMAL(3,2),
    "total_jobs" INTEGER NOT NULL DEFAULT 0,
    "district" TEXT NOT NULL,
    "province" TEXT DEFAULT 'Huánuco',
    "department" TEXT DEFAULT 'Huánuco',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."technician_ratings" (
    "id" TEXT NOT NULL,
    "technician_id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technician_ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plans" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL DEFAULT concat('PLAN-', to_char(nextval('plan_seq'), 'FM0000')),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "public"."PlanCategory" NOT NULL DEFAULT 'INTERNET',
    "subcategory" TEXT,
    "download_speed" DECIMAL(10,2),
    "upload_speed" DECIMAL(10,2),
    "data_limit" INTEGER,
    "monthly_price" DECIMAL(10,2) NOT NULL,
    "setup_fee" DECIMAL(10,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "is_promotional" BOOLEAN NOT NULL DEFAULT false,
    "sla_level" "public"."SLALevel" NOT NULL DEFAULT 'STANDARD',
    "support_hours" TEXT,
    "features" JSONB,
    "restrictions" JSONB,
    "target_audience" JSONB,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_plans" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "status" "public"."PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "change_type" "public"."PlanChangeType",
    "change_reason" TEXT,
    "previous_plan_id" TEXT,
    "notes" TEXT,
    "changed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."network_devices" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "deviceType" "public"."NetworkDeviceType" NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "ip_address" TEXT NOT NULL,
    "port" INTEGER DEFAULT 22,
    "connection_type" "public"."ConnectionType" NOT NULL DEFAULT 'SSH',
    "location" TEXT,
    "coordinates" TEXT,
    "status" "public"."DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_seen" TIMESTAMP(3),
    "uptime" INTEGER,
    "firmware" TEXT,
    "serial_number" TEXT,
    "mac_address" TEXT,
    "monitoring_enabled" BOOLEAN NOT NULL DEFAULT true,
    "alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "network_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_credentials" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "community" TEXT,
    "privateKey" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_metrics" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "cpu_usage" DECIMAL(5,2),
    "memory_usage" DECIMAL(5,2),
    "temperature" DECIMAL(5,2),
    "uptime" INTEGER,
    "bytes_in" BIGINT,
    "bytes_out" BIGINT,
    "packets_in" BIGINT,
    "packets_out" BIGINT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."device_alerts" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "alertType" "public"."AlertType" NOT NULL,
    "severity" "public"."AlertSeverity" NOT NULL DEFAULT 'WARNING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "threshold" DECIMAL(10,2),
    "current_value" DECIMAL(10,2),
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pppoe_accounts" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "algorithm" TEXT NOT NULL DEFAULT 'aes-256-gcm',
    "profile" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "bytes_in" BIGINT DEFAULT 0,
    "bytes_out" BIGINT DEFAULT 0,
    "last_login" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pppoe_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."queue_rules" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "plan_id" TEXT,
    "name" TEXT NOT NULL,
    "target_addr" TEXT NOT NULL,
    "max_upload" TEXT NOT NULL,
    "max_download" TEXT NOT NULL,
    "max_upload_kbps" INTEGER,
    "max_download_kbps" INTEGER,
    "priority" INTEGER DEFAULT 8,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "queue_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_accounts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(10,2),
    "status" "public"."BillingStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspended_at" TIMESTAMP(3),
    "last_payment_date" TIMESTAMP(3),
    "billing_cycle" INTEGER NOT NULL DEFAULT 1,
    "auto_suspend" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" VARCHAR(32) NOT NULL DEFAULT concat('INV-', to_char(nextval('invoice_seq'),'FM000000')),
    "customer_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "balance_due" DECIMAL(10,2) NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "plan_id" TEXT,
    "ticket_id" TEXT,

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "payment_number" VARCHAR(32) NOT NULL DEFAULT concat('PAY-', to_char(nextval('payment_seq'),'FM000000')),
    "customer_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "invoice_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PEN',
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "reference" TEXT,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_date" TIMESTAMP(3) NOT NULL,
    "processed_date" TIMESTAMP(3),
    "notes" TEXT,
    "receipt_url" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ledger_entries" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "type" "public"."LedgerType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "invoice_id" TEXT,
    "payment_id" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."message_logs" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "ticket_id" TEXT,
    "direction" "public"."MessageDirection" NOT NULL DEFAULT 'OUTBOUND',
    "channel" "public"."MessageChannel" NOT NULL,
    "phone_number" TEXT,
    "email" TEXT,
    "message_type" "public"."MessageType" NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "template_id" TEXT,
    "status" "public"."MessageStatus" NOT NULL DEFAULT 'PENDING',
    "external_id" TEXT,
    "provider_id" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "assigned_technician" TEXT,
    "assigned_to" TEXT,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."TicketCategory" NOT NULL,
    "subcategory" TEXT,
    "priority" "public"."Priority" NOT NULL DEFAULT 'MEDIA',
    "status" "public"."TicketStatus" NOT NULL DEFAULT 'PENDIENTE',
    "scheduled_date" TIMESTAMP(3),
    "started_date" TIMESTAMP(3),
    "completed_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "estimated_cost" DECIMAL(10,2),
    "actual_cost" DECIMAL(10,2),
    "estimated_hours" DECIMAL(5,2),
    "actual_hours" DECIMAL(5,2),
    "service_address" TEXT,
    "service_district" TEXT,
    "gps_coordinates" TEXT,
    "notes" TEXT,
    "internal_notes" TEXT,
    "client_notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sla_level" "public"."SLALevel" NOT NULL DEFAULT 'STANDARD',
    "response_time" INTEGER,
    "resolution_time" INTEGER,
    "escalation_level" INTEGER NOT NULL DEFAULT 0,
    "escalated_to" TEXT,
    "escalation_reason" TEXT,
    "related_device_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."service_contracts" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "contract_number" VARCHAR(32) NOT NULL DEFAULT concat('CTR-', to_char(nextval('contract_seq'),'FM000000')),
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "service_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."internal_receipts" (
    "id" TEXT NOT NULL,
    "receipt_number" VARCHAR(32) NOT NULL DEFAULT concat('REC-', to_char(nextval('receipt_seq'),'FM000000')),
    "customer_id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "invoice_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "receipt_type" "public"."ReceiptType" NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_history" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "old_value" JSONB,
    "new_value" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ticket_attachments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."work_logs" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hours_spent" DECIMAL(5,2) NOT NULL,
    "work_date" TIMESTAMP(3) NOT NULL,
    "billable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "public"."users"("role");

-- CreateIndex
CREATE INDEX "users_active_idx" ON "public"."users"("active");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "public"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "public"."refresh_tokens"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "public"."customers"("code");

-- CreateIndex
CREATE INDEX "customers_code_idx" ON "public"."customers"("code");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "public"."customers"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "public"."customers"("phone");

-- CreateIndex
CREATE INDEX "customers_document_number_idx" ON "public"."customers"("document_number");

-- CreateIndex
CREATE INDEX "customers_status_idx" ON "public"."customers"("status");

-- CreateIndex
CREATE INDEX "customers_assigned_seller_idx" ON "public"."customers"("assigned_seller");

-- CreateIndex
CREATE INDEX "customers_district_idx" ON "public"."customers"("district");

-- CreateIndex
CREATE INDEX "customers_technician_id_idx" ON "public"."customers"("technician_id");

-- CreateIndex
CREATE INDEX "customers_district_status_idx" ON "public"."customers"("district", "status");

-- CreateIndex
CREATE INDEX "customers_status_created_at_idx" ON "public"."customers"("status", "created_at");

-- CreateIndex
CREATE INDEX "customers_customer_type_status_idx" ON "public"."customers"("customer_type", "status");

-- CreateIndex
CREATE INDEX "customer_contacts_customer_id_idx" ON "public"."customer_contacts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_code_key" ON "public"."technicians"("code");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_user_id_key" ON "public"."technicians"("user_id");

-- CreateIndex
CREATE INDEX "technicians_code_idx" ON "public"."technicians"("code");

-- CreateIndex
CREATE INDEX "technicians_phone_idx" ON "public"."technicians"("phone");

-- CreateIndex
CREATE INDEX "technicians_active_idx" ON "public"."technicians"("active");

-- CreateIndex
CREATE INDEX "technicians_user_id_idx" ON "public"."technicians"("user_id");

-- CreateIndex
CREATE INDEX "technicians_district_idx" ON "public"."technicians"("district");

-- CreateIndex
CREATE INDEX "technicians_active_district_idx" ON "public"."technicians"("active", "district");

-- CreateIndex
CREATE UNIQUE INDEX "technicians_district_active_key" ON "public"."technicians"("district", "active");

-- CreateIndex
CREATE INDEX "technician_ratings_technician_id_idx" ON "public"."technician_ratings"("technician_id");

-- CreateIndex
CREATE UNIQUE INDEX "technician_ratings_ticket_id_key" ON "public"."technician_ratings"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "public"."plans"("code");

-- CreateIndex
CREATE INDEX "plans_code_idx" ON "public"."plans"("code");

-- CreateIndex
CREATE INDEX "plans_category_idx" ON "public"."plans"("category");

-- CreateIndex
CREATE INDEX "plans_active_idx" ON "public"."plans"("active");

-- CreateIndex
CREATE INDEX "plans_subcategory_idx" ON "public"."plans"("subcategory");

-- CreateIndex
CREATE INDEX "customer_plans_customer_id_idx" ON "public"."customer_plans"("customer_id");

-- CreateIndex
CREATE INDEX "customer_plans_plan_id_idx" ON "public"."customer_plans"("plan_id");

-- CreateIndex
CREATE INDEX "customer_plans_status_idx" ON "public"."customer_plans"("status");

-- CreateIndex
CREATE INDEX "customer_plans_start_date_idx" ON "public"."customer_plans"("start_date");

-- CreateIndex
CREATE UNIQUE INDEX "network_devices_code_key" ON "public"."network_devices"("code");

-- CreateIndex
CREATE INDEX "network_devices_code_idx" ON "public"."network_devices"("code");

-- CreateIndex
CREATE INDEX "network_devices_ip_address_idx" ON "public"."network_devices"("ip_address");

-- CreateIndex
CREATE INDEX "network_devices_status_idx" ON "public"."network_devices"("status");

-- CreateIndex
CREATE INDEX "network_devices_deviceType_idx" ON "public"."network_devices"("deviceType");

-- CreateIndex
CREATE INDEX "device_credentials_device_id_idx" ON "public"."device_credentials"("device_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_credentials_device_id_type_key" ON "public"."device_credentials"("device_id", "type");

-- CreateIndex
CREATE INDEX "device_metrics_timestamp_idx" ON "public"."device_metrics"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "device_metrics_device_id_timestamp_key" ON "public"."device_metrics"("device_id", "timestamp");

-- CreateIndex
CREATE INDEX "device_alerts_device_id_idx" ON "public"."device_alerts"("device_id");

-- CreateIndex
CREATE INDEX "device_alerts_resolved_idx" ON "public"."device_alerts"("resolved");

-- CreateIndex
CREATE INDEX "device_alerts_severity_idx" ON "public"."device_alerts"("severity");

-- CreateIndex
CREATE INDEX "device_alerts_created_at_idx" ON "public"."device_alerts"("created_at");

-- CreateIndex
CREATE INDEX "pppoe_accounts_customer_id_idx" ON "public"."pppoe_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "pppoe_accounts_active_idx" ON "public"."pppoe_accounts"("active");

-- CreateIndex
CREATE UNIQUE INDEX "pppoe_accounts_device_id_username_key" ON "public"."pppoe_accounts"("device_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "pppoe_accounts_device_id_customer_id_key" ON "public"."pppoe_accounts"("device_id", "customer_id");

-- CreateIndex
CREATE INDEX "queue_rules_device_id_idx" ON "public"."queue_rules"("device_id");

-- CreateIndex
CREATE INDEX "queue_rules_customer_id_idx" ON "public"."queue_rules"("customer_id");

-- CreateIndex
CREATE INDEX "queue_rules_active_idx" ON "public"."queue_rules"("active");

-- CreateIndex
CREATE INDEX "queue_rules_max_upload_kbps_idx" ON "public"."queue_rules"("max_upload_kbps");

-- CreateIndex
CREATE INDEX "queue_rules_max_download_kbps_idx" ON "public"."queue_rules"("max_download_kbps");

-- CreateIndex
CREATE UNIQUE INDEX "queue_rules_device_id_target_addr_key" ON "public"."queue_rules"("device_id", "target_addr");

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_customer_id_key" ON "public"."billing_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "billing_accounts_customer_id_idx" ON "public"."billing_accounts"("customer_id");

-- CreateIndex
CREATE INDEX "billing_accounts_status_idx" ON "public"."billing_accounts"("status");

-- CreateIndex
CREATE INDEX "billing_accounts_balance_idx" ON "public"."billing_accounts"("balance");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "public"."invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_invoice_number_idx" ON "public"."invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_customer_id_idx" ON "public"."invoices"("customer_id");

-- CreateIndex
CREATE INDEX "invoices_billing_account_id_idx" ON "public"."invoices"("billing_account_id");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "public"."invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_due_date_idx" ON "public"."invoices"("due_date");

-- CreateIndex
CREATE INDEX "invoices_status_due_date_idx" ON "public"."invoices"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_customer_id_period_start_period_end_key" ON "public"."invoices"("customer_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "public"."invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_plan_id_idx" ON "public"."invoice_items"("plan_id");

-- CreateIndex
CREATE INDEX "invoice_items_ticket_id_idx" ON "public"."invoice_items"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_number_key" ON "public"."payments"("payment_number");

-- CreateIndex
CREATE INDEX "payments_customer_id_idx" ON "public"."payments"("customer_id");

-- CreateIndex
CREATE INDEX "payments_billing_account_id_idx" ON "public"."payments"("billing_account_id");

-- CreateIndex
CREATE INDEX "payments_invoice_id_idx" ON "public"."payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "public"."payments"("status");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "public"."payments"("payment_date");

-- CreateIndex
CREATE INDEX "payments_customer_id_payment_date_idx" ON "public"."payments"("customer_id", "payment_date");

-- CreateIndex
CREATE INDEX "payments_payment_method_status_idx" ON "public"."payments"("payment_method", "status");

-- CreateIndex
CREATE INDEX "payments_status_payment_date_idx" ON "public"."payments"("status", "payment_date");

-- CreateIndex
CREATE INDEX "ledger_entries_customer_id_idx" ON "public"."ledger_entries"("customer_id");

-- CreateIndex
CREATE INDEX "ledger_entries_billing_account_id_idx" ON "public"."ledger_entries"("billing_account_id");

-- CreateIndex
CREATE INDEX "ledger_entries_transaction_date_idx" ON "public"."ledger_entries"("transaction_date");

-- CreateIndex
CREATE INDEX "ledger_entries_type_idx" ON "public"."ledger_entries"("type");

-- CreateIndex
CREATE INDEX "message_logs_customer_id_idx" ON "public"."message_logs"("customer_id");

-- CreateIndex
CREATE INDEX "message_logs_channel_idx" ON "public"."message_logs"("channel");

-- CreateIndex
CREATE INDEX "message_logs_status_idx" ON "public"."message_logs"("status");

-- CreateIndex
CREATE INDEX "message_logs_direction_idx" ON "public"."message_logs"("direction");

-- CreateIndex
CREATE INDEX "message_logs_message_type_idx" ON "public"."message_logs"("message_type");

-- CreateIndex
CREATE INDEX "message_logs_created_at_idx" ON "public"."message_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "public"."tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_ticket_number_idx" ON "public"."tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_customer_id_idx" ON "public"."tickets"("customer_id");

-- CreateIndex
CREATE INDEX "tickets_assigned_technician_idx" ON "public"."tickets"("assigned_technician");

-- CreateIndex
CREATE INDEX "tickets_assigned_to_idx" ON "public"."tickets"("assigned_to");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "public"."tickets"("status");

-- CreateIndex
CREATE INDEX "tickets_category_idx" ON "public"."tickets"("category");

-- CreateIndex
CREATE INDEX "tickets_priority_idx" ON "public"."tickets"("priority");

-- CreateIndex
CREATE INDEX "tickets_created_at_idx" ON "public"."tickets"("created_at");

-- CreateIndex
CREATE INDEX "tickets_due_date_idx" ON "public"."tickets"("due_date");

-- CreateIndex
CREATE INDEX "tickets_customer_id_status_idx" ON "public"."tickets"("customer_id", "status");

-- CreateIndex
CREATE INDEX "tickets_assigned_technician_status_idx" ON "public"."tickets"("assigned_technician", "status");

-- CreateIndex
CREATE INDEX "tickets_status_priority_idx" ON "public"."tickets"("status", "priority");

-- CreateIndex
CREATE INDEX "tickets_created_at_status_idx" ON "public"."tickets"("created_at", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_contracts_contract_number_key" ON "public"."service_contracts"("contract_number");

-- CreateIndex
CREATE INDEX "service_contracts_customer_id_idx" ON "public"."service_contracts"("customer_id");

-- CreateIndex
CREATE INDEX "service_contracts_plan_id_idx" ON "public"."service_contracts"("plan_id");

-- CreateIndex
CREATE INDEX "service_contracts_status_idx" ON "public"."service_contracts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "internal_receipts_receipt_number_key" ON "public"."internal_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "internal_receipts_customer_id_idx" ON "public"."internal_receipts"("customer_id");

-- CreateIndex
CREATE INDEX "internal_receipts_ticket_id_idx" ON "public"."internal_receipts"("ticket_id");

-- CreateIndex
CREATE INDEX "internal_receipts_receipt_type_idx" ON "public"."internal_receipts"("receipt_type");

-- CreateIndex
CREATE INDEX "ticket_history_ticket_id_idx" ON "public"."ticket_history"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_history_created_at_idx" ON "public"."ticket_history"("created_at");

-- CreateIndex
CREATE INDEX "ticket_attachments_ticket_id_idx" ON "public"."ticket_attachments"("ticket_id");

-- CreateIndex
CREATE INDEX "work_logs_ticket_id_idx" ON "public"."work_logs"("ticket_id");

-- CreateIndex
CREATE INDEX "work_logs_user_id_idx" ON "public"."work_logs"("user_id");

-- CreateIndex
CREATE INDEX "work_logs_work_date_idx" ON "public"."work_logs"("work_date");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "public"."notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_read_idx" ON "public"."notifications"("read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "public"."notifications"("created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "public"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "public"."audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "public"."audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customers" ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technicians" ADD CONSTRAINT "technicians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technician_ratings" ADD CONSTRAINT "technician_ratings_technician_id_fkey" FOREIGN KEY ("technician_id") REFERENCES "public"."technicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."technician_ratings" ADD CONSTRAINT "technician_ratings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plans" ADD CONSTRAINT "plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_plans" ADD CONSTRAINT "customer_plans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_plans" ADD CONSTRAINT "customer_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."network_devices" ADD CONSTRAINT "network_devices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."device_credentials" ADD CONSTRAINT "device_credentials_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."network_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."device_metrics" ADD CONSTRAINT "device_metrics_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."network_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."device_alerts" ADD CONSTRAINT "device_alerts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."network_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pppoe_accounts" ADD CONSTRAINT "pppoe_accounts_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."network_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pppoe_accounts" ADD CONSTRAINT "pppoe_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."queue_rules" ADD CONSTRAINT "queue_rules_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."network_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."queue_rules" ADD CONSTRAINT "queue_rules_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."queue_rules" ADD CONSTRAINT "queue_rules_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_accounts" ADD CONSTRAINT "billing_accounts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments" ADD CONSTRAINT "payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_logs" ADD CONSTRAINT "message_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_logs" ADD CONSTRAINT "message_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_assigned_technician_fkey" FOREIGN KEY ("assigned_technician") REFERENCES "public"."technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tickets" ADD CONSTRAINT "tickets_related_device_id_fkey" FOREIGN KEY ("related_device_id") REFERENCES "public"."network_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_contracts" ADD CONSTRAINT "service_contracts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."service_contracts" ADD CONSTRAINT "service_contracts_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_receipts" ADD CONSTRAINT "internal_receipts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_receipts" ADD CONSTRAINT "internal_receipts_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_receipts" ADD CONSTRAINT "internal_receipts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."internal_receipts" ADD CONSTRAINT "internal_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_history" ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_history" ADD CONSTRAINT "ticket_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ticket_attachments" ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_logs" ADD CONSTRAINT "work_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."work_logs" ADD CONSTRAINT "work_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;