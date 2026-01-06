const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: true, // Use true for Port 465
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    // This helps bypass issues with specific mail server certificates
    tls: {
        rejectUnauthorized: false
    }
});

const sendProposalEmail = async (to, leadName, proposalName, attachments) => {
    const mailOptions = {
        from: process.env.SMTP_FROM,
        to: to,
        subject: `New Proposal: ${proposalName}`,
        html: `
            <div style="font-family: sans-serif; line-height: 1.6;">
                <h2>Hello ${leadName},</h2>
                <p>Please find the proposal <strong>${proposalName}</strong> attached to this email.</p>
                <p>If you have any questions, feel free to reach out.</p>
                <br>
                <p>Best regards,</p>
                <p>${process.env.SMTP_FROM.split('<')[0].trim()}</p>
            </div>
        `,
        attachments: attachments
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Nodemailer Error:', error);
        throw error;
    }
};

module.exports = { sendProposalEmail };