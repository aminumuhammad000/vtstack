'use client';
import { AuthLayout } from '@/components/user/AuthLayout';
import { Register } from '@/pages-legacy/user/auth/Register';

export default function RegisterPage() {
  return (
    <AuthLayout>
      <Register />
    </AuthLayout>
  );
}
