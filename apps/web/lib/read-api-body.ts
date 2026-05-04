import type { ApiBody } from '@/lib/api-envelope';

/**
 * Parses a fetch `Response` body into the Nest API envelope shape.
 */
export async function readApiBody<T>(res: Response): Promise<ApiBody<T>> {
  const text = await res.text();
  if (!text) {
    return {
      success: false,
      error: { statusCode: res.status, message: 'Empty response' },
      data: null,
      message: 'Empty response',
    };
  }
  try {
    return JSON.parse(text) as ApiBody<T>;
  } catch {
    return {
      success: false,
      error: { statusCode: res.status, message: 'Invalid JSON' },
      data: null,
      message: 'Invalid JSON',
    };
  }
}
