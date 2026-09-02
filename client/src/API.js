
const SERVER_URL = 'http://localhost:3001/api';

/**
 * Wrapper around fetch: always sends the session cookie, always parses the
 * JSON body, and turns any non-2xx answer into a rejected promise carrying
 * the message provided by the server ({ error: "..." }).
 */
async function apiCall(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(SERVER_URL + path, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Please check your connection and try again.');
  }

  let payload = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const err = new Error(payload?.error ?? `Unexpected server error (${response.status}).`);
    err.status = response.status;
    throw err;
  }
  return payload;
}

/* Public data */

const getFacilityTypes = () => apiCall('/facilities');

const getFacilityUnits = (facilityTypeId) =>
  apiCall(`/facility-types/${encodeURIComponent(facilityTypeId)}/facilities`);

const getEquipment = () => apiCall('/equipment');

/* Authentication */

const logIn = (credentials) => apiCall('/sessions', { method: 'POST', body: credentials });

const verifyTotp = (code) => apiCall('/login-totp', { method: 'POST', body: { code } });

const getUserInfo = () => apiCall('/sessions/current');

const logOut = () => apiCall('/sessions/current', { method: 'DELETE' });

/* Reservations */

const getReservations = () => apiCall('/reservations');

const createReservation = (reservation) =>
  apiCall('/reservations', { method: 'POST', body: reservation });

const updateReservationEquipment = (reservationId, equipment) =>
  apiCall(`/reservations/${encodeURIComponent(reservationId)}`, {
    method: 'PATCH',
    body: { equipment },
  });

const deleteReservation = (reservationId) =>
  apiCall(`/reservations/${encodeURIComponent(reservationId)}`, { method: 'DELETE' });

const API = {
  getFacilityTypes,
  getFacilityUnits,
  getEquipment,
  logIn,
  verifyTotp,
  getUserInfo,
  logOut,
  getReservations,
  createReservation,
  updateReservationEquipment,
  deleteReservation,
};

export default API;

