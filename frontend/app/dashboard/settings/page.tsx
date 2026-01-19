'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface AllowedUser {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export default function SettingsPage() {
    const [users, setUsers] = useState<AllowedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [adding, setAdding] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

    // Fetch users on mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('allowed_users')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error fetching users:', error);
            setMessage({ text: 'Failed to load users: ' + error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail) return;

        setAdding(true);
        setMessage(null);

        try {
            const { error } = await supabase
                .from('allowed_users')
                .insert([{ email: newUserEmail }]);

            if (error) throw error;

            setMessage({ text: 'User added successfully', type: 'success' });
            setNewUserEmail('');
            fetchUsers(); // Refresh list
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setMessage({ text: 'Error adding user: ' + error.message, type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (!window.confirm(`Are you sure you want to remove ${email}? They will no longer be able to login.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('allowed_users')
                .delete()
                .eq('email', email);

            if (error) throw error;

            setMessage({ text: 'User removed successfully', type: 'success' });
            fetchUsers(); // Refresh list
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setMessage({ text: 'Error deleting user: ' + error.message, type: 'error' });
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-stone-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-display font-bold text-[#1a3c34]">Settings</h1>
                    <p className="text-stone-500 mt-2">Manage application access and configuration.</p>
                </div>

                {/* User Management Section */}
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-[#1a3c34]">User Management</h2>
                            <p className="text-sm text-stone-500">Control who can access this application.</p>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Message Alert */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Add User Form */}
                        <form onSubmit={handleAddUser} className="flex gap-4 mb-8 items-end">
                            <div className="flex-grow">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Add New Email</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                    className="w-full border-gray-300 rounded-lg text-sm px-4 py-2.5 focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent outline-none"
                                    placeholder="new.user@example.com"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={adding}
                                className="bg-[#1a3c34] hover:bg-[#122b25] text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm disabled:opacity-70 h-[42px]"
                            >
                                {adding ? 'Adding...' : 'Add User'}
                            </button>
                        </form>

                        {/* User List */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Allowed Users ({users.length})</h3>

                            {loading ? (
                                <div className="text-stone-500 text-sm py-4">Loading users...</div>
                            ) : users.length === 0 ? (
                                <div className="text-stone-500 text-sm py-4">No users found. (This shouldn't happen if you're logged in!)</div>
                            ) : (
                                <div className="space-y-2">
                                    {users.map((user) => (
                                        <div key={user.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100 group hover:border-stone-300 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-[#1a3c34]/10 text-[#1a3c34] flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-sm">person</span>
                                                </div>
                                                <span className="text-stone-700 font-medium">{user.email}</span>
                                                {user.role === 'admin' && (
                                                    <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Admin</span>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteUser(user.email)}
                                                className="text-stone-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                title="Remove Access"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
