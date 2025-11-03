/*
  Warnings:

  - The `technician_id` column on the `customers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `technician_id` on the `technician_ratings` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `created_by` to the `technicians` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."AdvancePaymentStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."AdvanceMonthlyStatus" AS ENUM ('PENDING', 'APPLIED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "public"."NetworkDeviceType" ADD VALUE 'MIKROTIK_ROUTER';

-- AlterEnum
ALTER TYPE "public"."PlanChangeType" ADD VALUE 'NEW';

-- DropForeignKey
ALTER TABLE "public"."customers" DROP CONSTRAINT "customers_created_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."customers" DROP CONSTRAINT "customers_technician_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."technician_ratings" DROP CONSTRAINT "technician_ratings_technician_id_fkey";

-- DropIndex
DROP INDEX "public"."message_logs_direction_idx";

-- DropIndex
DROP INDEX "public"."message_logs_message_type_idx";

-- AlterTable
ALTER TABLE "public"."customers" ADD COLUMN     "primary_device_id" TEXT,
DROP COLUMN "technician_id",
ADD COLUMN     "technician_id" UUID;

-- AlterTable
ALTER TABLE "public"."device_credentials" ADD COLUMN     "authTag" TEXT;

-- AlterTable
ALTER TABLE "public"."message_logs" ADD COLUMN     "invoice_id" TEXT;

-- AlterTable
ALTER TABLE "public"."network_devices" ADD COLUMN     "active_connections" INTEGER DEFAULT 0,
ADD COLUMN     "api_port" INTEGER DEFAULT 8729,
ADD COLUMN     "cpu_load" DECIMAL(5,2),
ADD COLUMN     "department" TEXT DEFAULT 'Huánuco',
ADD COLUMN     "district" TEXT,
ADD COLUMN     "memory_usage" DECIMAL(5,2),
ADD COLUMN     "province" TEXT DEFAULT 'Huánuco',
ADD COLUMN     "total_customers" INTEGER DEFAULT 0,
ADD COLUMN     "use_tls" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "port" SET DEFAULT 8728;

-- AlterTable
ALTER TABLE "public"."plans" ADD COLUMN     "mikrotik_profile_name" TEXT;

-- AlterTable
ALTER TABLE "public"."pppoe_accounts" ADD COLUMN     "authTag" TEXT;

-- AlterTable
ALTER TABLE "public"."technician_ratings" DROP COLUMN "technician_id",
ADD COLUMN     "technician_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."technicians" ADD COLUMN     "created_by" TEXT NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."router_logs" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "username" TEXT,
    "success" BOOLEAN NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "router_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."plan_network_devices" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "normal_profile" TEXT,
    "cut_profile" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_network_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."advance_payments" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "billing_account_id" TEXT NOT NULL,
    "total_amount" DECIMAL(10,2) NOT NULL,
    "months_count" INTEGER NOT NULL,
    "amount_per_month" DECIMAL(10,2) NOT NULL,
    "payment_method" "public"."PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "status" "public"."AdvancePaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "payment_date" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."advance_monthly_payments" (
    "id" TEXT NOT NULL,
    "advance_payment_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "public"."AdvanceMonthlyStatus" NOT NULL DEFAULT 'PENDING',
    "applied_at" TIMESTAMP(3),
    "applied_to_invoice_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advance_monthly_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "router_logs_device_id_idx" ON "public"."router_logs"("device_id");

-- CreateIndex
CREATE INDEX "router_logs_action_idx" ON "public"."router_logs"("action");

-- CreateIndex
CREATE INDEX "router_logs_success_idx" ON "public"."router_logs"("success");

-- CreateIndex
CREATE INDEX "router_logs_created_at_idx" ON "public"."router_logs"("created_at");

-- CreateIndex
CREATE INDEX "plan_network_devices_plan_id_idx" ON "public"."plan_network_devices"("plan_id");

-- CreateIndex
CREATE INDEX "plan_network_devices_device_id_idx" ON "public"."plan_network_devices"("device_id");

-- CreateIndex
CREATE INDEX "advance_payments_customer_id_idx" ON "public"."advance_payments"("customer_id");

-- CreateIndex
CREATE INDEX "advance_payments_billing_account_id_idx" ON "public"."advance_payments"("billing_account_id");

-- CreateIndex
CREATE INDEX "advance_payments_status_idx" ON "public"."advance_payments"("status");

-- CreateIndex
CREATE INDEX "advance_payments_payment_date_idx" ON "public"."advance_payments"("payment_date");

-- CreateIndex
CREATE INDEX "advance_payments_customer_id_payment_date_idx" ON "public"."advance_payments"("customer_id", "payment_date");

-- CreateIndex
CREATE INDEX "advance_monthly_payments_advance_payment_id_idx" ON "public"."advance_monthly_payments"("advance_payment_id");

-- CreateIndex
CREATE INDEX "advance_monthly_payments_month_year_idx" ON "public"."advance_monthly_payments"("month", "year");

-- CreateIndex
CREATE INDEX "advance_monthly_payments_status_idx" ON "public"."advance_monthly_payments"("status");

-- CreateIndex
CREATE INDEX "advance_monthly_payments_applied_at_idx" ON "public"."advance_monthly_payments"("applied_at");

-- CreateIndex
CREATE UNIQUE INDEX "advance_monthly_payments_advance_payment_id_month_year_key" ON "public"."advance_monthly_payments"("advance_payment_id", "month", "year");

-- CreateIndex
CREATE INDEX "customers_technician_id_idx" ON "public"."customers"("technician_id");

-- CreateIndex
CREATE INDEX "network_devices_district_idx" ON "public"."network_devices"("district");

-- CreateIndex
CREATE INDEX "network_devices_district_status_idx" ON "public"."network_devices"("district", "status");

-- CreateIndex
CREATE INDEX "network_devices_province_district_idx" ON "public"."network_devices"("province", "district");

-- CreateIndex
CREATE INDEX "technician_ratings_technician_id_idx" ON "public"."technician_ratings"("technician_id");

-- AddForeignKey
ALTER TABLE "public"."router_logs" ADD CONSTRAINT "router_logs_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."network_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_network_devices" ADD CONSTRAINT "plan_network_devices_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."plan_network_devices" ADD CONSTRAINT "plan_network_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."network_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advance_payments" ADD CONSTRAINT "advance_payments_billing_account_id_fkey" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advance_payments" ADD CONSTRAINT "advance_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advance_payments" ADD CONSTRAINT "advance_payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advance_monthly_payments" ADD CONSTRAINT "advance_monthly_payments_advance_payment_id_fkey" FOREIGN KEY ("advance_payment_id") REFERENCES "public"."advance_payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."advance_monthly_payments" ADD CONSTRAINT "advance_monthly_payments_applied_to_invoice_id_fkey" FOREIGN KEY ("applied_to_invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."message_logs" ADD CONSTRAINT "message_logs_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
