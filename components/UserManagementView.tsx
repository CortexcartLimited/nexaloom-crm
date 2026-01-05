
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Users, Plus, Edit, Trash2, Shield, Briefcase, Phone, HeartHandshake, X, Save, Search, UserCheck } from 'lucide-react';

interface UserManagementViewProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: Omit<User, 'id' | 'tenantId'>) => Promise<void>;
  onUpdateUser: (id: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: UserRole.SALES_AGENT
  });

  const isTeamLeader = currentUser.role === UserRole.TEAM_LEADER;

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: '',
        email: '',
        role: UserRole.SALES_AGENT
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      await onUpdateUser(editingUser.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role
      });
    } else {
      // Create user logic
      await onAddUser({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        preferences: { theme: 'light', backgroundId: 'default' }
      });
    }
    setIsModalOpen(false);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
            <Shield size={12} /> Admin
          </span>
        );
      case UserRole.TEAM_LEADER:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Briefcase size={12} /> Team Leader
          </span>
        );
      case UserRole.SALES_AGENT:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
            <Phone size={12} /> Sales Agent
          </span>
        );
      case UserRole.SERVICE_AGENT:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <HeartHandshake size={12} /> Service Agent
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage team members, roles, and access permissions.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus size={18} />
          Add User
        </button>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm text-gray-900 dark:text-white transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredUsers.length > 0 ? filteredUsers.map(user => {
                const isTargetAdmin = user.role === UserRole.ADMIN;
                // Restrictions: Team Leaders cannot delete/edit Admins.
                const canEdit = !isTeamLeader || !isTargetAdmin;
                const canDelete = !isTeamLeader || !isTargetAdmin;

                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                          {user.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{user.name} {user.id === currentUser.id && <span className="text-gray-400 font-normal text-xs ml-1">(You)</span>}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {user.email}
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(user)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                            title="Edit User"
                          >
                            <Edit size={16} />
                          </button>
                        )}

                        {user.id !== currentUser.id && canDelete && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete ${user.name}?`)) onDeleteUser(user.id);
                            }}
                            className="p-1.5 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                      <p>No users found matching your search.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                {editingUser ? <Edit size={18} className="text-blue-500" /> : <Plus size={18} className="text-blue-500" />}
                {editingUser ? 'Edit User' : 'Add New User'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Sarah Connor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                <input
                  required
                  type="email"
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="sarah@company.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <div className="space-y-2">
                  {[
                    { id: UserRole.ADMIN, label: 'Administrator', icon: Shield, desc: 'Full access to settings, users, and all data.', disabled: isTeamLeader },
                    { id: UserRole.TEAM_LEADER, label: 'Team Leader', icon: Briefcase, desc: 'Can manage agents and view team performance.' },
                    { id: UserRole.SALES_AGENT, label: 'Sales Agent', icon: Phone, desc: 'Access to leads, pipeline, and tasks.' },
                    { id: UserRole.SERVICE_AGENT, label: 'Service Agent', icon: HeartHandshake, desc: 'Focus on support tickets and customer retention.' },
                  ].map((roleOption) => (
                    <label
                      key={roleOption.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${formData.role === roleOption.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-white dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'} ${roleOption.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={roleOption.id}
                        checked={formData.role === roleOption.id}
                        onChange={() => !roleOption.disabled && setFormData({ ...formData, role: roleOption.id as UserRole })}
                        className="mt-1"
                        disabled={roleOption.disabled}
                      />
                      <div>
                        <div className="flex items-center gap-2 font-semibold text-sm text-gray-900 dark:text-white">
                          <roleOption.icon size={14} className="text-gray-500 dark:text-gray-400" />
                          {roleOption.label}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{roleOption.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 rounded-lg transition-colors shadow-sm flex items-center gap-2">
                  {editingUser ? <Save size={16} /> : <UserCheck size={16} />}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
