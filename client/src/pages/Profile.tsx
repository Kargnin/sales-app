import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../stores/authStore.js';
import { useAppStore } from '../stores/appStore.js';
import { useNotificationStore } from '../stores/notificationStore.js';
import { apiClient } from '../api/client.js';
import { toast } from 'sonner';
import { 
  UserCircle, ChevronRight, Lock, Bell, BarChart3, 
  Camera, ArrowLeft, Check, AlertCircle, RefreshCw,
  Mail, Phone, ShieldCheck, User, TrendingUp, Calendar, MapPin
} from 'lucide-react';
import { Button } from '../components/ui/button.js';
import { Input } from '../components/ui/input.js';
import { Field, FieldLabel, FieldError, FieldGroup } from '../components/ui/field.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card.js';

type ActiveView = 'menu' | 'edit-profile' | 'security' | 'notifications' | 'analytics';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const { fetchOrders, fetchVisits, fetchShops, orders, visits, shops } = useAppStore();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<ActiveView>('menu');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarIndex, setAvatarIndex] = useState<number>(() => {
    return Number(localStorage.getItem('user-avatar-index')) || 0;
  });

  // Available custom mockup avatar presets
  const avatarPresets = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', // Alex Morgan style
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
  ];

  // Forms states
  const [emailVal, setEmailVal] = useState(user?.email || '');
  const [phoneVal, setPhoneVal] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState(() => {
    return localStorage.getItem('user-job-title') || (user?.role === 'admin' ? 'Logistics Manager' : 'Field Sales Specialist');
  });

  const [currPassword, setCurrPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    // Initial fetch to sync up
    fetchNotifications();
    fetchOrders();
    fetchVisits();
    fetchShops();
  }, []);

  const handleAvatarChange = () => {
    const nextIdx = (avatarIndex + 1) % avatarPresets.length;
    setAvatarIndex(nextIdx);
    localStorage.setItem('user-avatar-index', String(nextIdx));
    toast.success('Mockup profile picture updated!');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);

    try {
      const response = await apiClient.patch('/users/me', {
        email: emailVal.trim(),
        phone: phoneVal.trim(),
      });

      updateUser({
        email: response.data.email,
        phone: response.data.phone,
      });

      localStorage.setItem('user-job-title', jobTitle.trim());
      toast.success('Profile details saved successfully!');
      setActiveView('menu');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update profile details.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await apiClient.patch('/users/me', {
        currentPassword: currPassword,
        newPassword: newPassword,
      });

      toast.success('Password updated successfully!');
      setCurrPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setActiveView('menu');
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Performance calculations
  const myOrders = orders.filter(o => user?.role === 'admin' || o.salesmanId === user?.id);
  const myVisits = visits.filter(v => user?.role === 'admin' || v.salesmanId === user?.id);
  
  const totalSalesVal = myOrders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + parseFloat(o.totalAmount || '0'), 0);

  const pendingApprovalsCount = shops.filter(s => s.status === 'pending_approval').length;
  
  // Weekly Target analytics
  const visitTarget = user?.role === 'admin' ? 50 : 20;
  const visitCompletionPercent = Math.min(100, Math.round((myVisits.length / visitTarget) * 100));

  return (
    <div className="max-w-md mx-auto bg-[#030604] border border-[#141b17] rounded-3xl overflow-hidden shadow-2xl min-h-[80vh] flex flex-col relative font-sans text-slate-100">
      
      {/* ─── MAIN MENU VIEW ────────────────────────────────────────── */}
      {activeView === 'menu' && (
        <div className="flex flex-col flex-1 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header Title */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Profile</h1>
            {user?.tenantName && (
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/40 px-2.5 py-1 rounded-full uppercase tracking-wider">
                🏢 {user.tenantName}
              </span>
            )}
          </div>

          {/* User Card with Avatar */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="relative group cursor-pointer" onClick={handleAvatarChange}>
              <div className="size-24 rounded-full border-4 border-emerald-500/20 overflow-hidden shadow-xl hover:border-emerald-400/50 transition-all duration-300">
                <img 
                  src={avatarPresets[avatarIndex]} 
                  alt="Avatar" 
                  className="w-full h-full object-cover select-none"
                />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-500 p-2 rounded-full border border-[#030604] text-white shadow-lg transition-transform active:scale-90 select-none">
                <Camera className="size-4" />
              </div>
            </div>

            <h2 className="text-xl font-bold mt-4 tracking-tight text-slate-200">{user?.username}</h2>
            <p className="text-xs text-slate-400 font-medium mt-1">{jobTitle}</p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5 select-all">{user?.email || 'no-email@salesapp.com'}</p>
          </div>

          {/* Account Settings Category */}
          <div className="mb-6">
            <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase px-1 mb-3">
              Account
            </h3>
            
            <div className="flex flex-col gap-2.5">
              
              {/* Edit Profile */}
              <button 
                onClick={() => setActiveView('edit-profile')}
                className="flex items-center justify-between px-4 py-3.5 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900/40 hover:border-emerald-500/10 rounded-2xl transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <User className="size-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Edit Profile</span>
                </div>
                <ChevronRight className="size-4 text-slate-500 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Password & Security */}
              <button 
                onClick={() => setActiveView('security')}
                className="flex items-center justify-between px-4 py-3.5 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900/40 hover:border-emerald-500/10 rounded-2xl transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <Lock className="size-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Password & Security</span>
                </div>
                <ChevronRight className="size-4 text-slate-500 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Notifications */}
              <button 
                onClick={() => setActiveView('notifications')}
                className="flex items-center justify-between px-4 py-3.5 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900/40 hover:border-emerald-500/10 rounded-2xl transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                      <Bell className="size-4.5" />
                    </div>
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Notifications</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.filter(n => !n.isRead).length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-slate-950">
                        {notifications.filter(n => !n.isRead).length}
                      </span>
                    )}
                    <ChevronRight className="size-4 text-slate-500 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* Application Category */}
          <div className="mb-8">
            <h3 className="text-xs font-bold tracking-widest text-slate-500 uppercase px-1 mb-3">
              Application
            </h3>

            <div className="flex flex-col gap-2.5">
              
              {/* Performance Analytics */}
              <button 
                onClick={() => setActiveView('analytics')}
                className="flex items-center justify-between px-4 py-3.5 bg-slate-900/30 hover:bg-slate-900/60 border border-slate-900/40 hover:border-emerald-500/10 rounded-2xl transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                    <BarChart3 className="size-4.5" />
                  </div>
                  <span className="text-sm font-semibold text-slate-200 group-hover:text-slate-100 transition-colors">Performance Analytics</span>
                </div>
                <ChevronRight className="size-4 text-slate-500 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </button>

            </div>
          </div>

          {/* System Footer info */}
          <div className="mt-auto text-center py-2 text-[10px] text-slate-600 font-mono">
            SalesApp Native Client v0.1.0 • Secure Persistent Layer
          </div>
        </div>
      )}

      {/* ─── EDIT PROFILE VIEW ────────────────────────────────────── */}
      {activeView === 'edit-profile' && (
        <div className="flex flex-col flex-1 p-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setActiveView('menu')}
              className="p-2 hover:bg-slate-900/60 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Edit Profile</h2>
          </div>

          <form onSubmit={handleUpdateProfile} className="flex flex-col gap-4 flex-1">
            <FieldGroup>
              <Field>
                <FieldLabel>Username (Read-Only)</FieldLabel>
                <Input 
                  value={user?.username || ''} 
                  disabled 
                  className="bg-slate-950/60 border-slate-900 text-slate-500 cursor-not-allowed"
                />
              </Field>

              <Field>
                <FieldLabel>Role Title / Designation</FieldLabel>
                <Input 
                  value={jobTitle} 
                  onChange={(e) => setJobTitle(e.target.value)} 
                  placeholder="e.g. Field Sales Representative"
                  required
                  maxLength={50}
                  className="bg-slate-950/40 border-slate-900/60 focus:border-emerald-500/50"
                />
              </Field>

              <Field>
                <FieldLabel>Email Address</FieldLabel>
                <Input 
                  type="email"
                  value={emailVal} 
                  onChange={(e) => setEmailVal(e.target.value)} 
                  placeholder="e.g. employee@tenant.com"
                  className="bg-slate-950/40 border-slate-900/60 focus:border-emerald-500/50"
                />
              </Field>

              <Field>
                <FieldLabel>Phone Number</FieldLabel>
                <Input 
                  type="tel"
                  value={phoneVal} 
                  onChange={(e) => setPhoneVal(e.target.value)} 
                  placeholder="e.g. 9811022334"
                  className="bg-slate-950/40 border-slate-900/60 focus:border-emerald-500/50"
                />
              </Field>
            </FieldGroup>

            <div className="mt-auto pt-6 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setActiveView('menu')}
                className="w-1/2 border-[#1a231f] hover:bg-slate-950/60"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSavingProfile}
                className="w-1/2 bg-emerald-500 text-slate-950 hover:bg-emerald-600 font-bold"
              >
                {isSavingProfile ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── PASSWORD & SECURITY VIEW ──────────────────────────────── */}
      {activeView === 'security' && (
        <div className="flex flex-col flex-1 p-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-center gap-3 mb-6">
            <button 
              onClick={() => setActiveView('menu')}
              className="p-2 hover:bg-slate-900/60 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
            >
              <ArrowLeft className="size-4" />
            </button>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">Password & Security</h2>
          </div>

          <div className="mb-6 p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-2xl flex items-start gap-3">
            <ShieldCheck className="size-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Account Secured</h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                To update your security password, you must verify your identity by entering your active current password.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 flex-1">
            <FieldGroup>
              <Field>
                <FieldLabel>Current Secure Password</FieldLabel>
                <Input 
                  type="password"
                  value={currPassword}
                  onChange={(e) => setCurrPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-slate-950/40 border-slate-900/60 focus:border-emerald-500/50"
                />
              </Field>

              <Field>
                <FieldLabel>New Password</FieldLabel>
                <Input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="bg-slate-950/40 border-slate-900/60 focus:border-emerald-500/50"
                />
              </Field>

              <Field>
                <FieldLabel>Confirm New Password</FieldLabel>
                <Input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  minLength={8}
                  className="bg-slate-950/40 border-slate-900/60 focus:border-emerald-500/50"
                />
              </Field>
            </FieldGroup>

            <div className="mt-auto pt-6 flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setActiveView('menu')}
                className="w-1/2 border-[#1a231f] hover:bg-slate-950/60"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isChangingPassword}
                className="w-1/2 bg-emerald-500 text-slate-950 hover:bg-emerald-600 font-bold"
              >
                {isChangingPassword ? 'Updating...' : 'Change Password'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ─── NOTIFICATIONS VIEW ────────────────────────────────────── */}
      {activeView === 'notifications' && (
        <div className="flex flex-col flex-1 p-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveView('menu')}
                className="p-2 hover:bg-slate-900/60 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Notifications</h2>
            </div>
            
            {notifications.some(n => !n.isRead) && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  markAllAsRead();
                  toast.success('All notifications marked as read!');
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-bold h-8 px-2.5 rounded-xl hover:bg-slate-900/50"
              >
                Read All
              </Button>
            )}
          </div>

          {/* Timeline of notifications */}
          <div className="flex-1 overflow-y-auto max-h-[60vh] pr-1 flex flex-col gap-3 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500 my-auto">
                <span className="text-4xl mb-3">🔔</span>
                <p className="text-xs">No notifications yet.</p>
                <p className="text-[10px] text-slate-600 mt-1">We will notify you when things change!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`p-3.5 border rounded-2xl transition-all duration-200 relative ${
                    notif.isRead 
                      ? 'bg-slate-950/20 border-slate-950/40 opacity-70' 
                      : 'bg-[#0f1914] border-emerald-900/30 hover:border-emerald-500/20 cursor-pointer shadow-lg shadow-emerald-950/10'
                  }`}
                >
                  {!notif.isRead && (
                    <span className="absolute top-3.5 right-3.5 h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 animate-pulse" />
                  )}
                  <div className="flex gap-2">
                    <span className="text-sm">
                      {notif.type === 'shop_approval' ? '🏪' : 
                       notif.type === 'order_status' ? '📦' : 
                       notif.type === 'new_order' ? '🛒' : '⚡'}
                    </span>
                    <div className="flex flex-col min-w-0 pr-4">
                      <span className={`text-xs font-bold leading-snug ${notif.isRead ? 'text-slate-300' : 'text-slate-100'}`}>
                        {notif.title}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1 leading-normal">
                        {notif.message}
                      </span>
                      <span className="text-[9px] text-slate-600 mt-2 font-mono">
                        {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ─── PERFORMANCE ANALYTICS VIEW ────────────────────────────── */}
      {activeView === 'analytics' && (
        <div className="flex flex-col flex-1 p-6 animate-in slide-in-from-right duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setActiveView('menu')}
                className="p-2 hover:bg-slate-900/60 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
              >
                <ArrowLeft className="size-4" />
              </button>
              <h2 className="text-lg font-bold text-slate-100 tracking-tight">Performance Analytics</h2>
            </div>
            
            <button 
              onClick={() => {
                fetchOrders();
                fetchVisits();
                toast.success('Metrics synced live!');
              }}
              className="p-2 hover:bg-slate-900/60 rounded-full text-slate-400 hover:text-slate-100 transition-colors"
            >
              <RefreshCw className="size-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[68vh] pr-1 flex flex-col gap-4 custom-scrollbar">
            
            {/* Target Progress Gauge */}
            <div className="p-4 bg-[#0a100c] border border-emerald-900/20 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  {user?.role === 'admin' ? 'Global Visit Target' : 'Personal Target'}
                </span>
                <h3 className="text-xl font-bold mt-1 text-slate-100">
                  {myVisits.length} / {visitTarget} Visits
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                  {visitCompletionPercent === 100 
                    ? '🎉 Weekly visit target achieved! Excellent job out there.' 
                    : `Keep going! ${visitTarget - myVisits.length} more check-ins to hit 100% quota.`
                  }
                </p>
              </div>

              {/* Dynamic SVG Circular Progress Ring */}
              <div className="relative size-16 shrink-0 select-none">
                <svg className="size-full -rotate-90">
                  <circle 
                    cx="32" cy="32" r="28" 
                    className="stroke-[#101914] fill-none" 
                    strokeWidth="5" 
                  />
                  <circle 
                    cx="32" cy="32" r="28" 
                    className="stroke-emerald-400 fill-none transition-all duration-1000 ease-out" 
                    strokeWidth="5" 
                    strokeDasharray={2 * Math.PI * 28}
                    strokeDashoffset={2 * Math.PI * 28 * (1 - visitCompletionPercent / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-emerald-400 font-mono">
                  {visitCompletionPercent}%
                </div>
              </div>
            </div>

            {/* Quick Metrics stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-900/30 border border-slate-900/40 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Booked Orders</span>
                <span className="text-lg font-bold text-slate-200">{myOrders.length}</span>
              </div>
              <div className="p-3.5 bg-slate-900/30 border border-slate-900/40 rounded-2xl flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Booking Vol.</span>
                <span className="text-lg font-bold text-emerald-400">₹{totalSalesVal.toLocaleString()}</span>
              </div>
            </div>

            {/* Performance Visual Chart (SVG Chart) */}
            <Card className="bg-[#0c100e] border-[#1a231f] rounded-2xl shadow-xl overflow-hidden">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <TrendingUp className="size-4 text-emerald-400" />
                  <span>Activity Performance Trend</span>
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-500">
                  Daily recorded visits and shop interactions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-1 flex flex-col items-center">
                {/* SVG bar mockup based on real count */}
                <div className="w-full h-24 flex items-end gap-2.5 pt-4 border-b border-[#1b2520] relative">
                  <div className="absolute left-0 right-0 top-1/2 border-t border-dashed border-[#131d18] opacity-60 pointer-events-none" />
                  
                  {/* Generate 7 bars representing days */}
                  {[3, 5, 2, 7, 4, 6, myVisits.length].map((val, idx) => {
                    const maxVal = 8;
                    const heightPercent = Math.max(10, Math.min(100, Math.round((val / maxVal) * 100)));
                    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const isToday = idx === 6;

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group cursor-help">
                        <div className="w-full relative">
                          {/* Tooltip */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-emerald-950 text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-900 opacity-0 group-hover:opacity-100 transition-opacity duration-150 mb-1 z-10 pointer-events-none whitespace-nowrap">
                            {val} check-ins
                          </span>
                          <div 
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-sm transition-all duration-700 ${
                              isToday 
                                ? 'bg-gradient-to-t from-emerald-500 to-teal-300 shadow-md shadow-emerald-500/20' 
                                : 'bg-[#18231f] group-hover:bg-[#20312b]'
                            }`}
                          />
                        </div>
                        <span className={`text-[9px] font-mono mt-1.5 ${isToday ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                          {days[idx]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance list - recent activity log */}
            <div>
              <h4 className="text-xs font-bold tracking-widest text-slate-500 uppercase px-1 mb-3">
                Recent Outlets Interacted
              </h4>
              
              <div className="flex flex-col gap-2">
                {myVisits.slice(0, 3).map((visit) => (
                  <div key={visit.id} className="p-3 bg-slate-900/20 border border-slate-900/30 rounded-xl flex items-center justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{visit.shopName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">GPS Checked-in • {new Date(visit.visitedAt).toLocaleDateString()}</p>
                    </div>
                    <span className="badge badge-approved text-[9px] shrink-0 font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900/50">
                      Verified
                    </span>
                  </div>
                ))}
                {myVisits.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-600 bg-slate-950/20 border border-slate-950/30 rounded-xl italic">
                    No recent shop visits logged.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
