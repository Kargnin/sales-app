import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAppStore, Employee, Visit } from '../../stores/appStore.js';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ArrowLeft, UserCircle2, Mail, Phone, Calendar, PowerOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AdminEmployeeDetails: React.FC = () => {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { employees, visits, fetchEmployees, fetchVisits, toggleEmployeeStatus } = useAppStore();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employeeVisits, setEmployeeVisits] = useState<Visit[]>([]);

  useEffect(() => {
    const foundEmployee = employees.find(e => e.id === employeeId);
    if (foundEmployee) {
      setEmployee(foundEmployee);
    } else {
      fetchEmployees().then(() => {
        const emp = useAppStore.getState().employees.find(e => e.id === employeeId);
        if (emp) setEmployee(emp);
      });
    }

    if (visits.length === 0) {
      fetchVisits().then(() => {
        const v = useAppStore.getState().visits.filter(v => v.salesmanId === employeeId);
        setEmployeeVisits(v);
      });
    } else {
      setEmployeeVisits(visits.filter(v => v.salesmanId === employeeId));
    }
  }, [employeeId, employees.length, visits.length]);

  const handleToggleStatus = async () => {
    if (!employee) return;
    try {
      await toggleEmployeeStatus(employee.id, employee.status);
      setEmployee(prev => prev ? { ...prev, status: prev.status === 'active' ? 'inactive' : 'active' } : null);
    } catch (err) {
      // error handled in store
    }
  };

  if (!employee) {
    return <div className="p-8 text-center text-slate-400">Loading employee profile...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#050806] text-slate-100 pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#050806]/80 backdrop-blur-md border-b border-[#1a231f] px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/admin?tab=roster');
            }
          }} 
          className="p-1.5 hover:bg-[#1a231f] rounded-full transition-colors flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="size-5 text-emerald-400" />
        </button>
        <div>
          <h1 className="text-lg font-bold leading-tight truncate max-w-[200px]">{employee.username}</h1>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Employee Profile</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-6">
        
        {/* Profile Details Card */}
        <Card className="bg-[#0c100e] border-[#1a231f]">
          <CardHeader className="pb-3 border-b border-[#1a231f] flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-200">
              <UserCircle2 className="size-4 text-emerald-500" />
              Core Information
            </CardTitle>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              employee.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {employee.status}
            </span>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                <ShieldCheck className="size-5 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Role</p>
                  <p className="text-sm font-medium capitalize text-slate-200">{employee.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                <Mail className="size-5 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Email</p>
                  <p className="text-sm font-medium text-slate-200">{employee.email || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                <Phone className="size-5 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Phone</p>
                  <p className="text-sm font-medium text-slate-200">{employee.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#101512] p-3 rounded-lg border border-[#1a231f]">
                <Calendar className="size-5 text-slate-400" />
                <div>
                  <p className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Joined</p>
                  <p className="text-sm font-medium text-slate-200">{new Date(employee.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleToggleStatus} 
              variant={employee.status === 'active' ? 'destructive' : 'default'}
              className="mt-2 w-full flex items-center justify-center gap-2"
            >
              <PowerOff className="size-4" />
              {employee.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
            </Button>
          </CardContent>
        </Card>

        {/* Visit Logs */}
        <div>
          <h2 className="text-sm font-bold tracking-wide uppercase text-slate-400 mb-3 flex items-center gap-2">
            Recent Visits
            <span className="text-xs bg-[#1a231f] text-slate-300 py-0.5 px-2 rounded-full">{employeeVisits.length}</span>
          </h2>

          {employeeVisits.length === 0 ? (
            <Card className="bg-[#0c100e] border-[#1a231f] border-dashed">
              <CardContent className="flex flex-col items-center justify-center p-8 gap-2">
                <span className="text-3xl grayscale opacity-50">📍</span>
                <p className="text-sm text-slate-400">No visits logged by this employee yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {employeeVisits.sort((a,b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()).slice(0, 10).map((visit) => (
                <div key={visit.id} className="bg-[#0c100e] border border-[#1a231f] rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-semibold text-emerald-400">{visit.shopName}</h4>
                      <p className="text-xs text-slate-400">{new Date(visit.visitedAt).toLocaleString()}</p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      visit.gpsVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {visit.gpsVerified ? 'GPS Verified' : 'Out of bounds'}
                    </span>
                  </div>
                  {visit.notes && (
                    <div className="text-xs text-slate-300 bg-[#101512] p-2 rounded border border-[#1a231f]">
                      <span className="text-slate-500">Note: </span>
                      {visit.notes}
                    </div>
                  )}
                </div>
              ))}
              {employeeVisits.length > 10 && (
                <p className="text-xs text-center text-slate-500 mt-2">Showing 10 most recent visits.</p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
