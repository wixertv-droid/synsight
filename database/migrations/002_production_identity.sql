-- SynSight Sprint 5C: production identity and onboarding schema
-- MySQL 8 compatible; apply after 001_initial_schema.sql.

ALTER TABLE `users`
  ADD COLUMN `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `status`,
  ADD COLUMN `locked_until` TIMESTAMP(3) NULL DEFAULT NULL AFTER `failed_login_attempts`,
  ADD KEY `users_locked_until_idx` (`locked_until`);

CREATE TABLE `profile_aliases` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `alias` VARCHAR(150) NOT NULL,
  `alias_type` ENUM('public_alias','former_name','nickname','username','gaming_name') NOT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `profile_aliases_user_id_idx` (`user_id`),
  CONSTRAINT `profile_aliases_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `profile_phone_numbers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `phone_number` VARCHAR(32) NOT NULL,
  `label` VARCHAR(50) NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `profile_phone_numbers_user_id_idx` (`user_id`),
  CONSTRAINT `profile_phone_numbers_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `profile_additional_emails` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `profile_additional_emails_user_email_unique` (`user_id`,`email`),
  KEY `profile_additional_emails_user_id_idx` (`user_id`),
  CONSTRAINT `profile_additional_emails_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `social_accounts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `platform` VARCHAR(32) NOT NULL,
  `username` VARCHAR(150) NOT NULL,
  `profile_url` VARCHAR(500) NULL,
  `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `social_accounts_user_platform_username_unique`
    (`user_id`,`platform`,`username`),
  KEY `social_accounts_user_id_idx` (`user_id`),
  CONSTRAINT `social_accounts_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `profile_images` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `image_type` ENUM('front','left_profile','right_profile','angled') NOT NULL,
  `storage_path` VARCHAR(500) NOT NULL,
  `uploaded_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `profile_images_user_id_idx` (`user_id`),
  CONSTRAINT `profile_images_user_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
