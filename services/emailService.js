const nodemailer = require('nodemailer');

// Configure transporter
const smtpPort = parseInt(process.env.SMTP_PORT);
// Use secure: true only for port 465. For 587, use 'secure: false' which enables STARTTLS.
const isSecure = smtpPort === 465;

console.log(`Initializing Email Service: Host=${process.env.SMTP_HOST} Port=${smtpPort} Secure=${isSecure} User=${process.env.SMTP_USER}`);

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: smtpPort,
    secure: isSecure,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    // This helps bypass issues with specific mail server certificates
    tls: {
        rejectUnauthorized: false
    }
});

/**
 * Helper to construct a clean 'From' address.
 * aggressive sanitization to prevent 501 syntax errors.
 */
const getCleanFromAddress = (brandingCompanyName) => {
    // 1. Determine the Name
    // Fallback to 'Nexaloom CRM' if no company name is provided
    let safeName = (brandingCompanyName || 'Nexaloom CRM').replace(/["<>]/g, '').trim();

    // 2. Determine the Email
    // We strictly look for a string containing '@'
    let rawEmail = '';

    // Priority 1: Check SMTP_FROM for an email
    if (process.env.SMTP_FROM && process.env.SMTP_FROM.includes('@')) {
        const potentialFrom = process.env.SMTP_FROM;
        const match = potentialFrom.match(/<([^>]+)>/) || potentialFrom.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        if (match) {
            rawEmail = match[1] || match[0];
        }
    }

    // Priority 2: Check SMTP_USER if Priority 1 yielded nothing
    if ((!rawEmail || !rawEmail.includes('@')) && process.env.SMTP_USER && process.env.SMTP_USER.includes('@')) {
        rawEmail = process.env.SMTP_USER;
    }

    // Fallback: If we still don't have a valid email, synthesize one or use a dummy.
    // This prevents <CortexCart Team> (no @) from crashing the server.
    if (!rawEmail || !rawEmail.includes('@')) {
        console.warn('Warning: Could not determine valid sender email (with @) from env. Using fallback.');
        const cleanDomain = safeName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'example';
        rawEmail = `no-reply@${cleanDomain}.com`;
    }

    // 3. Construct strictly formatted string
    return `"${safeName}" <${rawEmail.trim()}>`;
};

const sendProposalEmail = async (to, leadName, proposalName, attachments, branding = {}, proposalDetails = {}) => {
    const { companyName = 'Nexaloom CRM', companyAddress, logoUrl, emailSignature } = branding;
    const { items = [], totalValue = 0, terms = '' } = proposalDetails;

    // Use helper to get safe address
    const fromAddress = getCleanFromAddress(companyName);

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
        text: textContent,
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

const sendBasicEmail = async (to, leadName, subject, bodyContent, branding = {}) => {
    const { companyName = 'Nexaloom CRM', companyAddress, logoUrl, emailSignature } = branding;

    // Use helper to get safe address
    const fromAddress = getCleanFromAddress(companyName);

    let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
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
                            <h2 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 22px;">${subject}</h2>
                            <p style="margin: 0 0 15px 0; font-size: 16px; line-height: 24px; color: #555555;">Hello ${leadName},</p>
                            
                            <div style="font-size: 16px; line-height: 24px; color: #555555; white-space: pre-wrap; margin-bottom: 25px;">${bodyContent}</div>

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
                <div style="height: 40px;"></div>
            </td>
        </tr>
    </table>
    </table>
</body>
</html>
    `;

    // Strip HTML for plain text version
    const textContent = `
${subject}

Hello ${leadName},

${bodyContent}

Best regards,
${companyName}
${emailSignature || ''}
    `.trim();

    // Verify 'to' is a string
    if (typeof to !== 'string') {
        console.warn('Warning: "to" address is not a string:', to);
    }

    const mailOptions = {
        from: fromAddress,
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Outreach Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Nodemailer Error:', error);
        throw error;
    }
};

module.exports = { sendProposalEmail, sendBasicEmail };