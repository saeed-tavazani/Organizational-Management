CREATE TABLE "phone_recovery_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"administrator_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
