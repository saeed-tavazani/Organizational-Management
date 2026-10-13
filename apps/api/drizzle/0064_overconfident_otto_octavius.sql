CREATE TABLE "attendance_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"resource_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_bank" (
	"user_id" text PRIMARY KEY NOT NULL,
	"holder" text NOT NULL,
	"iban" text NOT NULL,
	"bank" text DEFAULT '' NOT NULL,
	"card" text DEFAULT '' NOT NULL,
	"account" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_employee" (
	"user_id" text PRIMARY KEY NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"project_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"project_name" text NOT NULL,
	"workspace_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"hourly_rate" integer,
	"policy" jsonb NOT NULL,
	"review_status" text DEFAULT 'valid' NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_rate" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"approved_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_request" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"effective_at" timestamp with time zone NOT NULL,
	"policy" jsonb NOT NULL,
	"grants" jsonb NOT NULL,
	"changed_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance_audit" ADD CONSTRAINT "attendance_audit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_bank" ADD CONSTRAINT "attendance_bank_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_employee" ADD CONSTRAINT "attendance_employee_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_entry" ADD CONSTRAINT "attendance_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_rate" ADD CONSTRAINT "attendance_rate_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_request" ADD CONSTRAINT "attendance_request_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_audit_user_created_idx" ON "attendance_audit" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "attendance_entry_user_start_idx" ON "attendance_entry" USING btree ("user_id","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_entry_one_running_idx" ON "attendance_entry" USING btree ("user_id") WHERE "attendance_entry"."end_time" IS NULL AND "attendance_entry"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "attendance_rate_user_effective_idx" ON "attendance_rate" USING btree ("user_id","effective_at");--> statement-breakpoint
CREATE INDEX "attendance_request_user_status_idx" ON "attendance_request" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "attendance_settings_effective_idx" ON "attendance_settings" USING btree ("effective_at");