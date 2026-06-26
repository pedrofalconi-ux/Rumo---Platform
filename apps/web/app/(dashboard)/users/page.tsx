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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
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

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
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

  const handleDeleteUser = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o usuário "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users?id=${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Erro ao remover usuário');
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão ao remover usuário');
    }
  };

  const admins = users.filter((u) => u.role === 'agency_admin');
  const agents = users.filter((u) => u.role === 'agent');

  const renderTable = (list: User[], title: string, subtitle: string, badgeColorClass: string) => {
    return (
      <div className="scroll-reveal bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm flex flex-col">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm text-primary tracking-wide">{title}</h3>
            <p className="text-xs text-on-surface opacity-70 mt-0.5">{subtitle}</p>
          </div>
          <div>
            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${badgeColorClass}`}>
              {list.length} {list.length === 1 ? 'Membro' : 'Membros'}
            </span>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="p-8 text-center text-xs opacity-60">
            Nenhum usuário nesta categoria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low border-b border-outline-variant">
                <tr>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Nome Completo
                  </th>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    E-mail
                  </th>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Telefone
                  </th>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Acesso
                  </th>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider">
                    Expira em
                  </th>
                  <th className="px-6 py-3 font-semibold text-xs text-on-surface opacity-70 uppercase tracking-wider text-right">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-xs">
                {list.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-3.5 font-bold text-on-surface flex items-center gap-2">
                        {u.fullName}
                        {isSelf && (
                          <span className="bg-primary/10 text-primary text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            Você
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">{u.email}</td>
                      <td className="px-6 py-3.5 opacity-80">{u.phone || 'Não informado'}</td>
                      <td className="px-6 py-3.5">
                        <select
                          disabled={isSelf}
                          value={u.accessStatus || 'active'}
                          onChange={(event) => handleUpdateAccess(u, { accessStatus: event.target.value as User['accessStatus'] })}
                          className="border border-outline-variant rounded-lg p-1 text-[11px] bg-white font-bold disabled:opacity-60"
                        >
                          <option value="active">Ativo</option>
                          <option value="pending">Pendente</option>
                          <option value="blocked">Bloqueado</option>
                        </select>
                      </td>
                      <td className="px-6 py-3.5">
                        <input
                          disabled={isSelf}
                          type="date"
                          value={u.accessExpiresAt ? u.accessExpiresAt.slice(0, 10) : ''}
                          onChange={(event) => handleUpdateAccess(u, { accessExpiresAt: new Date(`${event.target.value}T23:59:59`).toISOString() })}
                          className="border border-outline-variant rounded-lg p-1 text-[11px] bg-white disabled:opacity-60"
                        />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          disabled={isSelf}
                          onClick={() => handleDeleteUser(u.id, u.fullName)}
                          title={isSelf ? 'Você não pode remover a si mesmo' : 'Remover usuário'}
                          className={`btn-interactive p-1.5 rounded-lg transition-all active:scale-95 inline-flex items-center justify-center ${
                            isSelf
                              ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                              : 'text-red-500 hover:text-red-700 hover:bg-red-50 bg-red-50/20'
                          }`}
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6">
      {/* Header bar */}
      <div className="scroll-reveal flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">TIME OPERACIONAL</h2>
          <p className="text-on-surface opacity-75 text-sm mt-1">
            Convide e gerencie a equipe e os níveis de permissão da sua agência.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-interactive bg-primary text-on-primary font-semibold text-xs px-6 py-3 rounded-lg shadow-sm flex items-center gap-2 hover:shadow-md active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          CONVIDAR MEMBRO
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center text-xs opacity-60 flex items-center justify-center gap-2 shadow-sm">
          <span className="material-symbols-outlined animate-spin">sync</span>
          <span>Carregando time...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {renderTable(
            admins,
            'Administradores da Agência',
            'Usuários com controle total sobre as configurações da agência, faturamento e permissões da equipe.',
            'bg-purple-50 text-purple-700 border-purple-200'
          )}

          {renderTable(
            agents,
            'Consultores / Usuários do SaaS',
            'Usuários com acesso operacional para criar e gerenciar viagens, roteiros e reservas.',
            'bg-blue-50 text-blue-700 border-blue-200'
          )}
        </div>
      )}

      {/* INVITE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-outline-variant shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-base text-primary mb-4">Convidar Novo Membro</h3>
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
                  className="input-interactive border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
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
                  className="input-interactive border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
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
                  className="input-interactive border border-outline-variant rounded-lg p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Nível de Acesso</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-interactive border border-outline-variant rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
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
                  className="input-interactive border border-outline-variant rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-interactive px-4 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-interactive px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90"
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
