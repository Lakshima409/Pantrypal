import api from './api';

export async function loginUser(credentials) {
  return api.post('/auth/login', credentials);
}

export async function registerUser(payload) {
  return api.post('/auth/register', payload);
}

export async function fetchProfile() {
  return api.get('/users/profile');
}

export async function updateProfile(payload) {
  return api.put('/users/profile', payload);
}

export default { loginUser, registerUser, fetchProfile, updateProfile };

