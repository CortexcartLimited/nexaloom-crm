
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Phone, Video, Mail, MessageSquare, X, User as UserIcon, Clock, Building, ArrowRight, Check, List } from 'lucide-react';
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
  const [viewAllDate, setViewAllDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'CALENDAR' | 'AGENDA'>('CALENDAR');


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
      // 1. Data Check: Ensure valid start_datetime
      if (!int.date) return;
      const d = new Date(int.date);
      if (isNaN(d.getTime())) return;

      // 2. Filter by Type: Only 'MEETING', 'CALL', or 'EVENT'
      // Exclude 'NOTE', 'EMAIL', 'LOG' etc.
      const allowedTypes = ['MEETING', 'CALL', 'EVENT'];
      if (!allowedTypes.includes(int.type.toUpperCase())) return;

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

    let dateStr = '';
    let timeStr = '';
    const rawDate = selectedInteraction.date;

    // Robust Date Extraction to ensure YYYY-MM-DD
    // Check for ISO (T) or MySQL (space) format first to avoid timezone shifts
    if (typeof rawDate === 'string') {
      if (rawDate.includes('T')) {
        dateStr = rawDate.split('T')[0];
        const timePart = rawDate.split('T')[1];
        timeStr = timePart ? timePart.substring(0, 5) : '10:00';
      } else if (rawDate.includes(' ')) {
        dateStr = rawDate.split(' ')[0];
        const timePart = rawDate.split(' ')[1];
        timeStr = timePart ? timePart.substring(0, 5) : '10:00';
      }
    }

    // Fallback if string parsing failed or it's a Date object
    if (!dateStr || dateStr.length !== 10) {
      const date = new Date(rawDate);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
        timeStr = date.toTimeString().slice(0, 5);
      } else {
        // Last resort default
        dateStr = new Date().toISOString().split('T')[0];
        timeStr = '10:00';
      }
    }

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
    if (interaction.status === 'COMPLETED') return 'bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-gray-200 dark:border-gray-700 opacity-50 grayscale';

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

  const completeInteraction = async (interaction: Interaction) => {
    if (!onUpdateInteraction) return;
    try {
      await onUpdateInteraction(interaction.id, { status: 'COMPLETED' }); // Optimistic update usually handled by parent refresh or local state if passed

      // Log Timeline Event
      const lead = leads.find(l => l.id === interaction.leadId);
      if (lead) {
        const note: Interaction = {
          id: `log-comp-${Date.now()}`,
          tenantId: user.tenantId,
          leadId: lead.id,
          type: 'NOTE',
          notes: `Meeting '${interaction.type}' was completed successfully.`,
          date: formatToMysql(new Date())
        };
        await onAddInteraction(note);
      }
    } catch (err) {
      console.error("Failed to complete interaction", err);
      alert("Failed to mark as complete");
    }
  };

  const handleCompleteEvent = async () => {
    if (!selectedInteraction) return;
    setIsSaving(true);
    await completeInteraction(selectedInteraction);
    setIsDrawerOpen(false);
    setSelectedInteraction(null);
    setIsSaving(false);
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

        <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-1 gap-1">
          <button
            onClick={() => setViewMode('CALENDAR')}
            className={`p-2 rounded-md transition-all ${viewMode === 'CALENDAR' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <CalendarIcon size={18} />
          </button>
          <button
            onClick={() => setViewMode('AGENDA')}
            className={`p-2 rounded-md transition-all ${viewMode === 'AGENDA' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-bold' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
          >
            <List size={18} />
          </button>
        </div>

        <button
          onClick={() => {
            // FIX: Use currently selected day if available, otherwise default to today
            if (!selectedDay) setSelectedDay(new Date().getDate());
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-sm font-semibold"
        >
          <Plus size={18} />
          Schedule Event
        </button>
      </div>



      {
        viewMode === 'CALENDAR' ? (
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
                const isSelected = selectedDay === dayNum;

                return (
                  <div
                    key={dayNum}
                    onClick={() => handleDayClick(dayNum)}
                    className={`min-h-[100px] p-2 border-b border-r border-gray-100 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group relative ${isToday ? 'bg-blue-50/20 dark:bg-blue-900/5' : ''} ${isSelected ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/30' : ''}`}
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewAllDate(new Date(year, month, dayNum));
                          }}
                          className="text-[10px] text-blue-500 hover:text-blue-700 dark:text-blue-400 pl-1 font-bold hover:underline bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded transition-colors w-full text-left"
                        >
                          + {dayEvents.length - 3} more
                        </button>
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
        ) : (
          /* AGENDA VIEW */
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <List className="text-blue-600" />
                Agenda for {selectedDay ? `${monthNames[month]} ${selectedDay}` : 'Today'}
                {!selectedDay && <span className="text-xs font-normal text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">Defaulting to Today</span>}
              </h3>
              <div className="flex gap-2 mt-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
                  const dayNum = new Date().getDate() - new Date().getDay() + i; // Simple week view logic for context, or just list days
                  return null; // Keeping it simple vertical list as requested
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {(() => {
                const targetDay = selectedDay || new Date().getDate();
                // Ensure targetDay is valid (e.g. if checking another month, this logic might need month check, but assuming current month view)
                const events = interactionsByDay[targetDay] || [];

                if (events.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                      <CalendarIcon size={48} className="mb-2 opacity-20" />
                      <p>No events scheduled for this day.</p>
                      <button
                        onClick={() => { setSelectedDay(targetDay); setIsModalOpen(true); }}
                        className="mt-4 text-blue-600 font-bold hover:underline"
                      >
                        Schedule One?
                      </button>
                    </div>
                  );
                }

                return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(event => (
                  <div key={event.id} className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1" onClick={(e) => handleEventClick(e, event)}>
                      <div className="w-16 text-center">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                          {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] uppercase font-bold text-gray-400">{event.type}</p>
                      </div>
                      <div className="w-1 h-10 rounded-full bg-blue-200 dark:bg-blue-800"></div>
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-base">
                          {leads.find(l => l.id === event.leadId)?.name || 'Unknown Lead'}
                        </h4>
                        <p className="text-sm text-gray-500 truncate max-w-md">{event.notes || 'No description'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {event.status === 'COMPLETED' ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1 border border-green-200">
                          <Check size={12} /> Done
                        </span>
                      ) : event.status === 'CANCELLED' ? (
                        <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full border border-red-200">
                          Cancelled
                        </span>
                      ) : (
                        <button
                          onClick={() => completeInteraction(event)}
                          className="px-3 py-1.5 bg-white border border-green-200 text-green-700 hover:bg-green-50 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 group-hover:visible opacity-0 group-hover:opacity-100"
                        >
                          <Check size={12} />
                          Mark Complete
                        </button>
                      )}
                      <button onClick={(e) => handleEventClick(e, event)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )
      }

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
      {
        isModalOpen && (
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
        )
      }


      {/* View All Events Modal */}
      {
        viewAllDate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setViewAllDate(null)}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[70vh]" onClick={e => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                  Events for {viewAllDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </h3>
                <button onClick={() => setViewAllDate(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 overflow-y-auto space-y-2">
                {(() => {
                  const day = viewAllDate.getDate();
                  const events = interactionsByDay[day] || [];
                  if (events.length === 0) return <p className="text-gray-500 text-center py-4">No events found.</p>;
                  return events.map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        handleEventClick(e, event);
                        setViewAllDate(null);
                      }}
                      className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${getEventStyle(event)}`}
                    >
                      <div className="flex-shrink-0">
                        {getEventIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">
                          {leads.find(l => l.id === event.leadId)?.name || 'Unknown Lead'}
                        </p>
                        <p className="text-xs opacity-80 truncate">
                          {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {event.type}
                        </p>
                      </div>
                      <ArrowRight size={14} className="opacity-50" />
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )
      }

      {/* Event Details Drawer */}
      {
        isDrawerOpen && selectedInteraction && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)}></div>
            <div className="relative w-full max-w-sm md:w-96 bg-white dark:bg-gray-800 h-full shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  Event Details
                  {(() => {
                    const s = (selectedInteraction.status || 'SCHEDULED').toUpperCase();
                    let badgeClass = 'bg-blue-100 text-blue-600'; // Default / Scheduled
                    if (s === 'CONFIRMED') badgeClass = 'bg-green-100 text-green-700 border border-green-200';
                    else if (s === 'TENTATIVE') badgeClass = 'bg-yellow-100 text-yellow-700 border border-yellow-200';
                    else if (s === 'CANCELLED') badgeClass = 'bg-red-100 text-red-600 border border-red-200';

                    return <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide shadow-sm ${badgeClass}`}>{s}</span>;
                  })()}
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
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 focus:border-blue-500 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all font-medium shadow-sm"
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
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 focus:border-blue-500 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 transition-all font-medium shadow-sm"
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
                    <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Reason for Reschedule</label>
                      <textarea
                        className="w-full bg-white dark:bg-gray-800 border border-gray-300 focus:border-blue-500 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none shadow-sm"
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
                      <div className="grid grid-cols-2 gap-3 w-full">
                        <button
                          onClick={() => setIsRescheduling(false)}
                          className="px-4 py-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg font-medium text-sm transition-all shadow-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleConfirmReschedule}
                          disabled={isSaving}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSaving ? 'Saving...' : (
                            <>
                              <Check size={16} />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleReschedule}
                          disabled={isSaving}
                          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Reschedule Event
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>

              {selectedInteraction.status !== 'CANCELLED' && !isRescheduling && (
                <div className="p-4 bg-gray-50/50 dark:bg-gray-900/50 text-center space-y-3">
                  {selectedInteraction.status !== 'COMPLETED' && (
                    <button
                      onClick={handleCompleteEvent}
                      disabled={isSaving}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSaving ? 'Updating...' : (
                        <>
                          <Check size={16} />
                          Mark as Completed
                        </>
                      )}
                    </button>
                  )}
                  {/* Cancel */}
                  <button
                    onClick={handleCancelEvent}
                    disabled={isSaving}
                    className="w-full px-4 py-2 text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
