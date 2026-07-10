export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

export interface ApiError extends Error {
  status?: number;
  details?: unknown;
}

export const getAuthToken = () => localStorage.getItem("libraryos_token") ?? "";

export const saveAuthSession = (token: string, user: unknown) => {
  localStorage.setItem("libraryos_token", token);
  localStorage.setItem("libraryos_user", JSON.stringify(user));
};

export const clearAuthSession = () => {
  localStorage.removeItem("libraryos_token");
  localStorage.removeItem("libraryos_user");
};

export const getStoredUser = () => {
  const rawUser = localStorage.getItem("libraryos_user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser);
  } catch {
    return null;
  }
};

export const requestJson = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  const token = getAuthToken();

  headers.set("Content-Type", options.body instanceof FormData ? "" : "application/json");
  if (headers.get("Content-Type") === "") {
    headers.delete("Content-Type");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = API_BASE_URL ? `${API_BASE_URL}${path}` : path;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await response.json() : null;

  if (!response.ok) {
    const error = new Error((data && data.message) || response.statusText) as ApiError;
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data as T;
};