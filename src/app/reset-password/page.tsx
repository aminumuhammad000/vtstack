'use client';
import { AuthLayout } from '@/components/user/AuthLayout';
import { ResetPassword } from '@/pages-legacy/user/auth/ResetPassword';

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPassword />
    </AuthLayout>
  );
}
