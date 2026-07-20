class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new ApiError((data && data.error) || `Request failed (${res.status})`, res.status);
  }
  return data;
}

export const api = {
  register: (email, password, displayName) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) }),
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  listTests: () => request('/tests'),
  createTest: (payload) => request('/tests', { method: 'POST', body: JSON.stringify(payload) }),
  getTest: (id) => request(`/tests/${id}`),
  updateTest: (id, payload) => request(`/tests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteTest: (id) => request(`/tests/${id}`, { method: 'DELETE' }),
  startGlobalTest: (id) => request(`/tests/from-global/${id}`, { method: 'POST' }),

  listGlobalTests: () => request('/global-tests'),
  getGlobalTest: (id) => request(`/global-tests/${id}`),
  createGlobalTest: (payload) => request('/global-tests', { method: 'POST', body: JSON.stringify(payload) }),
  updateGlobalTest: (id, payload) => request(`/global-tests/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteGlobalTest: (id) => request(`/global-tests/${id}`, { method: 'DELETE' }),

  reportQuestion: (payload) => request('/reports', { method: 'POST', body: JSON.stringify(payload) }),
  myReportedQuestions: (globalTestId) => request(`/reports/mine/${globalTestId}`),
  listReports: () => request('/reports'),
  dismissReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),
};

export { ApiError };
