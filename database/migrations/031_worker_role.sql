-- Worker role for orders desk (Aufträge) — admin + worker only
SET NAMES utf8mb4;

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'support', 'worker', 'user') NOT NULL DEFAULT 'user';
