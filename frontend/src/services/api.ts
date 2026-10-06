import { storage } from '../utils/storage.ts';

const API_BASE = '/api';

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = storage.getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorInfo = data?.error || {
      code: `HTTP_${response.status}`,
      message: response.statusText || 'An unexpected error occurred'
    };
    throw new ApiError(errorInfo.message, errorInfo.code, errorInfo.details);
  }

  return (data?.data !== undefined ? data.data : data) as T;
}

/**
 * Upload multipart form data with real XHR progress tracking.
 */
export function uploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress?: (percentage: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    xhr.open('POST', url, true);

    const token = storage.getToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON response
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve((responseJson?.data !== undefined ? responseJson.data : responseJson) as T);
      } else {
        const errorInfo = responseJson?.error || {
          code: `HTTP_${xhr.status}`,
          message: xhr.statusText || 'Upload failed'
        };
        reject(new ApiError(errorInfo.message, errorInfo.code, errorInfo.details));
      }
    };

    xhr.onerror = () => {
      reject(new ApiError('Network connection failed during upload', 'NETWORK_ERROR'));
    };

    xhr.send(formData);
  });
}
