
import React, { useState, useMemo } from 'react';
import { Task, Lead, TaskPriority } from '../types';
import { CheckCircle2, Circle, Clock, Trash2, Plus, User, Building, AlertCircle, ArrowRight, X, ListTodo, ChevronDown, Bell, BellOff, Calendar as CalendarIcon, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
  leads: Lead[];
  onAddTask: (task: Omit<Task, 'id' | 'tenantId' | 'createdAt' | 'isCompleted'>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export const TasksView: React.FC<TasksViewProps> = ({ tasks, leads, onAddTask, onUpdateTask, onDeleteTask }) => {
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<string | null>(null);
  
  // Calendar Navigation State
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    deadline: new Date().toISOString().split('T')[0],
    reminderAt: '',
    leadId: '',
    priority: TaskPriority.MEDIUM
  });

  const filteredTasks = tasks.filter(t => activeTab === 'PENDING' ? !t.isCompleted : t.isCompleted);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const taskPayload = {
        ...newTask,
        reminderAt: showReminderOptions ? newTask.reminderAt : undefined
    };

    await onAddTask(taskPayload);
    
    if (showReminderOptions && newTask.reminderAt) {
        setNotificationStatus(`Reminder scheduled for ${new Date(newTask.reminderAt).toLocaleString()}.`);
        setTimeout(() => setNotificationStatus(null), 5000);
    }

    setIsAddModalOpen(false);
    setShowReminderOptions(false);
    setNewTask({ 
        title: '', 
        description: '', 
        deadline: new Date().toISOString().split('T')[0], 
        reminderAt: '',
        leadId: '', 
        priority: TaskPriority.MEDIUM 
    });
  };

  const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30';
      case TaskPriority.MEDIUM:
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30';
      case TaskPriority.LOW:
        return 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // --- Calendar Logic ---
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    tasks.forEach(task => {
      const d = new Date(task.deadline);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(task);
      }
    });
    return map;
  }, [tasks, year, month]);

  const handleDayClick = (day: number) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    setNewTask({ ...newTask, deadline: dateStr });
    setIsAddModalOpen(true);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Task Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Keep track of follow-ups and action items.</p>
        </div>
        <div className="flex items-center gap-3">
            {notificationStatus && (
                <div className="hidden lg:flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-2 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-right-4">
                    <Bell size={14} className="animate-bounce" />
                    {notificationStatus}
                </div>
            )}
            
            <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex shadow-sm mr-2">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="List View"
                >
                    <ListTodo size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('CALENDAR')}
                    className={`p-1.5 rounded-md transition-all ${viewMode === 'CALENDAR' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    title="Calendar View"
                >
                    <CalendarIcon size={18} />
                </button>
            </div>

            <button 
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
            >
                <Plus size={18} />
                Create Task
            </button>
        </div>
      </div>

      {viewMode === 'LIST' ? (
        <>
          <div className="flex items-center gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-700 flex shadow-sm">
              <button 
                onClick={() => setActiveTab('PENDING')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'PENDING' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
              >
                Pending ({tasks.filter(t => !t.isCompleted).length})
              </button>
              <button 
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'COMPLETED' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'}`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {filteredTasks.length > 0 ? filteredTasks.map(task => {
              const lead = leads.find(l => l.id === task.leadId);
              const overdue = !task.isCompleted && new Date(task.deadline) < new Date();
              const hasReminder = !!task.reminderAt && !task.isCompleted;

              return (
                <div 
                  key={task.id} 
                  className={`bg-white dark:bg-gray-800 p-5 rounded-xl border shadow-sm transition-all group flex items-start gap-4 ${overdue ? 'border-red-200 dark:border-red-900/50' : 'border-gray-100 dark:border-gray-700'}`}
                >
                  <button 
                    onClick={() => onUpdateTask(task.id, { isCompleted: !task.isCompleted })}
                    className={`mt-1 transition-colors ${task.isCompleted ? 'text-green-500' : overdue ? 'text-red-400' : 'text-gray-300 hover:text-blue-500'}`}
                  >
                    {task.isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className={`font-semibold text-gray-900 dark:text-white ${task.isCompleted ? 'line-through opacity-50' : ''}`}>
                            {task.title}
                            </h3>
                            {!task.isCompleted && (
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityStyles(task.priority)}`}>
                                    {task.priority}
                                </span>
                            )}
                            {hasReminder && (
                                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" title={`Reminder set for ${new Date(task.reminderAt!).toLocaleString()}`}>
                                    <Bell size={10} />
                                    Reminder Set
                                </span>
                            )}
                        </div>
                        <p className={`text-sm text-gray-500 dark:text-gray-400 line-clamp-2 ${task.isCompleted ? 'line-through opacity-40' : ''}`}>
                          {task.description}
                        </p>
                      </div>
                      <button 
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-medium">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${overdue ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {overdue ? <AlertCircle size={12} /> : <Clock size={12} />}
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </div>
                      
                      {lead && (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                          <User size={12} />
                          {lead.name}
                          <span className="text-gray-400 dark:text-gray-500 font-normal">@</span>
                          <span className="flex items-center gap-1"><Building size={12} /> {lead.company}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-20 bg-gray-50 dark:bg-gray-800/50 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl text-gray-400 dark:text-gray-500">
                <ListTodo size={48} className="opacity-20 mb-4" />
                <p className="font-medium">No {activeTab.toLowerCase()} tasks found.</p>
                <p className="text-sm">Stay on top of your work by adding a new task.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {monthNames[month]} {year}
                    </h3>
                    <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-r border-gray-200 dark:border-gray-700 transition-colors"><ChevronLeft size={16} /></button>
                        <button onClick={goToToday} className="px-3 py-1 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Today</button>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"><ChevronRight size={16} /></button>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> High</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Medium</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Low</div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-2 text-center text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 flex-1">
                    {Array.from({ length: startDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="border-b border-r border-gray-50 dark:border-gray-700/30 bg-gray-50/10" />
                    ))}

                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const dayNum = i + 1;
                        const dayTasks = tasksByDay[dayNum] || [];
                        const isToday = dayNum === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                        return (
                            <div 
                                key={dayNum} 
                                onClick={() => handleDayClick(dayNum)}
                                className={`min-h-[80px] p-1.5 border-b border-r border-gray-50 dark:border-gray-700/30 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group relative ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/5' : ''}`}
                            >
                                <div className={`text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600'}`}>
                                    {dayNum}
                                </div>
                                
                                <div className="space-y-1 overflow-hidden">
                                    {dayTasks.slice(0, 3).map(task => (
                                        <div key={task.id} className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold truncate flex items-center gap-1 border ${
                                            task.isCompleted ? 'bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-700/50 dark:text-gray-500 dark:border-gray-600 line-through' :
                                            task.priority === TaskPriority.HIGH ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30' :
                                            task.priority === TaskPriority.MEDIUM ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30' :
                                            'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/30'
                                        }`}>
                                            <div className={`w-1 h-1 rounded-full shrink-0 ${
                                                task.isCompleted ? 'bg-gray-300' :
                                                task.priority === TaskPriority.HIGH ? 'bg-red-500' :
                                                task.priority === TaskPriority.MEDIUM ? 'bg-amber-500' : 'bg-blue-500'
                                            }`} />
                                            {task.title}
                                        </div>
                                    ))}
                                    {dayTasks.length > 3 && (
                                        <div className="text-[8px] text-gray-400 pl-1 font-bold">
                                            + {dayTasks.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {Array.from({ length: 42 - (daysInMonth + startDay) }).map((_, i) => (
                        <div key={`end-empty-${i}`} className="border-b border-r border-gray-50 dark:border-gray-700/30 bg-gray-50/10" />
                    ))}
                </div>
            </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden transition-colors">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <ListTodo size={18} className="text-blue-500" />
                New Task
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Task Title <span className="text-red-500">*</span></label>
                <input 
                  required 
                  type="text" 
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  value={newTask.title} 
                  onChange={e => setNewTask({...newTask, title: e.target.value})} 
                  placeholder="e.g. Call client for follow-up" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea 
                  rows={3}
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" 
                  value={newTask.description} 
                  onChange={e => setNewTask({...newTask, description: e.target.value})} 
                  placeholder="Add details about this task..." 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline <span className="text-red-500">*</span></label>
                  <input 
                    required 
                    type="date" 
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                    value={newTask.deadline} 
                    onChange={e => setNewTask({...newTask, deadline: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                  <select 
                    className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as TaskPriority})}
                  >
                    <option value={TaskPriority.LOW}>Low</option>
                    <option value={TaskPriority.MEDIUM}>Medium</option>
                    <option value={TaskPriority.HIGH}>High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link to Lead</label>
                <select 
                  className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newTask.leadId}
                  onChange={e => setNewTask({...newTask, leadId: e.target.value})}
                >
                  <option value="">-- No Link --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>{lead.name} ({lead.company})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <button 
                    type="button"
                    onClick={() => setShowReminderOptions(!showReminderOptions)}
                    className={`flex items-center justify-between w-full p-3 rounded-xl border transition-all ${showReminderOptions ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100'}`}
                >
                    <div className="flex items-center gap-2 font-semibold text-sm">
                        {showReminderOptions ? <Bell size={16} /> : <BellOff size={16} />}
                        Set Deadline Reminder
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-300 ${showReminderOptions ? 'rotate-180' : ''}`} />
                </button>

                {showReminderOptions && (
                    <div className="mt-3 p-4 bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900 rounded-xl space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">Reminder Date & Time</label>
                            <input 
                                required={showReminderOptions}
                                type="datetime-local" 
                                className="w-full rounded-lg border-gray-300 dark:border-gray-600 border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={newTask.reminderAt}
                                onChange={e => setNewTask({...newTask, reminderAt: e.target.value})}
                            />
                        </div>
                        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-lg">
                            <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 leading-normal">
                                Nexaloom will send an automated email notification and browser alert to you at the specified time.
                            </p>
                        </div>
                    </div>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 flex items-center gap-2">
                  Create Task <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
