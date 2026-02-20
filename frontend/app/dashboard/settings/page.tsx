'use client';

import { useState, useEffect } from 'react';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { buildRestHeaders, restDelete, restGet, restPost } from '@/lib/restClient';

interface AllowedUser {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export default function SettingsPage() {
    const { t } = useLanguage();
    const { session } = useAuth();
    const refreshKey = useResumeRefresh();
    const [users, setUsers] = useState<AllowedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [adding, setAdding] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

    const getRestHeaders = () => {
        if (!session?.access_token) {
            throw new Error('Missing access token for REST');
        }
        return buildRestHeaders({ bearerToken: session.access_token });
    };

    // Fetch users on mount
    useEffect(() => {
        if (!session?.access_token) return;
        fetchUsers();
    }, [session?.access_token, refreshKey]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await restGet('allowed_users?select=*&order=created_at', getRestHeaders());
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
            await restPost('allowed_users', [{ email: newUserEmail }], getRestHeaders());

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
        if (!window.confirm(t('confirmRemoveUser').replace('{email}', email))) {
            return;
        }

        try {
            await restDelete(`allowed_users?email=eq.${encodeURIComponent(email)}`, getRestHeaders());

            setMessage({ text: t('userRemoved'), type: 'success' });
            fetchUsers(); // Refresh list
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setMessage({ text: t('errorDeleting') + error.message, type: 'error' });
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-stone-50 p-6 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                        <span className="material-symbols-outlined">settings</span>
                        <h1>{t('settingsTitle')}</h1>
                    </div>
                    <p className="text-stone-500 mt-2">{t('settingsDesc')}</p>
                </div>

                {/* User Management Section */}
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-[#1a3c34]">{t('userManagement')}</h2>
                            <p className="text-sm text-stone-500">{t('userManagementDesc')}</p>
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
                        <form onSubmit={handleAddUser} className="flex flex-col md:flex-row gap-4 mb-8 items-end">
                            <div className="flex-grow w-full">
                                <label className="block text-xs font-bold text-gray-700 mb-1">{t('addNewEmail')}</label>
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
                                className="w-full md:w-auto bg-[#1a3c34] hover:bg-[#122b25] text-white font-bold py-2.5 px-6 rounded-lg transition-colors shadow-sm disabled:opacity-70 h-[42px] whitespace-nowrap"
                            >
                                {adding ? t('adding') : t('addUser')}
                            </button>
                        </form>

                        {/* User List */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">{t('allowedUsers')} ({users.length})</h3>

                            {/* Horizontal Scroll Wrapper for Mobile */}
                            <div className="overflow-x-auto pb-2">
                                <div className="min-w-[500px] space-y-2">
                                    {loading ? (
                                        <div className="text-stone-500 text-sm py-4">{t('loadingUsers')}</div>
                                    ) : users.length === 0 ? (
                                        <div className="text-stone-500 text-sm py-4">{t('noUsersFound')}</div>
                                    ) : (
                                        users.map((user) => (
                                            <div key={user.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100 group hover:border-stone-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-[#1a3c34]/10 text-[#1a3c34] flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-sm">person</span>
                                                    </div>
                                                    <span className="text-stone-700 font-medium">{user.email}</span>
                                                    {user.role === 'admin' && (
                                                        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium shrink-0">{t('adminRole')}</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteUser(user.email)}
                                                    className="text-stone-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors shrink-0"
                                                    title={t('removeAccess')}
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
