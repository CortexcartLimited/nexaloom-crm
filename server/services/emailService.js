const nodemailer = require('nodemailer');
const path = require('path');

// Configure transporter
// Uses environment variables for SMTP configuration
// Fallback to console-only mode if no config is present (for dev safety)
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Generate HTML email template
 * @param {string} leadName 
 * @param {string} proposalName 
 */
const generateProposalEmail = (leadName, proposalName) => {
    return `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>Hi ${leadName},</p>
            <p>Please find our proposal for <strong>${proposalName}</strong> and the attached documents for your review.</p>
            <p>Please let us know if you have any questions.</p>
            <br/>
            <p>Best Regards,</p>
            <p><strong>Nexaloom Team</strong></p>
        </div>
    `;
};

/**
 * Send Proposal Email with Attachments
 * @param {string} to Recipient email
 * @param {string} leadName recipient name
 * @param {string} proposalName proposal title
 * @param {Array<{filename: string, path: string}>} attachments list of file objects
 */
const sendProposalEmail = async (to, leadName, proposalName, attachments = []) => {
    try {
        const mailOptions = {
            from: process.env.SMTP_FROM || '"Nexaloom CRM" <no-reply@nexaloom.com>',
            to: to,
            bcc: process.env.SMTP_USER,
            subject: `Proposal: ${proposalName}`,
            html: generateProposalEmail(leadName, proposalName),
            attachments: attachments
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = {
    sendProposalEmail
};
