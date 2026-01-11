import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Lead, LeadStatus, Interaction } from '../types';
import { User, Calendar, ArrowUpRight, AlertCircle, Clock, Video, Phone } from 'lucide-react';

interface DashboardProps {
  leads: Lead[];
  interactions: Interaction[];
  onNavigate: (tab: string) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const Dashboard: React.FC<DashboardProps> = ({ leads, interactions, onNavigate }) => {
  const totalPipelineValue = leads.reduce((acc, lead) => {
    // Use Number() to ensure it's not treated as a string
    const val = Number(lead.value) || 0;
    return acc + val;
  }, 0);
  const totalLeads = leads.length;

  const statusData = leads.reduce((acc: any, lead) => {
    const existing = acc.find((item: any) => item.name === lead.status);
    if (existing) {
      existing.value++;
    } else {
      acc.push({ name: lead.status, value: 1 });
    }
    return acc;
  }, []);

  const valueByStatus = leads.reduce((acc: any, lead) => {
    const existing = acc.find((item: any) => item.name === lead.status);
    const amount = Number(lead.value) || 0;
    if (existing) {
      existing.amount += amount;
    } else {
      acc.push({ name: lead.status, amount });
    }
    return acc;
  }, []);

  const newLeads = leads
    .filter(lead => lead.status === LeadStatus.NEW)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // NEW: Fetch upcoming appointments from API
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [conversionRate, setConversionRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchUpcoming = async () => {
      const tenantId = localStorage.getItem('nexaloom_tenant_id');
      const token = localStorage.getItem('nexaloom_token');
      if (!tenantId || !token) return;

      try {
        const res = await fetch(`/crm/nexaloom-crm/api/interactions/upcoming?tenantId=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUpcomingAppointments(data);
        }

        // Fetch Stats
        const statsRes = await fetch(`/crm/nexaloom-crm/api/dashboard/stats?tenantId=${tenantId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const stats = await statsRes.json();
          setConversionRate(stats.conversionRate);
        }

      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };
    fetchUpcoming();
  }, []);

  return (
    <div className="p-6 space-y-6 animate-fade-in text-gray-900 dark:text-gray-100">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard Overview</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-100 dark:border-gray-700 shadow-sm">
            <Calendar size={16} />
            <span className="font-medium">
              {new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Pipeline Value</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {/* toLocaleString adds commas and fixes the decimals */}
            £{totalPipelineValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Leads</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {totalLeads}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Conversion Rate</p>
          <p className="text-3xl font-bold text-green-500 dark:text-green-400 mt-2">
            {conversionRate !== null ? `${conversionRate.toFixed(1)}%` : '...'}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-80 flex flex-col transition-colors">
          <h3 className="text-lg font-semibold mb-4 shrink-0 dark:text-white">Leads by Status</h3>
          <div className="flex-1 min-h-0 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', backgroundColor: 'rgba(255, 255, 255, 0.9)' }}
                  itemStyle={{ color: '#1f2937' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-80 flex flex-col transition-colors">
          <h3 className="text-lg font-semibold mb-4 shrink-0 dark:text-white">Pipeline Value Breakdown</h3>
          <div className="flex-1 min-h-0 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={valueByStatus}>
                {/* Use a subtle grid */}
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />

                <XAxis
                  dataKey="name"
                  fontSize={12}
                  tick={{ fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  fontSize={12}
                  tick={{ fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `$${value}`}
                />

                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Total Value"]}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    backgroundColor: 'var(--tw-bg-opacity)',
                    color: 'currentColor'
                  }}
                  cursor={{ fill: 'currentColor', opacity: 0.1 }}
                />

                <Bar
                  dataKey="amount"
                  fill="#3b82f6"
                  radius={[6, 6, 0, 0]}
                  // Add a nice animation
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                <User size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">New Leads</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Prospects requiring immediate attention</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('leads')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
            >
              View Pipeline <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Name</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Value</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {newLeads.length > 0 ? (
                  newLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        <div className="flex flex-col">
                          <span className="truncate">{lead.name}</span>
                          <span className="text-[10px] text-gray-400 font-normal uppercase">{lead.company}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-medium">
                        £{lead.value.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      <p className="text-xs">No new leads found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                <Calendar size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Appointments</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Scheduled events and follow-ups</p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('calendar')}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
            >
              Full Calendar <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Event</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Contact</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-xs">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.map((int: any) => {
                    // Lead lookup no longer needed, using leadName from API
                    return (
                      <tr key={int.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 font-medium text-gray-900 dark:text-white">
                            {int.type === 'MEETING' ? <Video size={14} className="text-blue-500" /> : <Phone size={14} className="text-green-500" />}
                            <span className="capitalize">{int.type ? int.type.toLowerCase() : 'Event'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {int.leadName || 'Unknown Contact'}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <Clock size={12} className="opacity-50" />
                            {new Date(int.start).toLocaleDateString()} at {new Date(int.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <Clock className="w-8 h-8 opacity-20" />
                        <p className="text-xs">No upcoming calls or meetings</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
