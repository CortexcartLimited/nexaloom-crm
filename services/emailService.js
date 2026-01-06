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
    const { companyName = 'Nexaloom CRM', companyAddress, logoUrl, emailSignature } = branding;
    const { items = [], totalValue = 0, terms = '' } = proposalDetails;

    const fromName = companyName.replace(/[^a-zA-Z0-9 ]/g, ''); // Simple sanitize
    const fromAddress = `${fromName} <${process.env.SMTP_FROM.split('<')[1] || process.env.SMTP_FROM}>`;

    // --- Helper for formatting currency ---
    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // --- Build Item Rows ---
    const rowsHtml = items.map((item, index) => `
        <tr style="${index % 2 === 0 ? 'background-color: #ffffff;' : 'background-color: #fafafa;'}">
            <td style="padding: 12px 15px; border-bottom: 1px solid #eeeeee; color: #333333; font-size: 14px;">
                <div style="font-weight: 600; margin-bottom: 4px;">${item.name}</div>
                ${item.description ? `<div style="font-size: 13px; color: #777777;">${item.description}</div>` : ''}
            </td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eeeeee; text-align: center; color: #333333; font-size: 14px;">${item.quantity}</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eeeeee; text-align: right; color: #333333; font-size: 14px;">${formatMoney(item.price)}</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #eeeeee; text-align: right; font-weight: 600; color: #333333; font-size: 14px;">${formatMoney(item.price * item.quantity)}</td>
        </tr>
    `).join('');

    // --- Build Full HTML ---
    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposal from ${companyName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
            <td style="padding: 20px 0 30px 0;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" width="600" style="border-collapse: collapse; border: 1px solid #e1e4e8; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 30px; background-color: #ffffff; border-bottom: 1px solid #eeeeee;">
                            ${logoUrl
            ? `<img src="${logoUrl}" alt="${companyName}" style="display: block; max-height: 60px; max-width: 200px; height: auto;" />`
            : `<h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #333333;">${companyName}</h1>`
        }
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 22px;">Proposal: ${proposalName}</h2>
                            <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #555555;">Hello ${leadName},</p>
                            <p style="margin: 0 0 25px 0; font-size: 16px; line-height: 24px; color: #555555;">
                                We are pleased to submit the attached proposal for your review. Below is a detailed summary of the services and costs outlined.
                            </p>

                            <!-- Items Table -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #eeeeee; border-radius: 6px; overflow: hidden; margin-bottom: 30px;">
                                <thead>
                                    <tr style="background-color: #f8f9fa;">
                                        <th style="padding: 12px 15px; border-bottom: 2px solid #eeeeee; text-align: left; font-size: 13px; font-weight: 700; color: #555555; text-transform: uppercase;">Description</th>
                                        <th style="padding: 12px 15px; border-bottom: 2px solid #eeeeee; text-align: center; font-size: 13px; font-weight: 700; color: #555555; text-transform: uppercase;">Qty</th>
                                        <th style="padding: 12px 15px; border-bottom: 2px solid #eeeeee; text-align: right; font-size: 13px; font-weight: 700; color: #555555; text-transform: uppercase;">Price</th>
                                        <th style="padding: 12px 15px; border-bottom: 2px solid #eeeeee; text-align: right; font-size: 13px; font-weight: 700; color: #555555; text-transform: uppercase;">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colspan="3" style="padding: 15px; text-align: right; font-weight: 700; color: #333333; font-size: 16px; background-color: #fcfcfc; border-top: 1px solid #eeeeee;">Total Value:</td>
                                        <td style="padding: 15px; text-align: right; font-weight: 700; color: #2c3e50; font-size: 18px; background-color: #fcfcfc; border-top: 1px solid #eeeeee;">${formatMoney(totalValue)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <!-- Terms -->
                            ${terms ? `
                            <div style="background-color: #f9fbfd; padding: 20px; border-radius: 6px; border: 1px solid #e1e4e8; margin-bottom: 25px;">
                                <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #555555; text-transform: uppercase;">Terms & Conditions</h3>
                                <p style="margin: 0; color: #666666; font-size: 13px; line-height: 20px; white-space: pre-wrap;">${terms}</p>
                            </div>
                            ` : ''}

                            <!-- CTA / Next Steps -->
                            <div style="background-color: #e8f4fd; padding: 15px; border-left: 4px solid #3498db; margin-bottom: 30px;">
                                <p style="margin: 0; color: #34495e; font-size: 14px;"><strong>Next Steps:</strong> Please review the attached document. To proceed, simply reply to this email.</p>
                            </div>

                            <p style="margin: 0 0 5px 0; font-size: 16px; color: #555555;">Best regards,</p>
                            <p style="margin: 0; font-size: 16px; font-weight: bold; color: #333333;">${companyName}</p>
                            
                            <!-- Signature (Dynamic) -->
                            ${emailSignature ? `
                                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eeeeee; color: #777777; font-size: 14px; line-height: 22px;">
                                    ${emailSignature.replace(/\n/g, '<br>')}
                                </div>
                            ` : ''}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 30px; background-color: #f8f9fa; border-top: 1px solid #eeeeee; text-align: center;">
                            <p style="margin: 0; font-size: 12px; line-height: 18px; color: #999999;">
                                <strong>${companyName}</strong><br>
                                ${companyAddress ? companyAddress.replace(/\n/g, ', ') : ''}
                            </p>
                        </td>
                    </tr>
                </table>
                
                <!-- Spacer for bottom padding -->
                <div style="height: 40px;"></div>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

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