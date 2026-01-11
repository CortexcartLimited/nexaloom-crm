
import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, X, Grid, ArrowRightLeft, User, MessageSquare, Plus, ArrowLeft, Building2, Save } from 'lucide-react';
import { Interaction } from '../types';
import { useTwilioDialer } from '../hooks/useTwilioDialer';

interface DialerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  phoneNumber?: string;
  leadId?: string;
  tenantId?: string;
  onAddInteraction?: (interaction: Interaction) => Promise<void>;
}

const DEPARTMENTS = [
  { id: 'sales', name: 'Sales Department', ext: '101' },
  { id: 'support', name: 'Technical Support', ext: '102' },
  { id: 'billing', name: 'Billing & Finance', ext: '103' },
  { id: 'mgmt', name: 'Management', ext: '104' },
];

export const DialerPanel: React.FC<DialerPanelProps> = ({ isOpen, onClose, userName, phoneNumber, leadId, tenantId, onAddInteraction }) => {
  const [dialedNumber, setDialedNumber] = useState('');
  // const [callStatus, setCallStatus] = useState<'IDLE' | 'DIALING' | 'IN_CALL' | 'TRANSFERRING'>('IDLE');
  const { isReady, status: twilioStatus, makeCall: twilioMakeCall, endCall: twilioEndCall, sendDtmf, error } = useTwilioDialer();

  // Map Twilio status to UI status
  const callStatus = twilioStatus === 'IDLE' || twilioStatus === 'ENDING' ? 'IDLE'
    : twilioStatus === 'IN_CALL' ? 'IN_CALL'
      : 'DIALING'; // CONNECTING, RINGING maps to DIALING

  // Local UI State for Transfer View
  const [isTransferring, setIsTransferring] = useState(false);

  const [callDuration, setCallDuration] = useState(0);
  const [showKeypad, setShowKeypad] = useState(true);
  const [showTransferList, setShowTransferList] = useState(false);
  const [transferNumber, setTransferNumber] = useState('');

  // Notes State
  const [showCallNotes, setShowCallNotes] = useState(false);
  const [callNotes, setCallNotes] = useState('');

  // Pre-fill number when dialer opens
  useEffect(() => {
    if (isOpen && phoneNumber) {
      setDialedNumber(phoneNumber);
    }
  }, [isOpen, phoneNumber]);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'IN_CALL') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const handleDigit = (digit: string) => {
    if (isTransferring) {
      setTransferNumber(prev => prev + digit);
    } else if (callStatus === 'IN_CALL') {
      sendDtmf(digit);
    } else if (callStatus === 'IDLE') {
      setDialedNumber(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (isTransferring) {
      setTransferNumber(prev => prev.slice(0, -1));
    } else {
      setDialedNumber(prev => prev.slice(0, -1));
    }
  };

  const startCall = async () => {
    if (!dialedNumber) return;
    if (!isReady) {
      alert("Phone System Initializing... Please wait.");
      return;
    }
    twilioMakeCall(dialedNumber);
  };

  const endCall = async () => {
    twilioEndCall();

    if (leadId && tenantId && onAddInteraction && callStatus === 'IN_CALL') {
      const finalNotes = callNotes.trim() || `Automated log: Outbound call to ${dialedNumber || phoneNumber || 'Unknown'}. Duration: ${formatTime(callDuration)}.`;

      const interaction: Interaction = {
        id: `int-call-${Date.now()}`,
        tenantId,
        leadId,
        type: 'CALL',
        notes: finalNotes,
        date: new Date().toISOString()
      };
      await onAddInteraction(interaction);
    }

    // UI Cleanup handled by hook status change but we reset local form state
    // setCallStatus('IDLE'); // Driven by hook
    setDialedNumber('');
    setTransferNumber('');
    setCallNotes('');
    setShowCallNotes(false);
    setShowTransferList(false);
    setShowKeypad(true);
  };

  const initiateTransfer = () => {
    setShowTransferList(true);
    setIsTransferring(true);

    // Auto-log transfer activity if notes are open
    if (showCallNotes) {
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCallNotes(prev => `[${timestamp}] Initiated transfer...\n` + prev);
    }
  };

  const toggleNotes = () => {
    if (!showCallNotes && !callNotes) {
      const now = new Date();
      const timestamp = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const autoLog = `CALL LOG: ${userName} - ${timestamp}\nAction: Outbound Connection to ${dialedNumber || 'Private'}\n------------------------------------------------\n\n`;
      setCallNotes(autoLog);
    }
    setShowCallNotes(!showCallNotes);
  };

  const completeTransfer = (deptName?: string) => {
    const target = deptName || transferNumber;
    alert(`Call transferred to ${target}`);
    endCall();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto transition-opacity"
        onClick={onClose}
      />
      <div
        className={`absolute top-0 right-0 h-full w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl pointer-events-auto transform transition-transform duration-300 ease-out border-l border-gray-200 dark:border-gray-800 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-950/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${callStatus === 'IN_CALL' ? 'bg-green-500 animate-pulse' : 'bg-blue-600'} text-white`}>
              <Phone size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {callStatus === 'IDLE' ? 'Nexaloom Dialer' :
                  callStatus === 'DIALING' ? 'Calling...' :
                    isTransferring ? 'Transfer Call' : 'In Call'}
              </h2>
              {/* Show Hook Errors */}
              {error && <p className="text-xs text-red-500">{error}</p>}
              {callStatus === 'IN_CALL' && (
                <p className="text-xs font-mono text-green-600 dark:text-green-400 font-bold">{formatTime(callDuration)}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Call Display Area */}
        <div className="p-8 text-center bg-gradient-to-b from-gray-50/50 to-white dark:from-gray-950/50 dark:to-gray-900 border-b border-gray-100 dark:border-gray-800">
          {callStatus === 'IDLE' ? (
            <div className="space-y-4">
              <input
                type="text"
                readOnly
                value={dialedNumber}
                placeholder="000-000-0000"
                className="w-full text-3xl font-bold tracking-widest text-center bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-700"
              />
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Ready to Connect</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full mx-auto flex items-center justify-center text-gray-400">
                <User size={40} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {isTransferring ? (transferNumber || 'Extension') : (dialedNumber || 'Private Number')}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {isTransferring ? 'Transferring...' : 'Active Connection'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls / Dialer Pad */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {callStatus === 'IDLE' && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(digit => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  className="h-16 flex items-center justify-center text-2xl font-semibold bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 border border-gray-100 dark:border-gray-700 shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                onClick={startCall}
                disabled={!dialedNumber}
                className="h-16 flex items-center justify-center bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:grayscale"
              >
                <Phone size={24} />
              </button>
              <button
                onClick={handleBackspace}
                className="h-16 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
            </div>
          )}

          {callStatus === 'IN_CALL' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={toggleNotes}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all group ${showCallNotes ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                >
                  <div className={`p-3 rounded-xl shadow-sm transition-colors ${showCallNotes ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:text-blue-600'}`}>
                    <MessageSquare size={20} />
                  </div>
                  <span className={`text-xs font-bold ${showCallNotes ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}>Notes</span>
                </button>
                <button
                  onClick={initiateTransfer}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-600">
                    <ArrowRightLeft size={20} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Transfer</span>
                </button>
                <button className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group">
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-600">
                    <Plus size={20} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Add Guest</span>
                </button>
                <button
                  onClick={() => setShowKeypad(!showKeypad)}
                  className="flex flex-col items-center gap-2 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
                >
                  <div className="p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm text-gray-600 dark:text-gray-300 group-hover:text-blue-600">
                    <Grid size={20} />
                  </div>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Keypad</span>
                </button>
              </div>

              <div className="space-y-4">
                <button
                  onClick={endCall}
                  className="w-full h-16 flex items-center justify-center gap-3 bg-red-500 text-white rounded-2xl hover:bg-red-600 transition-all active:scale-95 shadow-xl shadow-red-500/20 font-bold"
                >
                  <PhoneOff size={24} />
                  End Call
                </button>

                {showCallNotes && (
                  <div className="animate-in slide-in-from-top-2 duration-300 space-y-2 pb-4">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1">
                        <MessageSquare size={12} /> Recent Activity & Notes
                      </label>
                      {(callNotes || leadId) && (
                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                          <Save size={10} /> {leadId ? 'Logging to customer account' : 'Notes enabled'}
                        </span>
                      )}
                    </div>
                    <textarea
                      autoFocus
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="Add custom notes here..."
                      className="w-full h-48 p-4 bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700 dark:text-gray-300 shadow-inner resize-none transition-colors font-sans"
                    />
                    <p className="text-[10px] text-gray-400 italic text-center px-4">
                      Type your custom details below the separator line.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isTransferring && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Select Department</h3>
                <div className="space-y-2">
                  {DEPARTMENTS.map(dept => (
                    <button
                      key={dept.id}
                      onClick={() => completeTransfer(dept.name)}
                      className="w-full p-4 flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                          <Building2 size={20} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{dept.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Ext: {dept.ext}</p>
                        </div>
                      </div>
                      <ArrowRightLeft size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Manual Extension</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={transferNumber}
                    onChange={(e) => setTransferNumber(e.target.value)}
                    placeholder="Enter extension..."
                    className="flex-1 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-center font-mono tracking-widest"
                  />
                  <button
                    onClick={() => completeTransfer()}
                    disabled={!transferNumber}
                    className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <ArrowRightLeft size={20} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setIsTransferring(false)}
                className="w-full py-3 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                Back to Call
              </button>
            </div>
          )}
        </div>

        {/* Recent Calls (Dummy) */}
        {callStatus === 'IDLE' && (
          <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-950/30">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {[
                { name: 'Robert California', time: '2 hours ago', status: 'missed' },
                { name: 'Ryan Howard', time: 'Yesterday', status: 'incoming' },
                { name: '(555) 0100', time: '3 days ago', status: 'outgoing' }
              ].map((call, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer" onClick={() => setDialedNumber(call.name)}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${call.status === 'missed' ? 'bg-red-500' : call.status === 'incoming' ? 'bg-green-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">{call.name}</p>
                      <p className="text-[10px] text-gray-400">{call.time}</p>
                    </div>
                  </div>
                  <Phone size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
