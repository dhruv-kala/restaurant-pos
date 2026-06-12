CREATE TYPE "employment_type" AS ENUM (
  'FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERN'
);
CREATE TYPE "employee_status" AS ENUM (
  'ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED'
);
CREATE TYPE "employee_department" AS ENUM (
  'OPERATIONS', 'KITCHEN', 'SERVICE', 'CASHIER', 'MANAGEMENT',
  'INVENTORY', 'ADMINISTRATION'
);
CREATE TYPE "employee_gender" AS ENUM (
  'MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'
);
CREATE TYPE "attendance_status" AS ENUM (
  'PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'LEAVE'
);

CREATE TABLE "employee_profiles" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "role_id" UUID NOT NULL,
  "employee_code" CITEXT NOT NULL,
  "first_name" VARCHAR(100) NOT NULL,
  "last_name" VARCHAR(100),
  "phone" VARCHAR(20),
  "email" CITEXT,
  "gender" "employee_gender",
  "date_of_birth" DATE,
  "date_of_joining" DATE NOT NULL,
  "designation" VARCHAR(120) NOT NULL,
  "department" "employee_department" NOT NULL,
  "employment_type" "employment_type" NOT NULL,
  "salary_minor" INTEGER,
  "reporting_manager_id" UUID,
  "profile_image_url" VARCHAR(500),
  "preferred_language" VARCHAR(35) NOT NULL DEFAULT 'en',
  "emergency_contact_name" VARCHAR(160),
  "emergency_contact_phone" VARCHAR(20),
  "status" "employee_status" NOT NULL DEFAULT 'ACTIVE',
  "created_by_user_id" UUID NOT NULL,
  "updated_by_user_id" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_profiles_salary_check" CHECK (
    "salary_minor" IS NULL OR "salary_minor" >= 0
  ),
  CONSTRAINT "employee_profiles_manager_check" CHECK (
    "reporting_manager_id" IS NULL OR "reporting_manager_id" <> "id"
  )
);

CREATE TABLE "shifts" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "start_time" TIME(0) NOT NULL,
  "end_time" TIME(0) NOT NULL,
  "break_minutes" INTEGER NOT NULL DEFAULT 0,
  "is_night_shift" BOOLEAN NOT NULL DEFAULT false,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "shifts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shifts_break_check" CHECK ("break_minutes" BETWEEN 0 AND 720)
);

CREATE TABLE "employee_shift_assignments" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "shift_id" UUID NOT NULL,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "assigned_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_shift_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_shift_assignments_dates_check" CHECK (
    "effective_to" IS NULL OR "effective_to" >= "effective_from"
  )
);

CREATE TABLE "attendance" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "attendance_date" DATE NOT NULL,
  "business_date" DATE NOT NULL,
  "check_in_time" TIMESTAMPTZ(3),
  "check_out_time" TIMESTAMPTZ(3),
  "worked_minutes" INTEGER NOT NULL DEFAULT 0,
  "status" "attendance_status" NOT NULL DEFAULT 'PRESENT',
  "remarks" VARCHAR(500),
  "device_id" VARCHAR(120),
  "location_captured" JSONB,
  "recorded_by_user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "attendance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attendance_minutes_check" CHECK ("worked_minutes" >= 0),
  CONSTRAINT "attendance_times_check" CHECK (
    "check_out_time" IS NULL OR (
      "check_in_time" IS NOT NULL AND "check_out_time" >= "check_in_time"
    )
  )
);

CREATE TABLE "employee_performance" (
  "id" UUID NOT NULL DEFAULT app_uuid_v7(),
  "tenant_id" UUID NOT NULL,
  "outlet_id" UUID NOT NULL,
  "employee_id" UUID NOT NULL,
  "business_date" DATE NOT NULL,
  "orders_handled" INTEGER NOT NULL DEFAULT 0,
  "sales_amount_minor" INTEGER NOT NULL DEFAULT 0,
  "customers_served" INTEGER NOT NULL DEFAULT 0,
  "average_ticket_size_minor" INTEGER NOT NULL DEFAULT 0,
  "items_processed" INTEGER NOT NULL DEFAULT 0,
  "bills_processed" INTEGER NOT NULL DEFAULT 0,
  "payments_collected_minor" INTEGER NOT NULL DEFAULT 0,
  "tips_collected_minor" INTEGER NOT NULL DEFAULT 0,
  "discounts_given_minor" INTEGER NOT NULL DEFAULT 0,
  "refunds_processed" INTEGER NOT NULL DEFAULT 0,
  "average_prep_minutes" DECIMAL(8,2) NOT NULL DEFAULT 0,
  "delayed_orders" INTEGER NOT NULL DEFAULT 0,
  "customer_rating" DECIMAL(3,2),
  "generated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "employee_performance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_performance_nonnegative_check" CHECK (
    "orders_handled" >= 0 AND "sales_amount_minor" >= 0
    AND "customers_served" >= 0 AND "average_ticket_size_minor" >= 0
    AND "items_processed" >= 0 AND "bills_processed" >= 0
    AND "payments_collected_minor" >= 0 AND "tips_collected_minor" >= 0
    AND "discounts_given_minor" >= 0 AND "refunds_processed" >= 0
    AND "average_prep_minutes" >= 0 AND "delayed_orders" >= 0
  ),
  CONSTRAINT "employee_performance_rating_check" CHECK (
    "customer_rating" IS NULL OR "customer_rating" BETWEEN 0 AND 5
  )
);

