-- Short-lived tokens for QR / mobile reference-image upload sessions.
ALTER TABLE `user_tokens`
  MODIFY COLUMN `token_type` ENUM(
    'password_reset',
    'email_verification',
    'api_key',
    'mobile_upload'
  ) NOT NULL;
