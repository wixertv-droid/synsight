-- Replace the temporary demo role with the production user role.
-- Existing registered accounts are upgraded automatically.

SET NAMES utf8mb4;

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin','user','demo') NOT NULL DEFAULT 'user';

UPDATE `users`
SET `role` = 'user'
WHERE `role` = 'demo';

ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin','user') NOT NULL DEFAULT 'user';
