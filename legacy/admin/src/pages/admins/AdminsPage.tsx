import React, { useState, useEffect } from 'react';
import { adminApi, type Admin } from '../../api/client';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X, Shield, Mail, User, Phone, Lock, RefreshCw, Search, Trash2, Edit2 } from 'lucide-react';
import { createAdminSchema, updateAdminSchema, type CreateAdminFormData, type UpdateAdminFormData } from '../../schemas/admin';

const AdminsPage: React.FC = () => {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<CreateAdminFormData>({
        resolver: zodResolver(createAdminSchema)
    });

    const {
        register: registerEdit,
        handleSubmit: handleSubmitEdit,
        reset: resetEdit,
        formState: { errors: editErrors, isSubmitting: isSubmittingEdit }
    } = useForm<UpdateAdminFormData>({
        resolver: zodResolver(updateAdminSchema)
    });

    useEffect(() => {
        fetchAdmins();
    }, []);

    const fetchAdmins = async () => {
        try {
            setLoading(true);
            const data = await adminApi.getAllAdmins();
            setAdmins(data);
        } catch (error) {
            console.error('Failed to fetch admins:', error);
            toast.error('Failed to fetch admin users');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: CreateAdminFormData) => {
        try {
            await adminApi.createAdmin(data);
            toast.success('Admin user created successfully');
            setShowAddModal(false);
            reset();
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create admin user');
        }
    };

    const handleOpenEditModal = (admin: Admin) => {
        setEditingAdmin(admin);
        resetEdit({
            firstName: admin.firstName || '',
            lastName: admin.lastName || '',
            email: admin.email || '',
            phone: admin.phone || '',
            role: (admin.role as 'admin' | 'subadmin') || 'admin',
            status: (admin.status as 'active' | 'suspended' | 'pending') || 'active',
            password: '',
        });
        setShowEditModal(true);
    };

    const onEditSubmit = async (data: UpdateAdminFormData) => {
        if (!editingAdmin) return;
        try {
            const payload: any = { ...data };
            if (!payload.password) {
                delete payload.password;
            }
            await adminApi.updateAdmin(editingAdmin._id, payload);
            toast.success('Admin user updated successfully');
            setShowEditModal(false);
            setEditingAdmin(null);
            fetchAdmins();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update admin user');
        }
    };

    const handleDeleteAdmin = async (id: string, email: string) => {
        if (window.confirm(`Are you sure you want to delete the admin ${email}? This action cannot be undone.`)) {
            try {
                await adminApi.deleteAdmin(id);
                toast.success('Admin deleted successfully');
                fetchAdmins();
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to delete admin');
            }
        }
    };

    const filteredAdmins = admins.filter(admin => {
        const query = searchQuery.toLowerCase();
        return (
            (admin.firstName?.toLowerCase() || '').includes(query) ||
            (admin.lastName?.toLowerCase() || '').includes(query) ||
            (admin.email?.toLowerCase() || '').includes(query)
        );
    });

    return (
        <div className="p-6 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">Admin Users</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage users with administrative access</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchAdmins}
                        className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            reset();
                            setShowAddModal(true);
                        }}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Admin
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Search size={18} />
                    </span>
                    <input
                        type="text"
                        placeholder="Search admins by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">Joined Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-48"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 bg-slate-200 rounded-full w-16"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                                        <td className="px-6 py-4 text-right"><div className="h-4 bg-slate-200 rounded w-12 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : filteredAdmins.length > 0 ? (
                                filteredAdmins.map((admin) => (
                                    <tr key={admin._id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                                                    {admin.firstName?.[0]}{admin.lastName?.[0]}
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">{admin.firstName} {admin.lastName}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{admin.email}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{admin.phone}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium capitalize">{admin.role || 'admin'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${admin.status === 'active' ? 'bg-primary-100 text-primary-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {admin.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500">
                                            {new Date(admin.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenEditModal(admin)}
                                                    className="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Edit Admin"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteAdmin(admin._id, admin.email)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                                    title="Delete Admin"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No admin users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Admin Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                    <Shield size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Add New Admin</h3>
                                    <p className="text-xs text-slate-500">Grant administrative privileges</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            {...register('firstName')}
                                            type="text"
                                            className={`w-full pl-10 pr-4 py-2 border ${errors.firstName ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                            placeholder="John"
                                        />
                                    </div>
                                    {errors.firstName && <p className="text-red-500 text-xs">{errors.firstName.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            {...register('lastName')}
                                            type="text"
                                            className={`w-full pl-10 pr-4 py-2 border ${errors.lastName ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                            placeholder="Doe"
                                        />
                                    </div>
                                    {errors.lastName && <p className="text-red-500 text-xs">{errors.lastName.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...register('email')}
                                        type="email"
                                        className={`w-full pl-10 pr-4 py-2 border ${errors.email ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...register('phone')}
                                        type="tel"
                                        className={`w-full pl-10 pr-4 py-2 border ${errors.phone ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="+234..."
                                    />
                                </div>
                                {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...register('password')}
                                        type="password"
                                        className={`w-full pl-10 pr-4 py-2 border ${errors.password ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        {...register('role')}
                                        className={`w-full pl-10 pr-4 py-2 border ${errors.role ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm bg-white`}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="subadmin">Sub-Admin</option>
                                    </select>
                                </div>
                                {errors.role && <p className="text-red-500 text-xs">{errors.role.message}</p>}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Shield size={18} />
                                            Create Admin Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Modal */}
            {showEditModal && editingAdmin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                                    <Edit2 size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Edit Admin User</h3>
                                    <p className="text-xs text-slate-500">{editingAdmin.email}</p>
                                </div>
                            </div>
                            <button onClick={() => { setShowEditModal(false); setEditingAdmin(null); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitEdit(onEditSubmit)} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">First Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            {...registerEdit('firstName')}
                                            type="text"
                                            className={`w-full pl-10 pr-4 py-2 border ${editErrors.firstName ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                            placeholder="John"
                                        />
                                    </div>
                                    {editErrors.firstName && <p className="text-red-500 text-xs">{editErrors.firstName.message}</p>}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Last Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input
                                            {...registerEdit('lastName')}
                                            type="text"
                                            className={`w-full pl-10 pr-4 py-2 border ${editErrors.lastName ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                            placeholder="Doe"
                                        />
                                    </div>
                                    {editErrors.lastName && <p className="text-red-500 text-xs">{editErrors.lastName.message}</p>}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...registerEdit('email')}
                                        type="email"
                                        className={`w-full pl-10 pr-4 py-2 border ${editErrors.email ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="admin@example.com"
                                    />
                                </div>
                                {editErrors.email && <p className="text-red-500 text-xs">{editErrors.email.message}</p>}
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...registerEdit('phone')}
                                        type="tel"
                                        className={`w-full pl-10 pr-4 py-2 border ${editErrors.phone ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="+234..."
                                    />
                                </div>
                                {editErrors.phone && <p className="text-red-500 text-xs">{editErrors.phone.message}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Role</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            {...registerEdit('role')}
                                            className={`w-full pl-10 pr-4 py-2 border ${editErrors.role ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm bg-white`}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="subadmin">Sub-Admin</option>
                                        </select>
                                    </div>
                                    {editErrors.role && <p className="text-red-500 text-xs">{editErrors.role.message}</p>}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Status</label>
                                    <div className="relative">
                                        <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <select
                                            {...registerEdit('status')}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm bg-white capitalize"
                                        >
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                            <option value="pending">Pending</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                    New Password <span className="text-slate-400 lowercase font-normal">(optional)</span>
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        {...registerEdit('password')}
                                        type="password"
                                        className={`w-full pl-10 pr-4 py-2 border ${editErrors.password ? 'border-red-500' : 'border-slate-200'} rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm`}
                                        placeholder="Leave blank to keep unchanged"
                                    />
                                </div>
                                {editErrors.password && <p className="text-red-500 text-xs">{editErrors.password.message}</p>}
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowEditModal(false); setEditingAdmin(null); }}
                                    className="w-1/3 py-3 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingEdit}
                                    className="w-2/3 py-3 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {isSubmittingEdit ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Edit2 size={18} />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminsPage;
