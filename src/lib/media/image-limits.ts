/** Shared limits for profile reference images (client + server). */

/** Absolute hard cap for inbound upload bodies. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Target size after client-side preparation — stays under typical nginx
 * `client_max_body_size` defaults (1m) with multipart overhead.
 */
export const CLIENT_UPLOAD_TARGET_BYTES = 900 * 1024;

/** Longest edge for analysis-ready images. */
export const ANALYSIS_MAX_PIXELS = 1600;

/** WebP quality for analysis masters (face compare still viable). */
export const ANALYSIS_WEBP_QUALITY = 82;

export const THUMBNAIL_MAX_PIXELS = 300;
export const THUMBNAIL_WEBP_QUALITY = 72;
