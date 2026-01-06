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

const sendProposalEmail = async (to, leadName, proposalName, attachments, branding = {}) => {
    const { companyName = 'Nexaloom CRM', logoUrl, emailSignature } = branding;

    const fromName = companyName.replace(/[^a-zA-Z0-9 ]/g, ''); // Simple sanitize
    const fromAddress = `${fromName} <${process.env.SMTP_FROM.split('<')[1] || process.env.SMTP_FROM}>`;

    // Construct HTML
    let htmlContent = `
        <div style="font-family: sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
    `;

    // 1. Logo
    if (logoUrl) {
        htmlContent += `
            <div style="text-align: center; margin-bottom: 20px;">
                <img src="${logoUrl}" alt="${companyName}" style="max-height: 50px; width: auto;">
            </div>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        `;
    }

    // 2. Body
    htmlContent += `
            <h2>Hello ${leadName},</h2>
            <p>Please find the proposal <strong>${proposalName}</strong> attached to this email.</p>
            <p>If you have any questions, feel free to reach out.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>${companyName}</strong></p>
    `;

    // 3. Signature
    if (emailSignature) {
        htmlContent += `
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 0.9em; color: #666;">
                ${emailSignature.replace(/\n/g, '<br>')}
            </div>
        `;
    }

    htmlContent += `</div>`;

    const mailOptions = {
        from: fromAddress, // "My Company <info@example.com>"
        to: to,
        subject: `New Proposal: ${proposalName}`,
        html: htmlContent,
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