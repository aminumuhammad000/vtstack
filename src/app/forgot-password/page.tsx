'use client';
import { AuthLayout } from '@/components/user/AuthLayout';
import { ForgotPassword } from '@/pages-legacy/user/auth/ForgotPassword';

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPassword />
    </AuthLayout>
  );
}
