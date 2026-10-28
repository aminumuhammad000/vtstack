'use client';
import { AuthLayout } from '@/components/user/AuthLayout';
import { Login } from '@/pages-legacy/user/auth/Login';

export default function LoginPage() {
  return (
    <AuthLayout>
      <Login />
    </AuthLayout>
  );
}
