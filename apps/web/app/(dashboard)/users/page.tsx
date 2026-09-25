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
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'agent' as User['role'],
    phone: '',
    password: '',
    passwordConfirm: '',
    accessStatus: 'active' as 'active' | 'blocked',
    accessExpiresAt: getDefaultAccessDate(),
  });

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      role: 'agent',
      phone: '',
      password: '',
      passwordConfirm: '',
      accessStatus: 'active',
      accessExpiresAt: getDefaultAccessDate(),
    });
    setFormError('');
    setShowPassword(false);
  };

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
    // Initial client-side hydration from the authenticated API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    setFormError('');
    if (!formData.fullName || !formData.email || !formData.password) {
      setFormError('Preencha nome, e-mail e senha inicial.');
      return;
    }
    if (formData.password.length < 8) {
      setFormError('A senha inicial deve ter pelo menos 8 caracteres.');
      return;
    }
    if (formData.password !== formData.passwordConfirm) {
      setFormError('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchUsers();
        resetForm();
        setShowModal(false);
      } else {
        const data = await response.json().catch(() => null);
        setFormError(data?.error || 'Não foi possível criar o colaborador.');
      }
    } catch (error) {
      console.error(error);
      setFormError('Erro de conexão ao criar o colaborador.');
    } finally {
      setSubmitting(false);
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

  const canManageTeam = currentUser?.role === 'agency_admin';
  const isExpired = (user: User) => Boolean(user.accessExpiresAt && new Date(user.accessExpiresAt) < new Date());
  const activeUsers = users.filter((user) => (!user.accessStatus || user.accessStatus === 'active') && !isExpired(user));
  const admins = activeUsers.filter((u) => u.role === 'agency_admin');
  const agents = activeUsers.filter((u) => u.role === 'agent');
  const historyUsers = users.filter((user) => user.accessStatus === 'blocked' || user.accessStatus === 'pending' || isExpired(user));

  const renderTable = (list: User[], title: string, subtitle: string, badgeColorClass: string) => {
    return (
      <div className="motion-panel-in bg-white rounded-xl border border-outline-variant overflow-hidden shadow-sm flex flex-col">
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
                          disabled={isSelf || !canManageTeam}
                          value={u.accessStatus === 'active' || !u.accessStatus ? 'active' : 'blocked'}
                          onChange={(event) => handleUpdateAccess(u, { accessStatus: event.target.value as 'active' | 'blocked' })}
                          className="border border-outline-variant rounded-lg p-1 text-[11px] bg-white font-bold disabled:opacity-60"
                        >
                          <option value="active">Ativo</option>
                          <option value="blocked">Bloqueado</option>
                        </select>
                      </td>
                      <td className="px-6 py-3.5">
                        <input
                          disabled={isSelf || !canManageTeam}
                          type="date"
                          value={u.accessExpiresAt ? u.accessExpiresAt.slice(0, 10) : ''}
                          onChange={(event) => handleUpdateAccess(u, { accessExpiresAt: new Date(`${event.target.value}T23:59:59`).toISOString() })}
                          className="border border-outline-variant rounded-lg p-1 text-[11px] bg-white disabled:opacity-60"
                        />
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <button
                          disabled={isSelf || !canManageTeam}
                          onClick={() => handleDeleteUser(u.id, u.fullName)}
                          title={isSelf ? 'Você não pode remover a si mesmo' : !canManageTeam ? 'Apenas administradores podem remover membros' : 'Remover usuário'}
                          className={`btn-interactive p-1.5 rounded-lg transition-all active:scale-95 inline-flex items-center justify-center ${
                            isSelf || !canManageTeam
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
      <div className="page-heading scroll-reveal flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-3xl font-black text-primary tracking-[-.035em]">Time operacional</h2>
          <p className="text-on-surface opacity-75 text-sm mt-1">
            Cadastre e gerencie a equipe e os níveis de permissão da sua agência.
          </p>
        </div>
        {canManageTeam && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-interactive bg-coral text-white font-bold text-xs px-6 py-3 rounded-xl shadow-[0_10px_24px_rgba(255,84,45,.2)] flex items-center gap-2 hover:shadow-md active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            ADICIONAR MEMBRO
          </button>
        )}
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-primary/10 bg-white p-1.5 shadow-sm">
        {[
          ['active', 'group', 'Membros ativos', activeUsers.length],
          ['history', 'history', 'Acessos inativos', historyUsers.length],
        ].map(([id, icon, label, count]) => <button key={String(id)} onClick={() => setActiveTab(id as typeof activeTab)} className={`flex min-w-fit flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all duration-200 active:scale-[.98] ${activeTab === id ? 'bg-primary text-white shadow-sm' : 'text-on-surface/55 hover:bg-surface-container-low'}`}><span className="material-symbols-outlined text-[17px]">{icon}</span>{label}<span className={`rounded-full px-2 py-0.5 text-[9px] ${activeTab === id ? 'bg-white/15' : 'bg-primary/8 text-primary'}`}>{count}</span></button>)}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-outline-variant p-12 text-center text-xs opacity-60 flex items-center justify-center gap-2 shadow-sm">
          <span className="material-symbols-outlined animate-spin">sync</span>
          <span>Carregando time...</span>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'active' && <>
          {renderTable(
            admins,
            'Administradores da Agência',
            'Usuários com controle total sobre as configurações da agência, faturamento e permissões da equipe.',
            'bg-ice-blue text-primary border-primary/15'
          )}

          {renderTable(
            agents,
            'Consultores / Usuários do SaaS',
            'Usuários com acesso operacional para criar e gerenciar viagens, roteiros e reservas.',
            'bg-ice-blue text-primary border-primary/15'
          )}
          </>}
          {activeTab === 'history' && renderTable(historyUsers, 'Acessos inativos', 'Membros com acesso bloqueado ou expirado, disponíveis para consulta e reativação.', 'bg-surface-container text-on-surface border-outline-variant')}
        </div>
      )}

      {/* DIRECT USER REGISTRATION MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-outline-variant bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-base text-primary">Adicionar membro</h3>
            <p className="mb-4 mt-1 text-xs text-on-surface/65">
              Crie o acesso agora e compartilhe o e-mail e a senha inicial com o colaborador.
            </p>
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
                <label className="text-xs font-semibold">Status inicial do acesso</label>
                <select
                  name="accessStatus"
                  value={formData.accessStatus}
                  onChange={handleChange}
                  className="input-interactive border border-outline-variant rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                >
                  <option value="active">Ativo — pode acessar imediatamente</option>
                  <option value="blocked">Bloqueado — login impedido</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Senha inicial</label>
                  <div className="relative">
                    <input
                      required
                      minLength={8}
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={handleChange}
                      className="input-interactive w-full rounded-lg border border-outline-variant p-2 pr-9 text-xs outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-on-surface/50"
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      <span className="material-symbols-outlined text-base">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold">Confirmar senha</label>
                  <input
                    required
                    minLength={8}
                    type={showPassword ? 'text' : 'password'}
                    name="passwordConfirm"
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    value={formData.passwordConfirm}
                    onChange={handleChange}
                    className="input-interactive rounded-lg border border-outline-variant p-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold">Acesso válido até</label>
                <input
                  required
                  type="date"
                  name="accessExpiresAt"
                  value={formData.accessExpiresAt}
                  onChange={handleChange}
                  className="input-interactive border border-outline-variant rounded-lg p-2 text-xs bg-white focus:ring-1 focus:ring-primary outline-none"
                />
              </div>

              {formError && (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowModal(false);
                  }}
                  disabled={submitting}
                  className="btn-interactive px-4 py-2 border border-outline rounded-lg text-xs font-semibold hover:bg-surface-container"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-interactive px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-bold hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                >
                  {submitting ? 'Adicionando...' : 'Adicionar membro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
