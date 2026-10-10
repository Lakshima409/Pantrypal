import api from './api';

export async function loginUser(credentials) {
  return api.post('/api/auth/login', credentials);
}

export async function registerUser(payload) {
  return api.post('/api/auth/register', payload);
}

export async function fetchProfile() {
  return api.get('/api/users/profile');
}

export async function updateProfile(payload) {
  return api.put('/api/users/profile', payload);
}

export default { loginUser, registerUser, fetchProfile, updateProfile };

