'use client';

import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  agencyId?: string;
  fullName: string;
  email: string;
  role: 'agency_admin' | 'agent' | 'traveler';
  phone?: string;
  avatarUrl?: string;
  accessStatus?: 'active' | 'blocked' | 'pending';
  accessExpiresAt?: string;
}

const getDefaultAccessDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'agent' as User['role'],
    phone: '',
    accessExpiresAt: getDefaultAccessDate(),
  });

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email) return;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        fetchUsers();
        setFormData({ fullName: '', email: '', role: 'agent', phone: '', accessExpiresAt: getDefaultAccessDate() });
        setShowModal(false);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateAccess = async (user: User, patch: Partial<User>) => {
    const updatedUser = { ...user, ...patch };
    setUsers((prev) => prev.map((item) => (item.id === user.id ? updatedUser : item)));

    try {
      const response = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser),
      });

      if (!response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error(error);
      fetchUsers();
    }
  };

  return (
    <div className="flex-1 space-y-6">
      {/* Header bar */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">TIME OPERACIONAL</h2>
          <p className="text-on-surface opacity-75 text-sm mt-1">
            Convide e gerencie os consultores de viagens da sua agência.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-on-primary font-semibold text-xs px-6 py-3 rounded-lg shadow-sm flex items-center gap-2 hover:shadow-md active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          CONVIDAR CONSULTOR
        </button>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm">
        {loading ? (
          <div className="px-6 py-12 text-center text-xs opacity-60 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined animate-spin">sync</span>
            <span>Carregando consultores...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Nome Completo
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Cargo / Nível
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Acesso
                  </th>
                  <th className="px-6 py-4 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Expira em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-xs">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{u.fullName}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4 opacity-80">{u.phone || 'Não informado'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${
                        u.role === 'agency_admin'
                          ? 'bg-purple-50 text-purple-700 border-purple-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {u.role === 'agency_admin' ? 'Administrador' : 'Consultor'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={u.accessStatus || 'active'}
                        onChange={(event) => handleUpdateAccess(u, { accessStatus: event.target.value as User['accessStatus'] })}
                        className="border border-outline-variant rounded-lg p-1.5 text-[11px] bg-white font-bold"
                      >
                        <option value="active">Ativo</option>
                        <option value="pending">Pendente</option>
                        <option value="blocked">Bloqueado</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="date"
                        value={u.accessExpiresAt ? u.accessExpiresAt.slice(0, 10) : ''}
                        onChange={(event) => handleUpdateAccess(u, { accessExpiresAt: new Date(`${event.target.value}T23:59:59`).toISOString() })}
                        className="border border-outline-variant rounded-lg p-1.5 text-[11px] bg-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* INVITE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-outline-variant shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-base text-primary mb-4">Convidar Novo Consultor</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Nome Completo</label>
                <input
                  required
                  type="text"
                  name="fullName"
                  placeholder="Ex: João da Silva"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Endereço de E-mail</label>
                <input
                  required
                  type="email"
                  name="email"
                  placeholder="consultor@suaagencia.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Telefone de Contato</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="+55 11 99999-9999"
                  value={formData.phone}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Nível de Acesso</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="agent">Consultor de Viagens (Acesso Padrão)</option>
                  <option value="agency_admin">Administrador da Agência (Acesso Total)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Acesso valido ate</label>
                <input
                  type="date"
                  name="accessExpiresAt"
                  value={formData.accessExpiresAt}
                  onChange={handleChange}
                  className="border border-outline-variant rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90"
                >
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
