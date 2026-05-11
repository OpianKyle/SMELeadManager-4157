CREATE TABLE `email_template` (
	`id` text PRIMARY KEY NOT NULL,
	`stage_id` text NOT NULL,
	`name` text NOT NULL,
	`subject` text NOT NULL,
	`body_html` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch())
);
