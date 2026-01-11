import { useState, useEffect, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';

export type CallStatus = 'IDLE' | 'CONNECTING' | 'RINGING' | 'IN_CALL' | 'ENDING';

export const useTwilioDialer = () => {
    const [device, setDevice] = useState<Device | null>(null);
    const [status, setStatus] = useState<CallStatus>('IDLE');
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    // Initialize Device
    useEffect(() => {
        const initDevice = async () => {
            try {
                // 1. Fetch Capability Token
                const res = await fetch('/crm/nexaloom-crm/api/voice/token');
                if (!res.ok) throw new Error("Failed to fetch voice token");
                const { token } = await res.json();

                // 2. Setup Device
                const newDevice = new Device(token, {
                    logLevel: 1,
                    codecPreferences: ['opus', 'pcmu'] as any[]
                });

                newDevice.on('registered', () => {
                    console.log("Twilio Device Ready");
                    setIsReady(true);
                });

                newDevice.on('error', (err) => {
                    console.error("Twilio Device Error:", err);
                    setError(err.message);
                });

                // Incoming call handling can be added here
                // newDevice.on('incoming', (call) => ...)

                await newDevice.register();
                setDevice(newDevice);

            } catch (err: any) {
                console.error("Dialer Init Failed:", err);
                setError(err.message);
            }
        };

        initDevice();

        return () => {
            if (device) {
                device.destroy();
            }
        };
    }, []);

    const makeCall = async (phoneNumber: string) => {
        if (!device || !isReady) {
            setError("Dialer not ready");
            return;
        }

        try {
            setStatus('CONNECTING');
            console.log("Calling:", phoneNumber);

            const call = await device.connect({ params: { To: phoneNumber } });

            call.on('accept', () => {
                setStatus('IN_CALL');
                setActiveCall(call);
            });

            call.on('disconnect', () => {
                setStatus('IDLE');
                setActiveCall(null);
            });

            call.on('cancel', () => {
                setStatus('IDLE');
                setActiveCall(null);
            });

            // Important: Set active call immediately to allow early hanging up
            setActiveCall(call);

        } catch (err: any) {
            console.error("Call Failed:", err);
            setStatus('IDLE');
            setError(err.message);
        }
    };

    const endCall = () => {
        if (activeCall) {
            console.log("Ending Call...");
            activeCall.disconnect();
            setStatus('ENDING');
        } else if (device) {
            device.disconnectAll(); // Safety fallback
            setStatus('IDLE');
        }
    };

    const sendDtmf = (digit: string) => {
        if (activeCall) {
            activeCall.sendDigits(digit);
        }
    };

    return {
        isReady,
        status,
        error,
        makeCall,
        endCall,
        sendDtmf
    };
};
