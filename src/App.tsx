/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  LogOut, 
  Plus, 
  User as UserIcon, 
  AlertCircle, 
  MessageSquare,
  Play,
  Pause,
  Square,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Task, TimeLog, Feedback } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [view, setView] = useState<'tasks' | 'calendar' | 'admin' | 'feedback'>('tasks');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setError('');
      } else {
        setError('Login falhou. Verifique suas credenciais.');
      }
    } catch (err) {
      setError('Erro ao conectar ao servidor.');
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUsername('');
    setPassword('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-zinc-200"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-zinc-900 p-3 rounded-xl">
              <CheckCircle2 className="text-white w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2 text-zinc-900">TaskMaster Pro</h1>
          <p className="text-zinc-500 text-center mb-8">Entre para gerenciar suas tarefas</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Usuário</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                placeholder="Seu usuário"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-zinc-300 focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button 
              type="submit"
              className="w-full bg-zinc-900 text-white py-2 rounded-lg font-medium hover:bg-zinc-800 transition-colors"
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/debug-db");
                  const data = await res.json();
                  if (data.status === "ok") {
                    alert(`✅ CONEXÃO OK!\n\nBanco: ${data.database}\nTabelas: ${data.tables?.join(", ")}\nUsuário Admin: ${data.adminUser}\n\nSe o Admin estiver "NÃO ENCONTRADO", tente atualizar a página.`);
                  } else {
                    alert(`❌ ERRO DE CONEXÃO!\n\nMensagem: ${data.message}\n\nDetalhes: ${data.details || "Nenhum"}`);
                  }
                } catch (e) {
                  alert("Erro ao conectar com a API de diagnóstico. O servidor pode estar offline.");
                }
              }}
              className="w-full py-2 text-zinc-400 text-[10px] hover:text-zinc-600 transition-all uppercase font-bold tracking-wider"
            >
              Verificar Conexão com Banco de Dados
            </button>
          </form>
          <div className="mt-6 text-center text-xs text-zinc-400">
            Dica: admin / admin123
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-bottom border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900 p-2 rounded-lg">
            <CheckCircle2 className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-zinc-900">TaskMaster Pro</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-zinc-900">{user.name}</p>
            <p className="text-xs text-zinc-500 capitalize">{user.role}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-500"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col p-4 gap-2">
          <SidebarButton 
            active={view === 'tasks'} 
            onClick={() => setView('tasks')} 
            icon={<CheckCircle2 size={18} />} 
            label="Tarefas" 
          />
          <SidebarButton 
            active={view === 'calendar'} 
            onClick={() => setView('calendar')} 
            icon={<CalendarIcon size={18} />} 
            label="Calendário" 
          />
          {user.role === 'master' && (
            <SidebarButton 
              active={view === 'admin'} 
              onClick={() => setView('admin')} 
              icon={<UserIcon size={18} />} 
              label="Equipe" 
            />
          )}
          <SidebarButton 
            active={view === 'feedback'} 
            onClick={() => setView('feedback')} 
            icon={<MessageSquare size={18} />} 
            label="Feedback" 
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {view === 'tasks' && <TasksView user={user} />}
            {view === 'calendar' && <CalendarView user={user} />}
            {view === 'admin' && user.role === 'master' && <AdminView />}
            {view === 'feedback' && <FeedbackView user={user} />}
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Nav */}
      <nav className="md:hidden bg-white border-t border-zinc-200 flex justify-around p-3">
        <button onClick={() => setView('tasks')} className={`p-2 ${view === 'tasks' ? 'text-zinc-900' : 'text-zinc-400'}`}><CheckCircle2 size={24} /></button>
        <button onClick={() => setView('calendar')} className={`p-2 ${view === 'calendar' ? 'text-zinc-900' : 'text-zinc-400'}`}><CalendarIcon size={24} /></button>
        {user.role === 'master' && <button onClick={() => setView('admin')} className={`p-2 ${view === 'admin' ? 'text-zinc-900' : 'text-zinc-400'}`}><UserIcon size={24} /></button>}
        <button onClick={() => setView('feedback')} className={`p-2 ${view === 'feedback' ? 'text-zinc-900' : 'text-zinc-400'}`}><MessageSquare size={24} /></button>
      </nav>
    </div>
  );
}

function SidebarButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all ${
        active 
          ? 'bg-zinc-900 text-white' 
          : 'text-zinc-600 hover:bg-zinc-100'
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// --- Views ---

function TasksView({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState<number | null>(null);
  const [failReason, setFailReason] = useState('');

  const fetchTasks = async () => {
    const res = await fetch(`/api/tasks?userId=${user.id}&role=${user.role}`);
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const updateTaskStatus = async (id: number, status: 'completed' | 'failed', reason?: string) => {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, failure_reason: reason }),
    });
    fetchTasks();
    setShowFailModal(null);
    setFailReason('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900">Suas Tarefas</h2>
          <p className="text-zinc-500">Gerencie suas atividades do dia</p>
        </div>
        {user.role === 'master' && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-zinc-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition-colors"
          >
            <Plus size={18} />
            Nova Tarefa
          </button>
        )}
      </div>

      {user.role === 'collaborator' && <TimeTracker user={user} />}

      <div className="grid gap-4 mt-6">
        {loading ? (
          <div className="text-center py-12 text-zinc-400">Carregando tarefas...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-300 text-zinc-400">
            Nenhuma tarefa encontrada.
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                    task.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    task.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {task.status === 'pending' ? 'Pendente' : task.status === 'completed' ? 'Concluída' : 'Não Concluída'}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">{task.due_date}</span>
                </div>
                <h3 className="font-bold text-zinc-900">{task.title}</h3>
                <p className="text-sm text-zinc-500">{task.description}</p>
                {user.role === 'master' && task.assigned_name && (
                  <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1">
                    <UserIcon size={12} /> {task.assigned_name}
                  </p>
                )}
                {task.failure_reason && (
                  <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded border border-red-100 italic">
                    Motivo: {task.failure_reason}
                  </p>
                )}
              </div>
              
              {task.status === 'pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => updateTaskStatus(task.id, 'completed')}
                    className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                    title="Concluir"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                  <button 
                    onClick={() => setShowFailModal(task.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Não concluída"
                  >
                    <AlertCircle size={20} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      {showAddModal && <AddTaskModal onClose={() => { setShowAddModal(false); fetchTasks(); }} />}
      {showFailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Motivo da Não Conclusão</h3>
            <textarea 
              className="w-full p-3 border border-zinc-300 rounded-lg mb-4 h-32 outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Descreva por que a tarefa não foi concluída..."
              value={failReason}
              onChange={(e) => setFailReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFailModal(null)}
                className="flex-1 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button 
                onClick={() => updateTaskStatus(showFailModal, 'failed', failReason)}
                className="flex-1 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TimeTracker({ user }: { user: User }) {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [status, setStatus] = useState<'idle' | 'working' | 'paused' | 'ended'>('idle');

  const fetchLogs = async () => {
    const res = await fetch(`/api/time-logs/${user.id}`);
    const data = await res.json();
    setLogs(data);
    if (data.length > 0) {
      const last = data[0];
      if (last.type === 'start' || last.type === 'resume') setStatus('working');
      else if (last.type === 'pause') setStatus('paused');
      else if (last.type === 'end') setStatus('ended');
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const logTime = async (type: 'start' | 'pause' | 'resume' | 'end') => {
    await fetch('/api/time-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, type }),
    });
    fetchLogs();
  };

  return (
    <div className="bg-zinc-900 text-white p-6 rounded-2xl shadow-lg mb-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Clock className="text-zinc-400" size={20} />
            Controle de Jornada
          </h3>
          <p className="text-zinc-400 text-sm">Status: 
            <span className={`ml-2 font-mono ${
              status === 'working' ? 'text-green-400' : 
              status === 'paused' ? 'text-yellow-400' : 'text-zinc-500'
            }`}>
              {status === 'idle' ? 'Não Iniciado' : 
               status === 'working' ? 'Em Trabalho' : 
               status === 'paused' ? 'Pausado (Almoço/Descanso)' : 'Jornada Encerrada'}
            </span>
          </p>
        </div>
        
        <div className="flex gap-3">
          {status === 'idle' && (
            <button onClick={() => logTime('start')} className="flex items-center gap-2 bg-white text-zinc-900 px-6 py-2 rounded-full font-bold hover:bg-zinc-200 transition-all">
              <Play size={18} fill="currentColor" /> Iniciar Dia
            </button>
          )}
          {status === 'working' && (
            <>
              <button onClick={() => logTime('pause')} className="flex items-center gap-2 bg-zinc-800 text-white px-6 py-2 rounded-full font-bold hover:bg-zinc-700 border border-zinc-700 transition-all">
                <Pause size={18} fill="currentColor" /> Pausar
              </button>
              <button onClick={() => logTime('end')} className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-full font-bold hover:bg-red-700 transition-all">
                <Square size={18} fill="currentColor" /> Encerrar
              </button>
            </>
          )}
          {status === 'paused' && (
            <button onClick={() => logTime('resume')} className="flex items-center gap-2 bg-white text-zinc-900 px-6 py-2 rounded-full font-bold hover:bg-zinc-200 transition-all">
              <Play size={18} fill="currentColor" /> Retomar
            </button>
          )}
          {status === 'ended' && (
            <p className="text-zinc-500 text-sm italic">Bom descanso!</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AddTaskModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/users').then(res => res.json()).then(setUsers);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, assigned_to: assignedTo, due_date: dueDate }),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl">
        <h3 className="text-2xl font-bold mb-6">Nova Tarefa</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Título</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-2 border rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full p-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Atribuir a</label>
            <select value={assignedTo} onChange={e => setAssignedTo(e.target.value)} className="w-full p-2 border rounded-lg" required>
              <option value="">Selecione um colaborador</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Data Limite</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full p-2 border rounded-lg" required />
          </div>
          <div className="flex gap-2 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border rounded-lg hover:bg-zinc-50">Cancelar</button>
            <button type="submit" className="flex-1 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800">Criar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CalendarView({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetch(`/api/tasks?userId=${user.id}&role=${user.role}`)
      .then(res => res.json())
      .then(setTasks);
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDayOfMonth }, (_, i) => null);

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-900 capitalize">{monthName} {currentDate.getFullYear()}</h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-zinc-100 rounded-full"><ChevronLeft /></button>
          <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-zinc-100 rounded-full"><ChevronRight /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-zinc-200 border border-zinc-200 rounded-xl overflow-hidden">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="bg-zinc-50 p-2 text-center text-xs font-bold text-zinc-500 uppercase">{d}</div>
        ))}
        {[...padding, ...days].map((day, i) => {
          const dateStr = day ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
          const dayTasks = tasks.filter(t => t.due_date === dateStr);

          return (
            <div key={i} className="bg-white min-h-[120px] p-2 border-t border-zinc-100">
              {day && (
                <>
                  <span className="text-sm font-medium text-zinc-400">{day}</span>
                  <div className="mt-1 space-y-1">
                    {dayTasks.map(t => (
                      <div key={t.id} className={`text-[10px] p-1 rounded truncate ${
                        t.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-100' : 
                        t.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                      }`}>
                        {user.role === 'master' && `[${t.assigned_name}] `}{t.title}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function AdminView() {
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const fetchUsers = () => fetch('/api/users').then(res => res.json()).then(setUsers);
  useEffect(() => { fetchUsers(); }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password }),
    });
    setShowAddUser(false);
    setName(''); setUsername(''); setPassword('');
    fetchUsers();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Gerenciar Equipe</h2>
        <button onClick={() => setShowAddUser(true)} className="bg-zinc-900 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={18} /> Novo Colaborador
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm mb-8">
        <div className="p-6 border-b border-zinc-200">
          <h3 className="font-bold text-lg mb-2">Conectar ao Supabase (Vercel)</h3>
          <p className="text-sm text-zinc-500 mb-4">Siga os passos para que seus dados não sumam no Vercel:</p>
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 font-medium">⚠️ Importante: Use os nomes de tabelas em INGLÊS conforme o script abaixo para o sistema funcionar.</p>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase">1. Script SQL (Copie e rode no SQL Editor do Supabase)</label>
              <div className="bg-zinc-900 p-4 rounded-lg mt-1 overflow-x-auto">
                <pre className="text-[10px] text-emerald-400 font-mono">
{`CREATE TABLE users (id SERIAL PRIMARY KEY, username TEXT UNIQUE, password TEXT, role TEXT, name TEXT);
CREATE TABLE tasks (id SERIAL PRIMARY KEY, title TEXT, description TEXT, assigned_to INTEGER REFERENCES users(id), status TEXT DEFAULT 'pending', failure_reason TEXT, due_date TEXT);
CREATE TABLE time_logs (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), type TEXT, timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE feedback (id SERIAL PRIMARY KEY, user_id INTEGER REFERENCES users(id), content TEXT, date TEXT);
INSERT INTO users (username, password, role, name) VALUES ('admin', 'admin123', 'master', 'Administrador');`}
                </pre>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase">2. Variável no Vercel (DATABASE_URL)</label>
              <p className="text-xs text-zinc-500 mb-2">Pegue em: Settings &gt; Database &gt; Connection String &gt; <b>Transaction Mode (Port 6543)</b></p>
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-2">
                <p className="text-[10px] text-red-800"><b>⚠️ ATENÇÃO:</b> Remova os colchetes <b>[ ]</b> da senha. Use apenas a senha pura.</p>
              </div>
              <input readOnly value="postgres://postgres.[PROJETO]:[SENHA]@[HOST]:6543/postgres?pgbouncer=true" className="w-full p-2 bg-zinc-50 border rounded text-xs font-mono" />
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-[10px] text-blue-800 font-medium">🚀 Após salvar no Vercel, vá em <b>Deployments</b> e clique em <b>Redeploy</b>.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm mb-8">
        <div className="p-6 border-b border-zinc-200">
          <h3 className="font-bold text-lg mb-2">Integração com IA (Manus AI)</h3>
          <p className="text-sm text-zinc-500 mb-4">Use os dados abaixo para conectar o TaskMaster Pro ao seu agente de IA.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase">Configuração no Manus AI</label>
              <div className="mt-2 p-3 bg-zinc-900 rounded-lg text-xs space-y-2">
                <p className="text-zinc-300"><span className="text-white font-bold">1. Nome do Segredo:</span> <code className="bg-zinc-800 px-1 rounded text-emerald-400">AI_API_KEY</code></p>
                <p className="text-zinc-300"><span className="text-white font-bold">2. Valor:</span> <code className="bg-zinc-800 px-1 rounded text-emerald-400">mestre_das_tarefas_123</code></p>
                <p className="text-zinc-300"><span className="text-white font-bold">3. Header na API:</span> <code className="bg-zinc-800 px-1 rounded text-emerald-400">x-api-key</code></p>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-400 uppercase">URL da Documentação</label>
              <div className="flex gap-2 mt-1">
                <input readOnly value={`${window.location.origin}/api/docs`} className="flex-1 p-2 bg-zinc-50 border rounded text-sm font-mono" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">Nome</th>
              <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">Usuário</th>
              <th className="px-6 py-3 text-xs font-bold text-zinc-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 font-medium">{u.name}</td>
                <td className="px-6 py-4 text-zinc-500">{u.username}</td>
                <td className="px-6 py-4">
                  <button className="text-zinc-400 hover:text-zinc-900 transition-colors">Ver Logs</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-8 rounded-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-6">Cadastrar Colaborador</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Usuário</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full p-2 border rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Senha</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded-lg" required />
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowAddUser(false)} className="flex-1 py-2 border rounded-lg">Cancelar</button>
                <button type="submit" className="flex-1 py-2 bg-zinc-900 text-white rounded-lg">Cadastrar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function FeedbackView({ user }: { user: User }) {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [content, setContent] = useState('');

  const fetchFeedbacks = async (uid: number) => {
    const res = await fetch(`/api/feedback/${uid}`);
    const data = await res.json();
    setFeedbacks(data);
  };

  useEffect(() => {
    if (user.role === 'master') {
      fetch('/api/users').then(res => res.json()).then(setUsers);
    } else {
      fetchFeedbacks(user.id);
    }
  }, []);

  const handleSendFeedback = async () => {
    if (!selectedUser || !content) return;
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUser, content, date: new Date().toISOString().split('T')[0] }),
    });
    setContent('');
    fetchFeedbacks(selectedUser);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Feedback Diário</h2>
        <p className="text-zinc-500">Acompanhamento de desempenho e observações</p>
      </div>

      {user.role === 'master' && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm mb-8">
          <h3 className="font-bold mb-4">Enviar Novo Feedback</h3>
          <div className="space-y-4">
            <select 
              className="w-full p-2 border rounded-lg"
              onChange={(e) => {
                const uid = Number(e.target.value);
                setSelectedUser(uid);
                if (uid) fetchFeedbacks(uid);
              }}
            >
              <option value="">Selecione um colaborador</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <textarea 
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-zinc-900"
              placeholder="Escreva o feedback de hoje..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
            <button 
              onClick={handleSendFeedback}
              className="bg-zinc-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-zinc-800 transition-colors"
            >
              Enviar Feedback
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="font-bold text-zinc-900">Histórico de Feedbacks</h3>
        {feedbacks.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 rounded-2xl border border-dashed border-zinc-300 text-zinc-400">
            Nenhum feedback registrado.
          </div>
        ) : (
          feedbacks.map(f => (
            <div key={f.id} className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-mono text-zinc-400">{f.date}</span>
              </div>
              <p className="text-zinc-700 whitespace-pre-wrap">{f.content}</p>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
