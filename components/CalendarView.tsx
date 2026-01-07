
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Phone, Video, Mail, MessageSquare, X, User as UserIcon, Clock, Building, ArrowRight, Check } from 'lucide-react';
import { Interaction, Lead, User } from '../types';
import { formatToMysql } from '../utils/formatDate';

interface CalendarViewProps {
  interactions: Interaction[];
  leads: Lead[];
  user: User;
  onAddInteraction: (interaction: Interaction) => Promise<void>;
  onUpdateInteraction?: (id: string, updates: Partial<Interaction>) => Promise<void>; // Make optional to prevent breakage if not passed immediately
}

export const CalendarView: React.FC<CalendarViewProps> = ({ interactions, leads, user, onAddInteraction, onUpdateInteraction }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);


  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [rescheduleForm, setRescheduleForm] = useState({ date: '', time: '', reason: '' });

  // Schedule State
  const [newMeeting, setNewMeeting] = useState({
    leadId: '',
    type: 'MEETING' as Interaction['type'],
    notes: '',
    time: '10:00'
  });

  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const startDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const numDays = daysInMonth(year, month);
  const startDay = startDayOfMonth(year, month);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const interactionsByDay = useMemo(() => {
    const map: Record<number, Interaction[]> = {};
    interactions.forEach(int => {
      const d = new Date(int.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(int);
      }
    });
    return map;
  }, [interactions, year, month]);

  const handleDayClick = (day: number) => {
    setSelectedDay(day);
    setNewMeeting({ leadId: '', type: 'MEETING', notes: '', time: '10:00' });
    setIsModalOpen(true);
  };

  const handleEventClick = (e: React.MouseEvent, interaction: Interaction) => {
    e.stopPropagation();
    setSelectedInteraction(interaction);
    setIsRescheduling(false);
    setIsDrawerOpen(true);
  };

  const handleReschedule = () => {
    if (!selectedInteraction) return;

    const date = new Date(selectedInteraction.date);
    // Format for input[type="date"] (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const timeStr = date.toTimeString().slice(0, 5); // HH:MM

    setRescheduleForm({
      date: dateStr,
      time: timeStr,
      reason: ''
    });
    setIsRescheduling(true);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedInteraction || !onUpdateInteraction) return;

    try {
      setIsSaving(true);
      const oldDate = new Date(selectedInteraction.date);
      const oldDateStr = oldDate.toLocaleDateString() + ' ' + oldDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const [y, m, d] = rescheduleForm.date.split('-').map(Number);
      const [h, min] = rescheduleForm.time.split(':').map(Number);
      const newDate = new Date(y, m - 1, d, h, min);
      const newDateMysql = formatToMysql(newDate);
      const newDateStr = newDate.toLocaleDateString() + ' ' + newDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Optimistic UI (ISO is fine for local state if needed, but consistency is better)
      setSelectedInteraction({ ...selectedInteraction, date: newDate.toISOString() }); // Keep ISO for frontend state compatibility if needed, or switch? Original was ISO.

      // API
      await onUpdateInteraction(selectedInteraction.id, { date: newDateMysql });

      // History
      const lead = leads.find(l => l.id === selectedInteraction.leadId);
      if (lead) {
        const log: Interaction = {
          id: `log-resched-${Date.now()}`,
          tenantId: user.tenantId,
          leadId: lead.id,
          type: 'NOTE',
          notes: `${user.name} Rescheduled '${selectedInteraction.type}' from ${oldDateStr} to ${newDateStr}.\nReason: ${rescheduleForm.reason || 'No reason provided'}`,
          date: formatToMysql(new Date())
        };
        await onAddInteraction(log);
      }

      setIsRescheduling(false);
    } catch (error) {
      console.error("Reschedule failed:", error);
      alert("Failed to reschedule event.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEvent = async () => {
    if (!selectedInteraction || !onUpdateInteraction) return;
    if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;

    try {
      setIsSaving(true);
      await onUpdateInteraction(selectedInteraction.id, { status: 'CANCELLED' });

      // Log Timeline Event
      const lead = leads.find(l => l.id === selectedInteraction.leadId);
      if (lead) {
        const note: Interaction = {
          id: `log-${Date.now()}`,
          tenantId: user.tenantId,
          leadId: lead.id,
          type: 'NOTE',
          notes: `${user.name} Cancelled the event '${selectedInteraction.type}' scheduled for ${new Date(selectedInteraction.date).toLocaleDateString()}.`,
          date: formatToMysql(new Date())
        };
        await onAddInteraction(note);
      }

      setIsDrawerOpen(false);
      setSelectedInteraction(null);
    } catch (error) {
      console.error("Cancellation failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeeting.leadId || !selectedDay) return;

    if (!newMeeting.leadId || !selectedDay) return;

    // FIX: Construct date using local time to prevent timezone shifts
    const date = new Date(year, month, selectedDay);
    const [hours, minutes] = newMeeting.time.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);

    // Store as MySQL string for API
    const scheduledTimeMysql = formatToMysql(date);
    const scheduledTime = date.toISOString(); // Keep ISO for local logic if needed

    // 1. Create the Primary Event Interaction
    // CREATE NEW EVENT
    const interaction: Interaction = {
      id: `int-${Date.now()}`,
      tenantId: user.tenantId,
      leadId: newMeeting.leadId,
      type: newMeeting.type,
      notes: newMeeting.notes,
      date: scheduledTimeMysql, // Send MySQL format to API
      status: 'SCHEDULED'
    };

    const now = new Date();
    const auditTimestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const eventDateDisplay = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let auditNote = `EVENT BOOKED: ${user.name} - ${auditTimestamp}\n`;
    auditNote += `Action: New ${newMeeting.type} Scheduled\n`;
    auditNote += `Scheduled For: ${eventDateDisplay} at ${newMeeting.time}\n`;
    auditNote += `------------------------------------------------\n`;
    auditNote += `Agenda/Notes: ${newMeeting.notes || 'None provided'}\n`;
    auditNote += `Status: CALENDAR_SYNCED`;

    const auditInteraction: Interaction = {
      id: `int-log-${Date.now()}`,
      tenantId: user.tenantId,
      leadId: newMeeting.leadId,
      type: 'NOTE',
      notes: auditNote,
      date: formatToMysql(now)
    };

    await onAddInteraction(interaction);
    await onAddInteraction(auditInteraction);

    setIsModalOpen(false);
    setNewMeeting({ leadId: '', type: 'MEETING', notes: '', time: '10:00' });
  };

  const getEventStyle = (interaction: Interaction) => {
    if (interaction.status === 'CANCELLED') return 'bg-gray-100 text-gray-400 border-gray-200 line-through opacity-70';

    switch (interaction.type) {
      case 'MEETING': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'CALL': return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'EMAIL': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 border-orange-200 dark:border-orange-800';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const getEventIcon = (type: Interaction['type']) => {
    switch (type) {
      case 'MEETING': return <Video size={10} />;
      case 'CALL': return <Phone size={10} />;
      case 'EMAIL': return <Mail size={10} />;
      default: return <MessageSquare size={10} />;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-blue-600" />
            {monthNames[month]} {year}
          </h2>
          <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 border-r border-gray-200 dark:border-gray-700 transition-colors"><ChevronLeft size={18} /></button>
            <button onClick={goToToday} className="px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Today</button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>

        <button
          onClick={() => { setSelectedDay(new Date().getDate()); setIsModalOpen(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm font-semibold"
        >
          <Plus size={18} />
          Schedule Event
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-1 flex flex-col">
        {/* Calendar Header Days */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 flex-1">
          {/* Empty placeholders for prev month offset */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="border-b border-r border-gray-100 dark:border-gray-700/50 bg-gray-50/20 dark:bg-gray-950/20" />
          ))}

          {/* Actual days */}
          {Array.from({ length: numDays }).map((_, i) => {
            const dayNum = i + 1;
            const dayEvents = interactionsByDay[dayNum] || [];
            const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

            return (
              <div
                key={dayNum}
                onClick={() => handleDayClick(dayNum)}
                className={`min-h-[100px] p-2 border-b border-r border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group relative ${isToday ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''}`}
              >
                <div className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 transition-colors ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'}`}>
                  {dayNum}
                </div>

                <div className="space-y-1 overflow-hidden">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => handleEventClick(e, event)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border truncate flex items-center gap-1 shadow-sm transition-all hover:scale-[1.02] ${getEventStyle(event)}`}
                    >
                      {getEventIcon(event.type)}
                      {event.type === 'MEETING' ? 'Meeting' : event.type === 'CALL' ? 'Call' : 'Email'}: {leads.find(l => l.id === event.leadId)?.name || 'Lead'}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 pl-1 font-medium italic">
                      + {dayEvents.length - 3} more
                    </div>
                  )}
                </div>

                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="p-1 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm text-blue-600">
                    <Plus size={10} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* End of month padding */}
          {Array.from({ length: 42 - (numDays + startDay) }).map((_, i) => (
            <div key={`end-empty-${i}`} className="border-b border-r border-gray-100 dark:border-gray-700/50 bg-gray-50/20 dark:bg-gray-950/20" />
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-6">
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full bg-blue-500" /> Meetings
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full bg-green-500" /> Calls
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="w-3 h-3 rounded-full bg-orange-500" /> Emails
        </div>
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors flex flex-col">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <CalendarIcon size={18} className="text-blue-600" />
                Event Details
                {selectedDay && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">for {monthNames[month]} {selectedDay}</span>}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2"><UserIcon size={14} /> Select Lead</label>
                <select
                  required
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newMeeting.leadId}
                  onChange={(e) => setNewMeeting({ ...newMeeting, leadId: e.target.value })}
                >
                  <option value="">-- Choose a contact --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} ({lead.company})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Event Type</label>
                  <select
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={newMeeting.type}
                    onChange={(e) => setNewMeeting({ ...newMeeting, type: e.target.value as any })}
                  >
                    <option value="MEETING">Meeting</option>
                    <option value="CALL">Call</option>
                    <option value="EMAIL">Email Follow-up</option>
                    <option value="NOTE">Task / Note</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-2"><Clock size={14} /> Time</label>
                  <input
                    type="time"
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={newMeeting.time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes / Agenda</label>
                <textarea
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                  placeholder="What are the goals for this session?"
                  value={newMeeting.notes}
                  onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
                  Confirm Schedule <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Event Details Drawer */}
      {isDrawerOpen && selectedInteraction && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
          <div className="relative w-full max-w-sm md:w-96 bg-white dark:bg-gray-800 h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                Event Details
                {selectedInteraction.status === 'CANCELLED' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">CANCELLED</span>}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 flex-1">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Lead / Contact</label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                    <UserIcon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-lg">
                      {leads.find(l => l.id === selectedInteraction.leadId)?.name || 'Unknown Lead'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {leads.find(l => l.id === selectedInteraction.leadId)?.company || 'No Company'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Date</label>
                  {isRescheduling ? (
                    <input
                      type="date"
                      className="w-full bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all font-bold"
                      value={rescheduleForm.date}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, date: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedInteraction.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-700">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Time</label>
                  {isRescheduling ? (
                    <input
                      type="time"
                      className="w-full bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all font-bold"
                      value={rescheduleForm.time}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, time: e.target.value })}
                    />
                  ) : (
                    <p className="font-medium text-gray-900 dark:text-white">
                      {new Date(selectedInteraction.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>

                {isRescheduling && (
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Reason for Reschedule</label>
                    <textarea
                      className="w-full bg-white dark:bg-gray-800 border-2 border-blue-300 dark:border-blue-700 rounded px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all resize-none"
                      rows={2}
                      placeholder="Why is this being moved?"
                      value={rescheduleForm.reason}
                      onChange={(e) => setRescheduleForm({ ...rescheduleForm, reason: e.target.value })}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Description / Notes</label>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                  {selectedInteraction.notes || 'No description provided.'}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-end gap-3">
              {selectedInteraction.status !== 'CANCELLED' && (
                <>
                  {isRescheduling ? (
                    <>
                      <button
                        onClick={() => setIsRescheduling(false)}
                        className="px-4 py-2 text-gray-500 underline text-sm hover:text-gray-700 transition-colors"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleConfirmReschedule}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : (
                          <>
                            <Check size={16} />
                            Confirm Reschedule
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={handleReschedule}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reschedule
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Cancel at bottom */}
            {selectedInteraction.status !== 'CANCELLED' && !isRescheduling && (
              <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 text-center">
                <button
                  onClick={handleCancelEvent}
                  disabled={isSaving}
                  className="w-full px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Cancelling...' : 'Cancel Event'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
