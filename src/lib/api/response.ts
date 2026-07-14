/**
 * Shared API response envelope so every Route Handler returns the same
 * `{ success, data }` / `{ success, error }` shape and the frontend can
 * handle errors generically.
 */

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponseBody<T> = ApiSuccessBody<T> | ApiErrorBody;

export function apiSuccess<T>(data: T): ApiSuccessBody<T> {
  return { success: true, data };
}

export function apiError(code: string, message: string): ApiErrorBody {
  return { success: false, error: { code, message } };
}
