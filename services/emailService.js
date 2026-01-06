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

const sendProposalEmail = async (to, leadName, proposalName, attachments, branding = {}, proposalDetails = {}) => {
    const { companyName = 'Nexaloom CRM', logoUrl, emailSignature } = branding;
    const { items = [], totalValue = 0, terms = '' } = proposalDetails;

    const fromName = companyName.replace(/[^a-zA-Z0-9 ]/g, ''); // Simple sanitize
    const fromAddress = `${fromName} <${process.env.SMTP_FROM.split('<')[1] || process.env.SMTP_FROM}>`;

    // --- Helper for formatting currency ---
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // --- Build Item Rows ---
    const rowsHtml = items.map(item => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px; color: #333;">
                <div style="font-weight: bold;">${item.name}</div>
                <div style="font-size: 0.85em; color: #777;">${item.description || ''}</div>
            </td>
            <td style="padding: 10px; text-align: center; color: #333;">${item.quantity}</td>
            <td style="padding: 10px; text-align: right; color: #333;">${formatMoney(item.price)}</td>
            <td style="padding: 10px; text-align: right; font-weight: bold; color: #333;">${formatMoney(item.price * item.quantity)}</td>
        </tr>
    `).join('');

    // --- Build Full HTML ---
    let htmlContent = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
    `;

    // 1. Header (Logo)
    if (logoUrl) {
        htmlContent += `
            <div style="text-align: center; background-color: #f8f9fa; padding: 20px;">
                <img src="${logoUrl}" alt="${companyName}" style="max-height: 60px; width: auto;">
            </div>
        `;
    } else {
        htmlContent += `
             <div style="text-align: center; background-color: #f8f9fa; padding: 20px;">
                <h2 style="margin:0; color: #333;">${companyName}</h2>
            </div>
        `;
    }

    // 2. Greeting & Intro
    htmlContent += `
        <div style="padding: 30px;">
            <h2 style="margin-top: 0; color: #2c3e50;">Proposal: ${proposalName}</h2>
            <p>Hello ${leadName},</p>
            <p>We are pleased to submit the attached proposal for your review. Below is a summary of the services and costs outlined.</p>
            
            <div style="margin: 30px 0;">
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="background-color: #f1f1f1; text-align: left;">
                            <th style="padding: 10px; border-radius: 4px 0 0 4px;">Description</th>
                            <th style="padding: 10px; text-align: center;">Qty</th>
                            <th style="padding: 10px; text-align: right;">Price</th>
                            <th style="padding: 10px; text-align: right; border-radius: 0 4px 4px 0;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="3" style="padding: 15px 10px; text-align: right; font-weight: bold; color: #555;">Total Value:</td>
                            <td style="padding: 15px 10px; text-align: right; font-weight: bold; font-size: 1.1em; color: #2c3e50;">${formatMoney(totalValue)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            ${terms ? `
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 4px; font-size: 0.9em; margin-bottom: 20px;">
                <strong style="display: block; margin-bottom: 5px; color: #555;">Terms & Conditions</strong>
                <p style="margin: 0; color: #666; white-space: pre-wrap;">${terms}</p>
            </div>
            ` : ''}

            <p>Please review the attached document for full details. If you have any questions or would like to proceed, simply reply to this email.</p>
            
            <br>
            <p style="margin-bottom: 0;">Best regards,</p>
            <p style="margin-top: 5px; font-weight: bold;">${companyName}</p>
        </div>
    `;

    // 3. Signature
    if (emailSignature) {
        htmlContent += `
            <div style="background-color: #f8f9fa; padding: 20px; font-size: 0.85em; color: #777; border-top: 1px solid #e0e0e0;">
                ${emailSignature.replace(/\n/g, '<br>')}
            </div>
        `;
    }

    htmlContent += `</div>`;

    const mailOptions = {
        from: fromAddress,
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