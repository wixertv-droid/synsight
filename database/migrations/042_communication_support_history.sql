CREATE TABLE IF NOT EXISTS communication_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel VARCHAR(32) NOT NULL,
  request_id BIGINT UNSIGNED NOT NULL,
  actor_user_id BIGINT UNSIGNED NULL,

  action VARCHAR(40) NOT NULL,

  status_from VARCHAR(32) NULL,
  status_to VARCHAR(32) NULL,

  subject VARCHAR(255) NULL,
  body TEXT NULL,

  delivery_status VARCHAR(32) NULL,
  provider VARCHAR(32) NULL,
  message_id VARCHAR(255) NULL,
  error_message TEXT NULL,

  meta_json JSON NULL,

  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),

  CONSTRAINT communication_history_actor_fk
    FOREIGN KEY (actor_user_id)
    REFERENCES users(id)
    ON DELETE SET NULL,

  INDEX communication_history_request_idx (channel, request_id),
  INDEX communication_history_actor_idx (actor_user_id),
  INDEX communication_history_created_idx (created_at)
);
