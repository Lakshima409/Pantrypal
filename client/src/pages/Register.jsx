import { Navigate } from 'react-router-dom';

// Legacy single-page Register kept for backwards compatibility.
// The new 3-page flow lives in RegisterStep1/2/3 — /register now
// redirects to step 1 so old links keep working.
function Register() {
  return <Navigate to="/register/step1" replace />;
}

export default Register;


