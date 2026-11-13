import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Users,
  CheckSquare,
  FileCheck2,
  Sparkles,
  ShieldCheck,
  LogOut,
  Search,
  Crown,
  Play,
  ArrowRight,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  ArrowLeftRight,
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Github,
  FileText,
  CheckCircle2,
  Eye,
  X,
  Presentation,
  Send,
} from 'lucide-react';
import AssistantPanel from './components/AssistantPanel.jsx';
import SafetyPanel from './components/SafetyPanel.jsx';
import MeetingPresenterModal from './components/MeetingPresenterModal.jsx';

export default function App() {
  // ==========================================================================
  // 1. AUTHENTICATION STATE
  // ==========================================================================
  const [token, setToken] = useState(() => localStorage.getItem('qubenix_session') || '');
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('qubenix_user');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });
  const [authForm, setAuthForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | interns | tasks | submissions | assistant | safety
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Dashboard AI Card -> Full AI Assistant Navigation State
  const [dashboardAiInput, setDashboardAiInput] = useState('');
  const [pendingAiQuery, setPendingAiQuery] = useState(null);
  const [aiMessages, setAiMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        `### Hi! I'm **Qubenix Assistant**\n` +
        `Ask me anything about what's happening with your team right now — intern updates, pending tasks, or work ready for review.`,
      blocked: false,
    },
  ]);

  // Workspace Data
  const [stats, setStats] = useState({
    totalInterns: 0,
    activeInterns: 0,
    onboardingInterns: 0,
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    pendingTasks: 0,
    submittedCount: 0,
    completionRate: 0,
  });
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Dashboard interactive controls
  const [matrixPeriod, setMatrixPeriod] = useState('D');
  const [subCarouselIdx, setSubCarouselIdx] = useState(0);

  // Modals
  const [internModal, setInternModal] = useState({ open: false, mode: 'add', data: null });
  const [profileDrawer, setProfileDrawer] = useState(null);
  const [taskModal, setTaskModal] = useState({ open: false, mode: 'add', data: null });
  const [submitModal, setSubmitModal] = useState({ open: false, task: null });

  // Filters
  const [deptFilter, setDeptFilter] = useState('All');
  const [taskStatusFilter, setTaskStatusFilter] = useState('All');

  const isAdmin = user?.role === 'admin';

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDashboardData = async (activeToken = token) => {
    if (!activeToken) return;
    try {
      const res = await fetch('/api/dashboard', {
        headers: { Authorization: `Bearer ${activeToken}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setStats(data.stats);
        setInterns(data.interns || []);
        setTasks(data.tasks || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (token && user) {
      fetchDashboardData(token);
    }
  }, [token]);

  useEffect(() => {
    if (!isAdmin && activeTab === 'safety') {
      setActiveTab('dashboard');
    }
  }, [isAdmin, activeTab]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setAuthError(data.error || 'Incorrect email or password.');
      } else {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('qubenix_session', data.token);
        localStorage.setItem('qubenix_user', JSON.stringify(data.user));
        setActiveTab('dashboard');
        setAuthForm({ email: '', password: '' });
        notify(`Welcome, ${data.user.name}!`);
      }
    } catch (_) {
      setAuthError('Unable to reach the server. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken('');
    setUser(null);
    setInterns([]);
    setTasks([]);
    setAuditLogs([]);
    setDashboardAiInput('');
    setPendingAiQuery(null);
    setAiMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text:
          `### Hi! I'm **Qubenix Assistant**\n` +
          `Ask me anything about what's happening with your team right now — intern updates, pending tasks, or work ready for review.`,
        blocked: false,
      },
    ]);
    localStorage.removeItem('qubenix_session');
    localStorage.removeItem('qubenix_user');
  };

  const openAssistantWithQuery = (rawText) => {
    const queryText = String(rawText ?? dashboardAiInput).trim();
    if (!queryText) return;
    setDashboardAiInput('');
    setPendingAiQuery({ id: Date.now(), text: queryText });
    setActiveTab('assistant');
  };

  // ==========================================================================
  // 2. CRUD HANDLERS (INTERNS, TASKS, SUBMISSIONS, REVIEWS)
  // ==========================================================================
  const handleSaveIntern = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const isEdit = internModal.mode === 'edit' && internModal.data?.id;
    const url = isEdit ? `/api/interns/${internModal.data.id}` : '/api/interns';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Could not save intern.', 'error');
        return;
      }
      setInternModal({ open: false, mode: 'add', data: null });
      notify(isEdit ? `Updated ${data.intern.name}.` : `Added ${data.intern.name} to the team!`);
      await fetchDashboardData();
    } catch (_) {
      notify('Unable to save intern.', 'error');
    }
  };

  const handleDeleteIntern = async (id, name) => {
    try {
      const res = await fetch(`/api/interns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Could not remove intern.', 'error');
        return;
      }
      notify(`Removed ${name} from the team.`);
      if (profileDrawer?.id === id) setProfileDrawer(null);
      await fetchDashboardData();
    } catch (_) {
      notify('Error removing intern.', 'error');
    }
  };

  const handleSaveTask = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const isEdit = taskModal.mode === 'edit' && taskModal.data?.id;
    const url = isEdit ? `/api/tasks/${taskModal.data.id}` : '/api/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Could not save task.', 'error');
        return;
      }
      setTaskModal({ open: false, mode: 'add', data: null });
      notify(isEdit ? 'Task updated.' : `Assigned "${data.task.title}"!`);
      await fetchDashboardData();
    } catch (_) {
      notify('Error saving task.', 'error');
    }
  };

  const handleQuickTaskStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        notify(`Task marked as ${newStatus}`);
        await fetchDashboardData();
      }
    } catch (_) {}
  };

  const handleDeleteTask = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        notify('Task removed.');
        await fetchDashboardData();
      }
    } catch (_) {}
  };

  const handleWorkSubmission = async (e) => {
    e.preventDefault();
    if (!submitModal.task) return;
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const res = await fetch(`/api/tasks/${submitModal.task.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || 'Please check your links and description.', 'error');
        return;
      }
      setSubmitModal({ open: false, task: null });
      notify('Work submitted successfully!');
      await fetchDashboardData();
    } catch (_) {
      notify('Unable to submit work.', 'error');
    }
  };

  const handleReviewSubmission = async (taskId, reviewPayload) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reviewPayload),
      });
      const data = await res.json();
      if (res.ok) {
        notify(`Task marked as ${data.task.status}`);
        await fetchDashboardData();
      } else {
        notify(data.error || 'Could not update review.', 'error');
      }
    } catch (_) {}
  };

  // ==========================================================================
  // 3. DERIVED LISTS
  // ==========================================================================
  const submittedTasks = useMemo(
    () => tasks.filter((t) => t.submission && t.submission.description),
    [tasks]
  );

  const currentSubmission =
    submittedTasks.length > 0 ? submittedTasks[subCarouselIdx % submittedTasks.length] : null;

  const filteredInterns = useMemo(() => {
    return interns.filter((i) => {
      const matchesDept = deptFilter === 'All' || i.status === deptFilter || i.department === deptFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q);
      return matchesDept && matchesSearch;
    });
  }, [interns, deptFilter, searchQuery]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesStatus = taskStatusFilter === 'All' || t.status === taskStatusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.internName.toLowerCase().includes(q) ||
        t.department.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [tasks, taskStatusFilter, searchQuery]);

  const vesselSlots = useMemo(() => {
    const total = Math.max(1, stats.totalTasks);
    const fullCount = stats.totalTasks === 0 ? 0 : Math.round((stats.completedTasks / total) * 18);
    const halfCount = stats.totalTasks === 0 ? 0 : Math.round((stats.inProgressTasks / total) * 18);
    return Array.from({ length: 18 }, (_, i) => {
      let state = 'empty';
      if (i < fullCount) state = 'full';
      else if (i < fullCount + halfCount) state = 'half';
      return { index: i, state, task: tasks[i % Math.max(1, tasks.length)] || null };
    });
  }, [tasks, stats]);

  const barSegments = useMemo(() => {
    if (stats.totalTasks === 0) {
      return Array.from({ length: 24 }, () => 'pending');
    }
    const compBars = Math.round((stats.completedTasks / stats.totalTasks) * 24);
    const progBars = Math.round((stats.inProgressTasks / stats.totalTasks) * 24);
    return Array.from({ length: 24 }, (_, idx) => {
      if (idx < compBars) return 'completed';
      if (idx < compBars + progBars) return 'progress';
      return 'pending';
    });
  }, [stats]);

  // ==========================================================================
  // 4. MINIMAL LOGIN SCREEN (MATCHES DASHBOARD THEME, ZERO IMAGE, ZERO JARGON)
  // ==========================================================================
  if (!token || !user) {
    return (
      <div className="min-h-screen w-full bg-[#edf4fa] flex items-center justify-center p-4 text-[#141a21]">
        <div className="anim-enter w-full max-w-md rounded-[30px] bg-white p-8 shadow-[0_16px_44px_rgba(16,38,68,0.07)] border border-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#278cf5] text-white font-bold text-lg shadow-sm">
              Q
            </div>
            <div>
              <h1 className="font-tight text-lg font-bold leading-none tracking-tight">Qubenix AI</h1>
              <span className="text-xs text-slate-500">Intern Management System</span>
            </div>
          </div>

          <h2 className="font-tight mt-7 text-3xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Enter your email and password to access your workspace.
          </p>

          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={authForm.email}
                onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                placeholder="you@qubenix.ai"
                className="w-full rounded-2xl border border-slate-200 bg-[#f6f9fc] px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#278cf5] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={authForm.password}
                onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                placeholder="Enter your password"
                className="w-full rounded-2xl border border-slate-200 bg-[#f6f9fc] px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#278cf5] focus:bg-white transition"
              />
            </div>

            {authError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-700">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full rounded-full bg-[#278cf5] py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#1a7ae0] transition disabled:opacity-50"
            >
              {authLoading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Navigation items (Safety & Activity strictly Admin-Only)
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'interns', label: isAdmin ? 'Interns' : 'My Profile', icon: Users },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'submissions', label: 'Submissions', icon: FileCheck2 },
    { id: 'assistant', label: 'Assistant', icon: Sparkles },
    ...(isAdmin ? [{ id: 'safety', label: 'Safety & Activity', icon: ShieldCheck }] : []),
  ];

  // ==========================================================================
  // 5. MAIN CLEAN BENTO DASHBOARD (LEFT-ANCHORED SIDEBAR + TOP-CENTER AI)
  // ==========================================================================
  return (
    <div className="min-h-screen w-full bg-[#edf4fa] text-[#141a21]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 rounded-full px-5 py-2.5 text-xs font-bold shadow-xl transition-all ${
            toast.type === 'error'
              ? 'bg-rose-600 text-white'
              : 'bg-[#1a2228] text-[#c6e35c]'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-current" />
          {toast.msg}
        </div>
      )}

      {/* Full-width container anchored cleanly to the left */}
      <div className="flex min-h-screen w-full flex-col lg:flex-row p-3 sm:p-4 gap-4 sm:gap-5">
        {/* LEFT SIDEBAR RAIL (Flush left, evenly aligned icons) */}
        <aside className="flex lg:flex-col items-center justify-between rounded-[30px] bg-white px-3 py-3 lg:py-5 lg:w-[72px] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] shrink-0 shadow-[0_10px_32px_rgba(18,38,63,0.06)] border border-white">
          {/* Top Brand Circle */}
          <button
            onClick={() => setActiveTab('dashboard')}
            title="Dashboard Home"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#23272a] text-white font-bold text-base shadow-sm hover:scale-105 transition"
          >
            Q
          </button>

          {/* Navigation Icons */}
          <nav className="flex lg:flex-col items-center justify-center gap-2 sm:gap-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-11 w-11 items-center justify-center rounded-full transition-all ${
                    active
                      ? 'bg-[#8fa832] text-white shadow-[0_6px_16px_rgba(143,168,50,0.4)]'
                      : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              );
            })}
          </nav>

          {/* Bottom Sign Out & User Avatar */}
          <div className="flex lg:flex-col items-center gap-3 shrink-0">
            <button
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Sign Out"
              className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            >
              <LogOut className="h-4 w-4" />
            </button>

            <div
              title={user.name}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#278cf5] text-white text-xs font-bold border-2 border-[#8fa832]"
            >
              {user.name?.slice(0, 2).toUpperCase() || 'QA'}
            </div>
          </div>
        </aside>

        {/* MAIN WORKSPACE */}
        <main className="flex-1 flex flex-col min-w-0 space-y-5 pr-1">
          {/* TOP HEADER */}
          <header className="flex flex-wrap items-center justify-between gap-4 pt-1">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="font-tight text-2xl sm:text-[30px] font-bold tracking-tight leading-none">
                  Hi, {user.name?.split(' ')[0] || 'there'}!
                </h1>
                <span
                  className={`rounded-full px-3 py-0.5 text-[11px] font-bold ${
                    isAdmin
                      ? 'bg-[#8fa832]/15 text-[#728725]'
                      : 'bg-[#278cf5]/15 text-[#278cf5]'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Intern'}
                </span>
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500">
                Let&apos;s look at your daily team and task overview.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 rounded-full bg-white px-4 py-2.5 w-56 sm:w-72 shadow-[0_4px_20px_rgba(16,38,68,0.05)] border border-slate-200/60">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search interns or tasks..."
                  className="w-full bg-transparent text-xs sm:text-[13px] outline-none placeholder:text-slate-400"
                />
              </div>

              <button
                onClick={() =>
                  isAdmin
                    ? setTaskModal({ open: true, mode: 'add', data: null })
                    : setActiveTab('tasks')
                }
                className="inline-flex items-center gap-2 rounded-full bg-[#14171a] px-5 py-2.5 text-xs sm:text-[13px] font-semibold text-white shadow-md hover:bg-[#278cf5] transition"
              >
                <Crown className="h-4 w-4 text-[#f5c442] fill-current" />
                {isAdmin ? 'Assign Task' : 'My Tasks'}
              </button>
            </div>
          </header>

          {/* ==================================================================
              TAB 1: DASHBOARD (CLEAN BENTO CARDS + AI ASSISTANT CARD BELOW)
              ================================================================== */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              {/* TOP BENTO ROW: 2 BLUE CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* CARD 1: HERO TEAM HUB CARD */}
                <div className="relative overflow-hidden rounded-[30px] p-6 sm:p-8 text-white lg:col-span-7 flex flex-col justify-between min-h-[290px] shadow-[0_18px_45px_rgba(39,140,245,0.20)] bg-gradient-to-br from-[#278cf5] via-[#3495f8] to-[#1e74d4]">
                  <div className="max-w-md">
                    <h2 className="font-tight text-3xl sm:text-[38px] font-bold leading-[1.12] tracking-tight">
                      Your Team Workspace Starts Here!
                    </h2>
                  </div>

                  {/* Center Play Button ("Show in Meeting") */}
                  <div className="my-4 flex flex-col items-center justify-center">
                    <button
                      onClick={() => setShowMeetingModal(true)}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 backdrop-blur-md border-2 border-white/70 text-white shadow-lg transition hover:scale-110 hover:bg-white/35"
                      aria-label="Show in Meeting"
                    >
                      <Play className="h-5 w-5 fill-current ml-0.5" />
                    </button>
                    <span className="mt-2 text-xs sm:text-sm font-semibold text-white">
                      Show in Meeting ({stats.submittedCount} Ready)
                    </span>
                  </div>

                  {/* Bottom Row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div>
                      <span className="block text-[11px] font-medium text-white/85 mb-1">
                        Team overview:
                      </span>
                      <div className="flex items-center gap-3">
                        {interns.length > 0 && (
                          <div className="flex -space-x-2.5">
                            {interns.slice(0, 4).map((int) => (
                              <img
                                key={int.id}
                                src={int.avatar}
                                alt={int.name}
                                onClick={() => setProfileDrawer(int)}
                                className="h-9 w-9 cursor-pointer rounded-full border-2 border-white object-cover bg-white"
                              />
                            ))}
                          </div>
                        )}
                        <div>
                          <div className="font-tight text-lg font-bold leading-none">
                            {stats.totalInterns} {stats.totalInterns === 1 ? 'Intern' : 'Interns'}
                          </div>
                          <div className="text-[11px] text-white/85 mt-0.5">
                            {stats.activeInterns} Active
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        isAdmin
                          ? setInternModal({ open: true, mode: 'add', data: null })
                          : setActiveTab('submissions')
                      }
                      className="inline-flex items-center gap-3 rounded-full bg-[#111315] pl-5 pr-2 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg hover:bg-[#1e242b] transition"
                    >
                      <span>{isAdmin ? 'Add Intern' : 'Submit Work'}</span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#111315]">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  </div>
                </div>

                {/* CARD 2: TASK COMPLETION MATRIX CARD */}
                <div className="relative overflow-hidden rounded-[30px] p-6 sm:p-7 text-white lg:col-span-5 flex flex-col justify-between min-h-[290px] shadow-[0_18px_45px_rgba(39,140,245,0.18)] bg-gradient-to-br from-[#3897f8] to-[#2684e8]">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                    <div className="sm:col-span-5 space-y-3">
                      <h3 className="font-tight text-lg font-semibold tracking-tight">
                        Task Progress
                      </h3>
                      <p className="text-xs leading-relaxed text-white/85">
                        Track daily deliverables and keep team projects moving smoothly.
                      </p>
                      <div className="pt-1">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#c6e35c] px-3.5 py-1.5 text-xs font-extrabold text-[#1a2804] shadow-sm">
                          {stats.completionRate >= 50 ? 'On Track' : 'Getting Started'}
                          <ThumbsUp className="h-3.5 w-3.5 fill-current" />
                        </span>
                      </div>
                    </div>

                    <div className="sm:col-span-7 grid grid-cols-6 gap-2 justify-items-center">
                      {vesselSlots.map((slot) => (
                        <button
                          key={slot.index}
                          onClick={() => {
                            if (slot.task) setSubmitModal({ open: true, task: slot.task });
                          }}
                          title={slot.task ? `${slot.task.title} (${slot.task.status})` : 'No task yet'}
                          className="h-8 w-5 overflow-hidden transition hover:scale-110"
                          style={{
                            clipPath: 'polygon(8% 0%, 92% 0%, 82% 100%, 18% 100%)',
                            borderRadius: '4px',
                          }}
                        >
                          {slot.state === 'full' ? (
                            <div className="h-full w-full bg-[#094b8c]" />
                          ) : slot.state === 'half' ? (
                            <div className="flex h-full w-full flex-col">
                              <div className="h-1/2 w-full bg-white" />
                              <div className="h-1/2 w-full bg-[#094b8c]" />
                            </div>
                          ) : (
                            <div className="h-full w-full bg-white/95" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex items-end justify-between">
                    <div className="flex items-center gap-2">
                      {['D', 'W', 'M'].map((p) => (
                        <button
                          key={p}
                          onClick={() => setMatrixPeriod(p)}
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition ${
                            matrixPeriod === p
                              ? 'bg-white text-[#141a21] shadow-md'
                              : 'bg-white/25 text-white hover:bg-white/35'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>

                    <div className="text-right">
                      <div className="font-tight text-4xl sm:text-[48px] font-medium leading-none tracking-tight">
                        {matrixPeriod === 'D'
                          ? `${stats.completedTasks}/${stats.totalTasks}`
                          : matrixPeriod === 'W'
                          ? `${stats.completionRate}%`
                          : `${stats.submittedCount}`}
                      </div>
                      <div className="mt-1 text-xs font-medium text-white/90">
                        {matrixPeriod === 'D'
                          ? 'Tasks Done'
                          : matrixPeriod === 'W'
                          ? 'Completed'
                          : 'Submitted'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM BENTO ROW: 3 CLEAN WHITE CARDS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* CARD 3: WORK REVIEWS */}
                <div className="rounded-[30px] p-6 lg:col-span-4 flex flex-col justify-between bg-white text-[#141a21] shadow-[0_12px_35px_rgba(16,38,68,0.05)] border border-slate-100">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-tight text-xl font-bold leading-snug tracking-tight">
                        Work Reviews
                      </h3>
                      <button
                        onClick={() => setShowMeetingModal(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#278cf5] hover:underline"
                      >
                        <Presentation className="h-3.5 w-3.5" />
                        Meeting View
                      </button>
                    </div>

                    {currentSubmission ? (
                      <div className="mt-4 rounded-2xl p-4 border border-slate-200/80 bg-[#f9fbfd]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf3fc] px-3 py-1 text-[11px] font-semibold text-[#185a9d]">
                            <span className="h-2 w-2 rounded-full bg-[#278cf5]" />
                            {currentSubmission.internName} · {currentSubmission.status}
                          </span>
                        </div>

                        <div className="mt-2.5 text-xs font-bold line-clamp-1">
                          {currentSubmission.title}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
                          {currentSubmission.submission?.description}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {currentSubmission.submission?.githubUrl && (
                            <a
                              href={currentSubmission.submission.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-[#14171a] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#278cf5]"
                            >
                              <Github className="h-3 w-3" />
                              Project
                            </a>
                          )}
                          {currentSubmission.submission?.documentUrl && (
                            <a
                              href={currentSubmission.submission.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full bg-slate-200/80 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-300"
                            >
                              <FileText className="h-3 w-3" />
                              Document
                            </a>
                          )}
                          {isAdmin && currentSubmission.status !== 'Completed' && (
                            <button
                              onClick={() =>
                                handleReviewSubmission(currentSubmission.id, {
                                  status: 'Completed',
                                  reviewerNote: 'Approved by Admin.',
                                })
                              }
                              className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#8fa832] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#7b9228]"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              Approve
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-[#f9fbfd] p-5 text-xs text-slate-500">
                        No work submitted yet. Submissions from your interns will show up here for review.
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-1">
                    <div className="font-tight text-2xl font-bold">
                      {submittedTasks.length === 0 ? 0 : (subCarouselIdx % submittedTasks.length) + 1}
                      <span className="text-sm font-normal text-slate-400">
                        /{submittedTasks.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        disabled={submittedTasks.length === 0}
                        onClick={() =>
                          setSubCarouselIdx(
                            (prev) => (prev - 1 + submittedTasks.length) % submittedTasks.length
                          )
                        }
                        aria-label="Previous submission"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f6fb] text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        disabled={submittedTasks.length === 0}
                        onClick={() =>
                          setSubCarouselIdx((prev) => (prev + 1) % submittedTasks.length)
                        }
                        aria-label="Next submission"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f6fb] text-slate-700 hover:bg-slate-200 disabled:opacity-40 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* CARD 4: ASSIGNED TASKS */}
                <div className="rounded-[30px] p-6 lg:col-span-4 flex flex-col justify-between bg-white text-[#141a21] shadow-[0_12px_35px_rgba(16,38,68,0.05)] border border-slate-100">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f6fb] text-slate-900">
                          <Flame className="h-4 w-4 fill-current" />
                        </span>
                        <span className="font-tight text-lg font-bold">Assigned Tasks</span>
                      </div>
                      <span className="font-tight text-lg font-bold">
                        {stats.totalTasks} <span className="text-xs font-normal text-slate-400">Total</span>
                      </span>
                    </div>

                    <div className="mt-3 font-tight text-4xl font-semibold leading-none tracking-tight">
                      {stats.completedTasks}
                      <span className="ml-1.5 text-base font-normal text-slate-400">Completed</span>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-1 h-12">
                      {barSegments.map((seg, i) => (
                        <span
                          key={i}
                          className={`h-full flex-1 rounded-full ${
                            seg === 'completed'
                              ? 'bg-[#8fa832]'
                              : seg === 'progress'
                              ? 'bg-[#b7d154]'
                              : 'bg-[#e6efd1]'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2 pt-3 border-t border-slate-100">
                    <div>
                      <div className="font-tight text-lg font-bold">{stats.completedTasks}</div>
                      <div className="text-xs text-slate-500">Completed</div>
                    </div>
                    <div>
                      <div className="font-tight text-lg font-bold">{stats.inProgressTasks}</div>
                      <div className="text-xs text-slate-500">In Progress</div>
                    </div>
                    <div>
                      <div className="font-tight text-lg font-bold">{stats.pendingTasks}</div>
                      <div className="text-xs text-slate-500">Pending</div>
                    </div>
                  </div>
                </div>

                {/* CARD 5: ACTIVE INTERNS */}
                <div className="rounded-[30px] p-6 lg:col-span-4 flex flex-col justify-between bg-white text-[#141a21] shadow-[0_12px_35px_rgba(16,38,68,0.05)] border border-slate-100">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1f6fb] text-slate-900">
                          <ArrowLeftRight className="h-4 w-4" />
                        </span>
                        <span className="font-tight text-lg font-bold">Active Interns</span>
                      </div>
                      <span className="font-tight text-lg font-bold">
                        {stats.totalInterns} <span className="text-xs font-normal text-slate-400">Total</span>
                      </span>
                    </div>

                    <div className="my-5 h-24 w-full">
                      <svg viewBox="0 0 360 100" className="h-full w-full overflow-visible">
                        <defs>
                          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#7eb8da" stopOpacity="0.2" />
                            <stop offset="50%" stopColor="#278cf5" stopOpacity="0.9" />
                            <stop offset="100%" stopColor="#7eb8da" stopOpacity="0.2" />
                          </linearGradient>
                          <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#9bc9e8" stopOpacity="0.15" />
                            <stop offset="55%" stopColor="#8bc0e4" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#9bc9e8" stopOpacity="0.15" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M 10 72 C 65 25, 125 25, 185 62 C 245 96, 305 28, 352 60"
                          fill="none"
                          stroke="url(#waveGrad2)"
                          strokeWidth="7"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 62 C 58 14, 112 14, 168 60 C 224 104, 282 18, 352 66"
                          fill="none"
                          stroke="url(#waveGrad1)"
                          strokeWidth="7.5"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="92"
                          cy="25"
                          r="6.5"
                          fill="#278cf5"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                        />
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-end justify-between pt-1">
                    <div className="font-tight text-5xl font-semibold leading-none tracking-tight">
                      {stats.activeInterns}
                      <span className="ml-1.5 text-lg font-medium text-slate-500">active</span>
                    </div>

                    <div className="text-right text-xs leading-relaxed text-slate-500">
                      <div>Weekly progress</div>
                      <div className="font-bold text-[#141a21]">{stats.completionRate}% done</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 6: AI ASSISTANT CARD BELOW (PRESS ENTER TO OPEN AI CHAT NAV) */}
              <div className="rounded-[30px] p-6 bg-white text-[#141a21] shadow-[0_12px_35px_rgba(16,38,68,0.05)] border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f6fb] text-[#278cf5]">
                      <Sparkles className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-tight text-lg font-bold tracking-tight">Qubenix Assistant</h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#c6e35c] px-2.5 py-0.5 text-[11px] font-bold text-[#1a2605]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#2e4705]" />
                          Online
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Type a question and press Enter to open it in the AI Assistant view.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab('assistant')}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f6fb] px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-[#e4eef8] hover:text-[#278cf5] transition"
                  >
                    Open AI Chat
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {[
                    "What's happening in the team right now?",
                    'Show pending tasks',
                    'Any work ready for review?',
                    'Who is on the team?',
                  ].map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => openAssistantWithQuery(qp)}
                      className="rounded-full border border-slate-200 bg-[#f8fbff] px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:border-[#278cf5] hover:bg-white hover:text-[#278cf5] transition"
                    >
                      {qp}
                    </button>
                  ))}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    openAssistantWithQuery(dashboardAiInput);
                  }}
                  className="mt-4 flex items-center gap-2.5"
                >
                  <input
                    type="text"
                    value={dashboardAiInput}
                    onChange={(e) => setDashboardAiInput(e.target.value)}
                    placeholder="Ask about intern progress, tasks, or submissions and press Enter..."
                    className="flex-1 rounded-full border border-slate-200 bg-[#f6f9fc] px-5 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#278cf5] focus:bg-white transition"
                  />
                  <button
                    type="submit"
                    disabled={!dashboardAiInput.trim()}
                    aria-label="Open in AI Assistant"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#278cf5] text-white shadow-sm hover:bg-[#1a7ae0] disabled:opacity-40 transition"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================================================================
              TAB 2: INTERN MANAGEMENT (TASK 2)
              ================================================================== */}
          {activeTab === 'interns' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] bg-white p-5 shadow-sm border border-slate-200/80">
                <div>
                  <h2 className="font-tight text-2xl font-bold">
                    {isAdmin ? 'Intern Directory' : 'My Profile'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isAdmin
                      ? 'Add new interns, view their profiles, update details, or remove records.'
                      : 'View your profile details and assigned department.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isAdmin &&
                    ['All', 'Active', 'Onboarding'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setDeptFilter(f)}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                          deptFilter === f
                            ? 'bg-[#278cf5] text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {f}
                      </button>
                    ))}

                  {isAdmin && (
                    <button
                      onClick={() => setInternModal({ open: true, mode: 'add', data: null })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#8fa832] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#7b9228] transition"
                    >
                      <Plus className="h-4 w-4" />
                      Add Intern
                    </button>
                  )}
                </div>
              </div>

              {filteredInterns.length === 0 ? (
                <div className="rounded-[26px] bg-white p-12 text-center shadow-sm border border-slate-200/80">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3fc] text-[#278cf5]">
                    <Users className="h-6 w-6" />
                  </div>
                  <h3 className="font-tight mt-4 text-xl font-bold">No interns added yet</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Add your first intern to start assigning tasks and tracking their progress.
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setInternModal({ open: true, mode: 'add', data: null })}
                      className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#278cf5] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1a7ae0] transition"
                    >
                      <Plus className="h-4 w-4" />
                      Add First Intern
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredInterns.map((intern) => {
                    const internTasks = tasks.filter((t) => t.internId === intern.id);
                    const doneCount = internTasks.filter((t) => t.status === 'Completed').length;
                    return (
                      <div
                        key={intern.id}
                        className="rounded-[26px] bg-white p-5 flex flex-col justify-between shadow-sm border border-slate-200/80 hover:shadow-md transition"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <img
                              src={intern.avatar}
                              alt={intern.name}
                              className="h-12 w-12 rounded-full object-cover border-2 border-[#278cf5] bg-slate-50"
                            />
                            <div>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  intern.status === 'Active'
                                    ? 'bg-emerald-500/15 text-emerald-600'
                                    : 'bg-amber-500/15 text-amber-600'
                                }`}
                              >
                                {intern.status}
                              </span>
                              <h3 className="font-tight text-lg font-bold mt-0.5">{intern.name}</h3>
                              <p className="text-xs font-medium text-[#278cf5]">{intern.department}</p>
                            </div>
                          </div>

                          <p className="mt-3 text-xs leading-relaxed text-slate-600">{intern.bio}</p>

                          <div className="mt-4 space-y-1.5 rounded-2xl bg-[#f6f9fc] p-3 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Email:</span>
                              <span className="font-medium truncate max-w-[190px]">{intern.email}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Phone:</span>
                              <span className="font-medium">{intern.phone}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Joined:</span>
                              <span className="font-medium">{intern.joiningDate}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tasks Done:</span>
                              <span className="font-bold text-[#8fa832]">
                                {doneCount} / {internTasks.length}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => setProfileDrawer(intern)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#278cf5]/15 px-3 py-1.5 text-xs font-bold text-[#278cf5] hover:bg-[#278cf5] hover:text-white transition"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View Profile
                          </button>

                          {isAdmin && (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  setInternModal({ open: true, mode: 'edit', data: intern })
                                }
                                className="rounded-full bg-slate-100 p-2 hover:bg-slate-200 transition"
                                title="Edit Intern"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteIntern(intern.id, intern.name)}
                                className="rounded-full bg-rose-500/15 p-2 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                                title="Remove Intern"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              TAB 3: TASK MANAGEMENT (TASK 3)
              ================================================================== */}
          {activeTab === 'tasks' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] bg-white p-5 shadow-sm border border-slate-200/80">
                <div>
                  <h2 className="font-tight text-2xl font-bold">Tasks &amp; Deadlines</h2>
                  <p className="text-xs text-slate-500">
                    Create tasks, assign them to interns, set deadlines, and track progress.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {['All', 'Pending', 'In Progress', 'Completed'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setTaskStatusFilter(st)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        taskStatusFilter === st
                          ? 'bg-[#278cf5] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}

                  {isAdmin && (
                    <button
                      onClick={() => setTaskModal({ open: true, mode: 'add', data: null })}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#8fa832] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#7b9228] transition"
                    >
                      <Plus className="h-4 w-4" />
                      Assign Task
                    </button>
                  )}
                </div>
              </div>

              {filteredTasks.length === 0 ? (
                <div className="rounded-[26px] bg-white p-12 text-center shadow-sm border border-slate-200/80">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3fc] text-[#278cf5]">
                    <CheckSquare className="h-6 w-6" />
                  </div>
                  <h3 className="font-tight mt-4 text-xl font-bold">No tasks yet</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {isAdmin
                      ? interns.length === 0
                        ? 'Add an intern first, then create and assign tasks to them.'
                        : 'Create your first task and assign it to an intern.'
                      : 'You have no assigned tasks right now.'}
                  </p>
                  {isAdmin && interns.length > 0 && (
                    <button
                      onClick={() => setTaskModal({ open: true, mode: 'add', data: null })}
                      className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[#278cf5] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#1a7ae0] transition"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-[24px] bg-white p-5 flex flex-col justify-between shadow-sm border border-slate-200/80"
                    >
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                task.priority === 'Critical'
                                  ? 'bg-rose-100 text-rose-600'
                                  : task.priority === 'High'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-sky-100 text-sky-700'
                              }`}
                            >
                              {task.priority} Priority
                            </span>
                            <span className="text-xs text-slate-500">Due: {task.deadline}</span>
                          </div>

                          <select
                            aria-label={`Status for ${task.title}`}
                            value={task.status}
                            onChange={(e) => handleQuickTaskStatus(task.id, e.target.value)}
                            className={`rounded-full px-3 py-1 text-xs font-bold outline-none cursor-pointer ${
                              task.status === 'Completed'
                                ? 'bg-[#8fa832]/20 text-[#728725]'
                                : task.status === 'In Progress'
                                ? 'bg-[#278cf5]/20 text-[#278cf5]'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            <option value="Pending">Pending</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                          </select>
                        </div>

                        <h3 className="font-tight mt-3 text-lg font-bold">{task.title}</h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">
                          {task.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs">
                          <span className="text-slate-400">Assigned to: </span>
                          <strong className="font-semibold">{task.internName}</strong>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSubmitModal({ open: true, task })}
                            className="rounded-full bg-[#278cf5] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#1a7ae0] transition"
                          >
                            {task.submission ? 'View / Update Work' : 'Submit Work'}
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setTaskModal({ open: true, mode: 'edit', data: task })}
                                className="rounded-full bg-slate-100 p-2 hover:bg-slate-200 transition"
                                title="Edit Task"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="rounded-full bg-rose-500/15 p-2 text-rose-500 hover:bg-rose-500 hover:text-white transition"
                                title="Delete Task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              TAB 4: WORK SUBMISSIONS & MEETING REVIEW (TASK 4)
              ================================================================== */}
          {activeTab === 'submissions' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-[26px] bg-white p-5 shadow-sm border border-slate-200/80">
                <div>
                  <h2 className="font-tight text-2xl font-bold">Work Submissions</h2>
                  <p className="text-xs text-slate-500">
                    Share completed work using a summary, project link, or document link, and review them together in meetings.
                  </p>
                </div>

                <button
                  onClick={() => setShowMeetingModal(true)}
                  className="inline-flex items-center gap-2 rounded-full bg-[#c6e35c] px-5 py-2.5 text-xs font-extrabold text-[#162304] shadow-sm hover:bg-[#d5f06e] transition"
                >
                  <Presentation className="h-4 w-4" />
                  Show in Meeting ({submittedTasks.length})
                </button>
              </div>

              {tasks.length === 0 ? (
                <div className="rounded-[26px] bg-white p-12 text-center shadow-sm border border-slate-200/80">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf3fc] text-[#278cf5]">
                    <FileCheck2 className="h-6 w-6" />
                  </div>
                  <h3 className="font-tight mt-4 text-xl font-bold">No submissions yet</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Once tasks are assigned, interns can submit their project and document links here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tasks.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-[24px] bg-white p-5 flex flex-col justify-between shadow-sm border border-slate-200/80"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#278cf5]">
                            {t.internName} · {t.department}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              t.status === 'Completed'
                                ? 'bg-[#8fa832]/20 text-[#728725]'
                                : t.status === 'In Progress'
                                ? 'bg-[#278cf5]/20 text-[#278cf5]'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>

                        <h3 className="font-tight mt-2 text-lg font-bold">{t.title}</h3>

                        {t.submission ? (
                          <div className="mt-3 rounded-2xl bg-[#f6f9fc] border border-slate-200/70 p-4 text-xs space-y-2">
                            <div className="font-semibold text-[#8fa832]">
                              Submitted {new Date(t.submission.submittedAt).toLocaleDateString()}
                            </div>
                            <p className="leading-relaxed text-slate-700">{t.submission.description}</p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {t.submission.githubUrl && (
                                <a
                                  href={t.submission.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full bg-[#14171a] px-3 py-1 text-[11px] font-semibold text-white hover:bg-[#278cf5]"
                                >
                                  <Github className="h-3 w-3" />
                                  Project Link
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {t.submission.documentUrl && (
                                <a
                                  href={t.submission.documentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full bg-[#278cf5]/15 px-3 py-1 text-[11px] font-semibold text-[#278cf5] hover:bg-[#278cf5] hover:text-white"
                                >
                                  <FileText className="h-3 w-3" />
                                  Document Link
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                            {t.submission.reviewerNote && (
                              <div className="pt-1 text-[11px] italic text-slate-500">
                                Note: &ldquo;{t.submission.reviewerNote}&rdquo;
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-3 rounded-2xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
                            Waiting for work submission.
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                          onClick={() => setSubmitModal({ open: true, task: t })}
                          className="rounded-full bg-[#278cf5] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#1a7ae0] transition"
                        >
                          {t.submission ? 'Update Work' : '+ Submit Work'}
                        </button>

                        {isAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                handleReviewSubmission(t.id, {
                                  status: 'Completed',
                                  reviewerNote: 'Approved by Admin.',
                                })
                              }
                              className="rounded-full bg-[#8fa832] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#7b9228] transition"
                            >
                              Approve ✓
                            </button>
                            <button
                              onClick={() => setShowMeetingModal(true)}
                              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
                            >
                              Show in Meeting
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================================================================
              TAB 5: ASSISTANT (FULL VIEW)
              ================================================================== */}
          {activeTab === 'assistant' && (
            <div className="mx-auto w-full max-w-4xl">
              <AssistantPanel
                token={token}
                stats={stats}
                interns={interns}
                tasks={tasks}
                fullHeight={true}
                messages={aiMessages}
                setMessages={setAiMessages}
                pendingQuery={pendingAiQuery}
                onClearPendingQuery={() => setPendingAiQuery(null)}
              />
            </div>
          )}

          {/* ==================================================================
              TAB 6: SAFETY & ACTIVITY (ADMIN ONLY)
              ================================================================== */}
          {activeTab === 'safety' && isAdmin && (
            <SafetyPanel
              token={token}
              auditLogs={auditLogs}
              onRefresh={() => fetchDashboardData()}
            />
          )}
        </main>
      </div>

      {/* ======================================================================
          MODALS: ADD/EDIT INTERN, PROFILE DRAWER, ADD/EDIT TASK, SUBMIT WORK
          ====================================================================== */}

      {/* 1. ADD / EDIT INTERN MODAL */}
      {internModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 text-[#141a21] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-tight text-xl font-bold">
                {internModal.mode === 'edit' ? 'Update Intern' : 'Add New Intern'}
              </h3>
              <button
                onClick={() => setInternModal({ open: false, mode: 'add', data: null })}
                className="rounded-full p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIntern} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Full Name *</label>
                  <input
                    name="name"
                    required
                    defaultValue={internModal.data?.name || ''}
                    placeholder="Full name"
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Email Address *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={internModal.data?.email || ''}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Phone Number *</label>
                  <input
                    name="phone"
                    required
                    defaultValue={internModal.data?.phone || ''}
                    placeholder="+91 00000 00000"
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Department *</label>
                  <input
                    name="department"
                    required
                    defaultValue={internModal.data?.department || ''}
                    placeholder="e.g. Engineering, Design"
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Joining Date *</label>
                  <input
                    name="joiningDate"
                    type="date"
                    required
                    defaultValue={internModal.data?.joiningDate || new Date().toISOString().slice(0, 10)}
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Status</label>
                  <select
                    name="status"
                    defaultValue={internModal.data?.status || 'Active'}
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Alumni">Alumni</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Project Profile Link</label>
                  <input
                    name="github"
                    type="url"
                    defaultValue={internModal.data?.github || ''}
                    placeholder="https://github.com/username"
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">
                    Sign-In Password {internModal.mode === 'add' ? '*' : '(leave blank to keep)'}
                  </label>
                  <input
                    name="password"
                    type="password"
                    required={internModal.mode === 'add'}
                    minLength={6}
                    placeholder={internModal.mode === 'add' ? 'Minimum 6 characters' : 'New password (optional)'}
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">About / Role Focus</label>
                <textarea
                  name="bio"
                  rows={2}
                  defaultValue={internModal.data?.bio || ''}
                  placeholder="Short note about what this intern is working on..."
                  className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2 outline-none focus:border-[#278cf5] focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setInternModal({ open: false, mode: 'add', data: null })}
                  className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#278cf5] px-5 py-2 font-bold text-white hover:bg-[#1a7ae0]"
                >
                  {internModal.mode === 'edit' ? 'Save Changes' : 'Add Intern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PROFILE DRAWER */}
      {profileDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/40 backdrop-blur-sm">
          <div className="h-full w-full max-w-md bg-white p-6 text-[#141a21] shadow-2xl overflow-y-auto flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#278cf5]">
                  Intern Profile
                </span>
                <button
                  onClick={() => setProfileDrawer(null)}
                  className="rounded-full p-1.5 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-5 flex items-center gap-4">
                <img
                  src={profileDrawer.avatar}
                  alt={profileDrawer.name}
                  className="h-16 w-16 rounded-full object-cover border-2 border-[#278cf5] bg-slate-50"
                />
                <div>
                  <h3 className="font-tight text-2xl font-bold">{profileDrawer.name}</h3>
                  <p className="text-xs text-[#278cf5] font-semibold">{profileDrawer.department}</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                    {profileDrawer.status}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-600 leading-relaxed">{profileDrawer.bio}</p>

              <div className="mt-5 space-y-2 rounded-2xl bg-[#f6f9fc] p-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Email</span>
                  <span className="font-medium">{profileDrawer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phone</span>
                  <span className="font-medium">{profileDrawer.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Joining Date</span>
                  <span className="font-medium">{profileDrawer.joiningDate}</span>
                </div>
                {profileDrawer.github && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Link</span>
                    <a
                      href={profileDrawer.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#278cf5] underline truncate max-w-[200px]"
                    >
                      {profileDrawer.github}
                    </a>
                  </div>
                )}
              </div>

              <h4 className="font-tight mt-6 mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                Assigned Tasks ({tasks.filter((t) => t.internId === profileDrawer.id).length})
              </h4>
              <div className="space-y-2">
                {tasks
                  .filter((t) => t.internId === profileDrawer.id)
                  .map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border border-slate-200/80 bg-[#f9fbfd] p-3 text-xs"
                    >
                      <div className="flex justify-between font-bold">
                        <span>{t.title}</span>
                        <span className="text-[#8fa832]">{t.status}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        Priority: {t.priority} · Due: {t.deadline}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="mt-6 flex gap-2 pt-4 border-t border-slate-100">
              {isAdmin && (
                <button
                  onClick={() => {
                    const target = profileDrawer;
                    setProfileDrawer(null);
                    setTaskModal({
                      open: true,
                      mode: 'add',
                      data: { internId: target.id },
                    });
                  }}
                  className="flex-1 rounded-full bg-[#278cf5] py-2.5 text-xs font-bold text-white"
                >
                  + Assign Task
                </button>
              )}
              <button
                onClick={() => setProfileDrawer(null)}
                className="rounded-full bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. CREATE / EDIT TASK MODAL */}
      {taskModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 text-[#141a21] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-tight text-xl font-bold">
                {taskModal.mode === 'edit' ? 'Update Task' : 'Assign New Task'}
              </h3>
              <button
                onClick={() => setTaskModal({ open: false, mode: 'add', data: null })}
                className="rounded-full p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {interns.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-600 space-y-3">
                <p>You need to add at least one intern before assigning a task.</p>
                <button
                  onClick={() => {
                    setTaskModal({ open: false, mode: 'add', data: null });
                    setInternModal({ open: true, mode: 'add', data: null });
                  }}
                  className="rounded-full bg-[#278cf5] px-5 py-2 font-bold text-white"
                >
                  Add Intern Now
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveTask} className="mt-4 space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Task Title *</label>
                  <input
                    name="title"
                    required
                    defaultValue={taskModal.data?.title || ''}
                    placeholder="What needs to be completed?"
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-700">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={taskModal.data?.description || ''}
                    placeholder="Share instructions or helpful details..."
                    className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2 outline-none focus:border-[#278cf5] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Assign to Intern *</label>
                    <select
                      name="internId"
                      required
                      defaultValue={taskModal.data?.internId || interns[0]?.id || ''}
                      className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                    >
                      {interns.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} ({i.department})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Deadline *</label>
                    <input
                      name="deadline"
                      type="date"
                      required
                      defaultValue={taskModal.data?.deadline || new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Priority *</label>
                    <select
                      name="priority"
                      defaultValue={taskModal.data?.priority || 'High'}
                      className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-slate-700">Status *</label>
                    <select
                      name="status"
                      defaultValue={taskModal.data?.status || 'Pending'}
                      className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTaskModal({ open: false, mode: 'add', data: null })}
                    className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-[#278cf5] px-5 py-2 font-bold text-white hover:bg-[#1a7ae0]"
                  >
                    {taskModal.mode === 'edit' ? 'Update Task' : 'Assign Task'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 4. SUBMIT WORK MODAL */}
      {submitModal.open && submitModal.task && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] bg-white p-6 text-[#141a21] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#278cf5]">
                  Submit Completed Work
                </span>
                <h3 className="font-tight text-lg font-bold">{submitModal.task.title}</h3>
              </div>
              <button
                onClick={() => setSubmitModal({ open: false, task: null })}
                className="rounded-full p-1 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleWorkSubmission} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700">
                  Summary of Completed Work *
                </label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  defaultValue={submitModal.task.submission?.description || ''}
                  placeholder="Describe what you finished and any helpful notes..."
                  className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2 outline-none focus:border-[#278cf5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">
                  GitHub / Project Link
                </label>
                <input
                  name="githubUrl"
                  type="url"
                  defaultValue={submitModal.task.submission?.githubUrl || ''}
                  placeholder="https://github.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">
                  Document / Live Demo Link
                </label>
                <input
                  name="documentUrl"
                  type="url"
                  defaultValue={submitModal.task.submission?.documentUrl || ''}
                  placeholder="https://docs.google.com/..."
                  className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-slate-700">Task Status</label>
                <select
                  name="status"
                  defaultValue={
                    submitModal.task.status === 'Pending' ? 'Completed' : submitModal.task.status
                  }
                  className="w-full rounded-xl border border-slate-200 bg-[#f6f9fc] px-3.5 py-2.5 outline-none focus:border-[#278cf5] focus:bg-white"
                >
                  <option value="In Progress">In Progress (Ready for Review)</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitModal({ open: false, task: null })}
                  className="rounded-full bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#278cf5] px-5 py-2 font-bold text-white hover:bg-[#1a7ae0]"
                >
                  Submit Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. TEAM MEETING PRESENTER MODAL */}
      {showMeetingModal && (
        <MeetingPresenterModal
          tasks={tasks}
          interns={interns}
          isAdmin={isAdmin}
          onClose={() => setShowMeetingModal(false)}
          onReviewUpdate={handleReviewSubmission}
        />
      )}
    </div>
  );
}
