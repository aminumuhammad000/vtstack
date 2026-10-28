import { z } from 'zod';

export const createAdminSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Invalid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['admin', 'subadmin'])
});

export type CreateAdminFormData = z.infer<typeof createAdminSchema>;

export const updateAdminSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Invalid phone number'),
    role: z.enum(['admin', 'subadmin']),
    status: z.enum(['active', 'suspended', 'pending']).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal(''))
});

export type UpdateAdminFormData = z.infer<typeof updateAdminSchema>;
