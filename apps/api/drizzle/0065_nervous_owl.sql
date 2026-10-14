CREATE TABLE "bale_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"phone_number" text NOT NULL,
	"kind" text NOT NULL,
	"resource_id" text,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_challenge" (
	"id" text PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"purpose" text NOT NULL,
	"user_id" text,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "phone_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invitation" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone_number_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_preference" ADD COLUMN "bale_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "user_notification_workspace_rule" ADD COLUMN "bale_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "bale_delivery_pending_idx" ON "bale_delivery" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "bale_delivery_user_idx" ON "bale_delivery" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invitation_phone_idx" ON "invitation" USING btree ("phone_number");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_phone_number_unique" UNIQUE("phone_number");