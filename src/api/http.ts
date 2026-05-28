import axios from 'axios';

/**
 * Auth model: HttpOnly session cookie (`stalu_session`) set by the API on
 * login callback. JS niekada nematai token'o; axios automatiškai prikabina
 * cookie per `withCredentials: true`.
 *
 * 401 interceptor: jei API atsako 401 ne login'o flow metu, mes klient'ą
 * redirect'inam į /login. Prevent infinite loop'o kai jau ant /login.
 */
export const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Pages where a 401 is expected (the user is on the login page) — do NOT
// auto-redirect, the page will handle the error inline. Without this, the
// useAuth() /me probe that fires on mount kicks the user off /admin/login
// back to /login within ~1s.
const PUBLIC_AUTH_PATHS = ['/login', '/admin/login'];

http.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const onPublicAuthPage = PUBLIC_AUTH_PATHS.some((p) => window.location.pathname === p);
    if (err?.response?.status === 401 && !onPublicAuthPage) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
