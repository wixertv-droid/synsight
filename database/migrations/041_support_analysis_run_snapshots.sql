CREATE TABLE IF NOT EXISTS analysis_run_snapshots (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  module_key VARCHAR(64) NOT NULL,
  native_run_id BIGINT UNSIGNED NULL,
  request_id VARCHAR(64) NULL,

  status VARCHAR(32) NOT NULL DEFAULT 'running',

  input_snapshot_json JSON NULL,
  result_snapshot_json JSON NULL,

  error_code VARCHAR(128) NULL,
  error_message TEXT NULL,

  credits_charged INT UNSIGNED NOT NULL DEFAULT 0,

  retention_days INT UNSIGNED NOT NULL DEFAULT 30,
  expires_at TIMESTAMP(3) NULL,

  started_at TIMESTAMP(3) NULL,
  completed_at TIMESTAMP(3) NULL,

  created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (id),

  CONSTRAINT analysis_run_snapshots_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  INDEX analysis_run_snapshots_user_idx (user_id),
  INDEX analysis_run_snapshots_module_idx (module_key),
  INDEX analysis_run_snapshots_status_idx (status),
  INDEX analysis_run_snapshots_request_idx (request_id),
  INDEX analysis_run_snapshots_created_idx (created_at),
  INDEX analysis_run_snapshots_expires_idx (expires_at)
);