CREATE UNIQUE INDEX "employee_profiles_tenant_id_id_key"
  ON "employee_profiles"("tenant_id", "id");
CREATE UNIQUE INDEX "employee_profiles_tenant_code_key"
  ON "employee_profiles"("tenant_id", "employee_code");
CREATE UNIQUE INDEX "employee_profiles_tenant_user_key"
  ON "employee_profiles"("tenant_id", "user_id");
CREATE INDEX "employee_profiles_directory_idx"
  ON "employee_profiles"("tenant_id", "outlet_id", "status", "deleted_at");
CREATE INDEX "employee_profiles_department_idx"
  ON "employee_profiles"("tenant_id", "department", "designation");
CREATE INDEX "employee_profiles_manager_idx"
  ON "employee_profiles"("tenant_id", "reporting_manager_id");

CREATE UNIQUE INDEX "shifts_tenant_id_id_key" ON "shifts"("tenant_id", "id");
CREATE UNIQUE INDEX "shifts_tenant_outlet_name_key"
  ON "shifts"("tenant_id", "outlet_id", "name");
CREATE INDEX "shifts_active_idx"
  ON "shifts"("tenant_id", "outlet_id", "is_active");

CREATE UNIQUE INDEX "employee_shift_assignments_tenant_id_id_key"
  ON "employee_shift_assignments"("tenant_id", "id");
CREATE INDEX "employee_shift_assignments_employee_idx"
  ON "employee_shift_assignments"(
    "tenant_id", "outlet_id", "employee_id", "effective_from", "effective_to"
  );
CREATE INDEX "employee_shift_assignments_shift_idx"
  ON "employee_shift_assignments"(
    "tenant_id", "shift_id", "effective_from", "effective_to"
  );

CREATE UNIQUE INDEX "attendance_tenant_id_id_key"
  ON "attendance"("tenant_id", "id");
CREATE UNIQUE INDEX "attendance_employee_day_key"
  ON "attendance"("tenant_id", "employee_id", "attendance_date");
CREATE INDEX "attendance_reporting_idx"
  ON "attendance"("tenant_id", "business_date", "outlet_id", "status");
CREATE INDEX "attendance_employee_idx"
  ON "attendance"("tenant_id", "employee_id", "business_date");

CREATE UNIQUE INDEX "employee_performance_tenant_id_id_key"
  ON "employee_performance"("tenant_id", "id");
CREATE UNIQUE INDEX "employee_performance_employee_day_key"
  ON "employee_performance"("tenant_id", "employee_id", "business_date");
CREATE INDEX "employee_performance_reporting_idx"
  ON "employee_performance"(
    "tenant_id", "business_date", "outlet_id", "sales_amount_minor"
  );

ALTER TABLE "employee_profiles"
  ADD CONSTRAINT "employee_profiles_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_profiles_outlet_fkey"
    FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_profiles_user_fkey"
    FOREIGN KEY ("user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_profiles_role_fkey"
    FOREIGN KEY ("tenant_id", "role_id") REFERENCES "roles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_profiles_manager_fkey"
    FOREIGN KEY ("tenant_id", "reporting_manager_id") REFERENCES "employee_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_profiles_created_by_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_profiles_updated_by_fkey"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "shifts"
  ADD CONSTRAINT "shifts_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "shifts_outlet_fkey"
    FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_shift_assignments"
  ADD CONSTRAINT "employee_shift_assignments_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_shift_assignments_outlet_fkey"
    FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_shift_assignments_employee_fkey"
    FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "employee_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_shift_assignments_shift_fkey"
    FOREIGN KEY ("tenant_id", "shift_id") REFERENCES "shifts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_shift_assignments_assigned_by_fkey"
    FOREIGN KEY ("assigned_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance"
  ADD CONSTRAINT "attendance_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_outlet_fkey"
    FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_employee_fkey"
    FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "employee_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "attendance_recorded_by_fkey"
    FOREIGN KEY ("recorded_by_user_id") REFERENCES "user_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_performance"
  ADD CONSTRAINT "employee_performance_tenant_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_performance_outlet_fkey"
    FOREIGN KEY ("tenant_id", "outlet_id") REFERENCES "outlets"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "employee_performance_employee_fkey"
    FOREIGN KEY ("tenant_id", "employee_id") REFERENCES "employee_profiles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
DECLARE table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'employee_profiles', 'shifts', 'employee_shift_assignments',
    'attendance', 'employee_performance'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (app_tenant_access_allowed(tenant_id)) WITH CHECK (app_tenant_access_allowed(tenant_id))',
      table_name || '_tenant_isolation', table_name
    );
  END LOOP;
END $$;
