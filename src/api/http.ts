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

http.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err?.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
