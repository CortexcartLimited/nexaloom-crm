const express = require('express');
const twilio = require('twilio');
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
// This is called by Twilio when the frontend SDK initiates a call
router.post('/handle-call', (req, res) => {
    const { To } = req.body;
    const callerId = process.env.TWILIO_PHONE_NUMBER;

    console.log(`Initiating call to ${To} from ${callerId}`);

    const response = new twilio.twiml.VoiceResponse();

    if (!To) {
        response.say("Invalid phone number.");
    } else {
        const dial = response.dial({ callerId });
        // Clean the number if needed, but Twilio handles most formats
        dial.number(To);
    }

    res.type('text/xml');
    res.send(response.toString());
});

module.exports = router;
