import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * SignUpPage (Deprecated in favor of passwordless Cleartrip-style OTP onboarding)
 * Automatically redirects all traffic to /signin
 */
export default function SignUpPage() {
  return <Navigate to="/signin" replace />;
}
