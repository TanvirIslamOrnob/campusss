// Single place for all backend calls. No mock data: if the backend is down, calls fail honestly.
const BASE = '/api';
const KEY = 'campusx-token';

// The JWT lives in localStorage (simple, but readable by any script on the page: keep the app free of XSS).
export const tokenStore = {
  get() { try { return localStorage.getItem(KEY); } catch { return null; } },
  set(t) { try { localStorage.setItem(KEY, t); } catch { /* ignore */ } },
  clear() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } },
};

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const qs = o => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false)).toString();

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: form ?? (body ? JSON.stringify(body) : undefined) });
  } catch {
    throw new ApiError('Cannot reach the CAMPUSX server. Is the backend running on port 8080?', 0);
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    const contentType = res.headers.get('content-type') || '';
    if (res.status >= 500 && !contentType.includes('application/json')) {
      msg = 'The CAMPUSX backend is not responding. Start MySQL and the backend on port 8080, then try again.';
    } else {
      try { msg = (await res.json()).message || msg; } catch { /* no JSON body */ }
    }
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

export const api = {
  health: () => request('/health'),
  departments: () => request('/departments'),
  login: b => request('/auth/login', { method: 'POST', body: b }),
  verifyEmail: token => request('/auth/verify-email', { method: 'POST', body: { token } }),
  forgotPassword: email => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/auth/reset-password', { method: 'POST', body: { token, password } }),
  me: () => request('/users/me'),
  changePassword: b => request('/users/me/password', { method: 'POST', body: b }),
  updateMe: b => request('/users/me', { method: 'PUT', body: b }),
  uploadAvatar: file => { const f = new FormData(); f.append('file', file); return request('/users/me/avatar', { method: 'POST', form: f }); },
  posts: (q = '', page = 0) => request(`/posts?q=${encodeURIComponent(q)}&page=${page}`),
  createPost: (content, file) => { const f = new FormData(); f.append('content', content); if (file) f.append('image', file); return request('/posts', { method: 'POST', form: f }); },
  deletePost: id => request(`/posts/${id}`, { method: 'DELETE' }),
  likePost: id => request(`/posts/${id}/like`, { method: 'POST' }),
  comments: id => request(`/posts/${id}/comments`),
  deleteComment: (id, commentId) => request(`/posts/${id}/comments/${commentId}`, { method: 'DELETE' }),
  addComment: (id, text) => request(`/posts/${id}/comments`, { method: 'POST', body: { text } }),
  reportPost: (id, reason) => request(`/posts/${id}/report`, { method: 'POST', body: { reason } }),
  dashboard: () => request('/dashboard'),
  // Phase 4
  courses: departmentId => request(`/courses?${qs({ departmentId })}`),
  materials: p => request(`/materials?${qs(p)}`),
  uploadMaterial: (title, courseId, file) => { const f = new FormData(); f.append('title', title); f.append('courseId', courseId); f.append('file', file); return request('/materials', { method: 'POST', form: f }); },
  deleteMaterial: id => request(`/materials/${id}`, { method: 'DELETE' }),
  bookmark: id => request(`/materials/${id}/bookmark`, { method: 'POST' }),
  reportMaterial: (id, reason) => request(`/materials/${id}/report`, { method: 'POST', body: { reason } }),
  async downloadMaterial(id, filename) { // private file: needs the JWT, so fetch it as a blob and save it
    const res = await fetch(`${BASE}/materials/${id}/download`, { headers: { Authorization: `Bearer ${tokenStore.get()}` } }).catch(() => { throw new ApiError('Cannot reach the CAMPUSX server.', 0); });
    if (!res.ok) throw new ApiError(`Download failed (${res.status})`, res.status);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob()); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  items: p => request(`/lost-found?${qs(p)}`),
  createItem: v => { const f = new FormData(); Object.entries(v).forEach(([k, x]) => x && f.append(k, x)); return request('/lost-found', { method: 'POST', form: f }); },
  deleteItem: id => request(`/lost-found/${id}`, { method: 'DELETE' }),
  claimItem: (id, text) => request(`/lost-found/${id}/claims`, { method: 'POST', body: { text } }),
  itemClaims: id => request(`/lost-found/${id}/claims`),
  myClaims: () => request('/claims/mine'),
  decideClaim: (id, status) => request(`/claims/${id}`, { method: 'PATCH', body: { status } }),
  listings: p => request(`/listings?${qs(p)}`),
  createListing: v => { const f = new FormData(); Object.entries(v).forEach(([k, x]) => x && f.append(k, x)); return request('/listings', { method: 'POST', form: f }); },
  updateListing: (id, body) => request(`/listings/${id}`, { method: 'PUT', body }),
  markSold: id => request(`/listings/${id}/sold`, { method: 'PATCH' }),
  deleteListing: id => request(`/listings/${id}`, { method: 'DELETE' }),
  contactSeller: (id, text) => request(`/listings/${id}/contact`, { method: 'POST', body: { text } }),
  // Phase 5
  groups: p => request(`/groups?${qs(p)}`),
  createGroup: body => request('/groups', { method: 'POST', body }),
  joinGroup: id => request(`/groups/${id}/join`, { method: 'POST' }),
  leaveGroup: id => request(`/groups/${id}/membership`, { method: 'DELETE' }),
  deleteGroup: id => request(`/groups/${id}`, { method: 'DELETE' }),
  groupMembers: id => request(`/groups/${id}/members`),
  decideMember: (id, userId, status) => request(`/groups/${id}/members/${userId}`, { method: 'PATCH', body: { status } }),
  removeMember: (id, userId) => request(`/groups/${id}/members/${userId}`, { method: 'DELETE' }),
  myCourses: () => request('/users/me/courses'),
  saveMyCourses: courseIds => request('/users/me/courses', { method: 'PUT', body: { courseIds } }),
  students: p => request(`/students?${qs(p)}`),
  events: p => request(`/events?${qs(p)}`),
  registerEvent: id => request(`/events/${id}/register`, { method: 'POST' }),
  cancelEvent: id => request(`/events/${id}/register`, { method: 'DELETE' }),
  // Phase 6
  conversations: () => request('/conversations'),
  startConversation: (userId, text) => request('/conversations', { method: 'POST', body: { userId, text } }),
  messages: (id, before) => request(`/conversations/${id}/messages?${qs({ before })}`),
  deleteMessage: (id, messageId, scope) => request(`/conversations/${id}/messages/${messageId}?scope=${scope}`, { method: 'DELETE' }),
  sendMessage: (id, text) => request(`/conversations/${id}/messages`, { method: 'POST', body: { text } }),
  publicUser: id => request(`/users/${id}/public`),
  badges: () => request('/badges'),
  notifications: p => request(`/notifications?${qs(p)}`),
  readNotification: id => request(`/notifications/${id}/read`, { method: 'POST' }),
  readAllNotifications: () => request('/notifications/read-all', { method: 'POST' }),
  // Phase 7: admin console
  adminStats: () => request('/admin/stats'),
  adminStudents: p => request(`/admin/students?${qs(p)}`),
  adminCreateUser: b => request('/admin/students', { method: 'POST', body: b }),
  adminUpdateUser: (id, b) => request(`/admin/students/${id}`, { method: 'PUT', body: b }),
  adminStudentAction: (id, action, body) => request(`/admin/students/${id}/${action}`, { method: 'POST', body }),
  adminSetRole: (id, role) => request(`/admin/students/${id}/role`, { method: 'PUT', body: { role } }),
  adminReports: p => request(`/admin/reports?${qs(p)}`),
  adminReportStatus: (id, status) => request(`/admin/reports/${id}`, { method: 'PATCH', body: { status } }),
  adminRemoveReported: id => request(`/admin/reports/${id}/remove-content`, { method: 'POST' }),
  adminContent: (type, p) => request(`/admin/content/${type}?${qs(p)}`),
  adminContentAction: (type, id, action) => request(`/admin/content/${type}/${id}/${action}`, { method: 'POST' }),
  adminCreateEvent: body => request('/admin/events', { method: 'POST', body }),
  adminUpdateEvent: (id, body) => request(`/admin/events/${id}`, { method: 'PUT', body }),
  adminDeleteEvent: id => request(`/admin/events/${id}`, { method: 'DELETE' }),
  adminRegistrations: id => request(`/admin/events/${id}/registrations`),
  adminRemoveRegistration: (id, userId) => request(`/admin/events/${id}/registrations/${userId}`, { method: 'DELETE' }),
  adminLogs: p => request(`/admin/logs?${qs(p)}`),
  adminAnnounce: text => request('/admin/announcements', { method: 'POST', body: { text } }),
};
