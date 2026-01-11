const express = require('express');
const twilio = require('twilio');
const { v4: uuidv4 } = require('uuid');

module.exports = (pool) => {
    const router = express.Router();

    // Helper to get Twilio Client
    const getClient = () => {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const token = process.env.TWILIO_AUTH_TOKEN;
        if (!accountSid || !token) throw new Error("Missing Twilio Credentials");
        return twilio(accountSid, token);
    };

    // ROUTE: Generate Access Token for Frontend SDK
    router.get('/token', (req, res) => {
        try {
            const accountSid = process.env.TWILIO_ACCOUNT_SID;
            const apiKey = process.env.TWILIO_API_KEY;
            const apiSecret = process.env.TWILIO_API_SECRET;
            const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

            if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
                throw new Error("Missing Twilio Environment Variables");
            }

            const AccessToken = twilio.jwt.AccessToken;
            const VoiceGrant = AccessToken.VoiceGrant;

            // Create an Access Token
            const token = new AccessToken(accountSid, apiKey, apiSecret, {
                identity: 'nexaloom_agent_' + (Math.random().toString(36).substring(7)) // Unique ID for this session
            });

            // Grant access to Voice
            const voiceGrant = new VoiceGrant({
                outgoingApplicationSid: twimlAppSid,
                incomingAllow: true, // Allow incoming calls
            });

            token.addGrant(voiceGrant);

            // Serialize the token to a JWT string
            res.json({ token: token.toJwt() });
        } catch (err) {
            console.error("Twilio Token Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // ROUTE: TwiML Webhook for Outbound Calls
    router.post('/handle-call', (req, res) => {
        const { To } = req.body;
        const callerId = process.env.TWILIO_PHONE_NUMBER;

        console.log(`Initiating call to ${To} from ${callerId}`);

        const response = new twilio.twiml.VoiceResponse();

        if (!To) {
            response.say("Invalid phone number.");
        } else {
            const dial = response.dial({ callerId });
            // Configure status callback to log the call when it completes
            // We use the full public URL or relative if behind a proxy that forwards correctly.
            // Since this is S2S from Twilio, it needs a public URL. 
            // Assuming the system is deployed or using a tunnel. 
            // If strictly local without ngrok, Twilio can't reach this. 
            // But relying on user request to just "Set the URL to /api/voice/call-status-update"
            // The user implies internal routing or they have a way (e.g. standard deploy).
            // We will point to the deployed URL logic or relative if checking local logs.
            // Ideally this should be a full URL.
            // User instruction: "Set the URL to /api/voice/call-status-update"
            // Wait, Twilio needs an absolute URL. 
            // I'll try to use a relative path but Twilio might reject it if it's not absolute.
            // However, often users mask this via a configured base URL in the TwiML App.
            // But TwiML App 'Voice Request URL' is one thing.
            // statusCallback is requested by OUR code.
            // I will use a relative path if the TwiML App is configured with a Base URL? No.
            // Safest bet for 'code' request: "/crm/nexaloom-crm/api/voice/call-status-update".
            // NOTE: If this runs on localhost without tunnel, Twilio will fail to call back. 
            // I'll proceed as requested.

            const callbackUrl = `${process.env.PUBLIC_URL || ''}/crm/nexaloom-crm/api/voice/call-status-update`;

            dial.number({
                statusCallback: callbackUrl,
                statusCallbackEvent: 'completed',
                statusCallbackMethod: 'POST'
            }, To);
        }

        res.type('text/xml');
        res.send(response.toString());
    });

    // ROUTE: Handle Call Status Update (Webhook)
    router.post('/call-status-update', async (req, res) => {
        const { CallStatus, CallDuration, To, CallSid } = req.body;
        console.log(`Call Status Update: ${CallStatus} - Duration: ${CallDuration}s - To: ${To}`);

        if (CallStatus === 'completed') {
            try {
                // 1. Find the Lead
                // Note: 'To' might be formatted differs from DB. Assuming strict match or contains.
                // Simple exact match first.
                const [leads] = await pool.query('SELECT * FROM leads WHERE phone = ? OR phone LIKE ?', [To, `%${To.slice(-10)}%`]);

                if (leads.length > 0) {
                    const lead = leads[0];
                    const durationText = `${Math.floor(CallDuration / 60)}m ${CallDuration % 60}s`;

                    // 2. Insert Log
                    await pool.query(
                        'INSERT INTO interactions (id, tenantId, leadId, type, notes, date, metadata) VALUES (?, ?, ?, ?, ?, NOW(), ?)',
                        [
                            uuidv4(),
                            lead.tenantId,
                            lead.id,
                            'CALL',
                            `Outbound Call: ${durationText}`,
                            JSON.stringify({ CallSid, duration: CallDuration })
                        ]
                    );
                    console.log(`Logged call for lead ${lead.name}`);
                } else {
                    console.log("No matching lead found for phone:", To);
                }
            } catch (err) {
                console.error("Error logging call:", err);
            }
        }

        res.sendStatus(200);
    });

    return router;
};
