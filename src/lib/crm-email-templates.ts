export function generateCrmTeamEmailHtml({
  memberName,
  orgName,
  email,
  password,
  portalUrl,
}: {
  memberName: string;
  orgName: string;
  email: string;
  password: string;
  portalUrl: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sales Team CRM Portal Login Credentials</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
          
          <!-- Header with Assay Biz Brand Logo & Colors -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #172554 100%); padding: 32px 24px 28px; text-align: center; border-bottom: 4px solid #e77817;">
              <div style="background-color: #ffffff; display: inline-block; padding: 8px 22px; border-radius: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18); margin-bottom: 12px; border: 1px solid rgba(231, 120, 23, 0.25);">
                <img src="https://aassaybiz.com/email-logo.png" alt="Aassay Biz" width="160" height="38" border="0" style="height: 38px; width: auto; max-width: 180px; display: block; object-fit: contain; margin: 0 auto; border: 0;" />
              </div>
              <div style="margin-top: 4px; font-size: 13px; color: #bfdbfe; letter-spacing: 0.5px; font-weight: 500;">
                Everything you need. One smart platform
              </div>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 28px; color: #334155; line-height: 1.6;">
              
              <div style="display: inline-block; background-color: #ffedd5; color: #c2410c; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; margin-bottom: 16px;">
                ✓ Sales Team CRM Portal Access Granted
              </div>

              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a;">
                Hello, ${memberName}!
              </h2>

              <p style="margin: 0 0 16px 0; font-size: 15px;">
                Your official <strong>Sales Team CRM Portal</strong> account has been created by <strong>${orgName}</strong>.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
                You can use this dedicated portal to manage your assigned leads, track sales pipeline stages, log client calls, schedule follow-up activities, and close deals faster.
              </p>

              <!-- Credentials Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 15px; font-weight: 700; color: #0f172a; margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                      🔑 Your Login Credentials:
                    </div>

                    <div style="margin-bottom: 12px;">
                      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Portal Link</div>
                      <div style="font-size: 15px; font-weight: 600; margin-top: 2px;">
                        <a href="${portalUrl}" style="color: #ea580c; text-decoration: underline;" target="_blank">${portalUrl}</a>
                      </div>
                    </div>

                    <div style="margin-bottom: 14px;">
                      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Registered Email</div>
                      <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 2px;">
                        ${email}
                      </div>
                    </div>

                    <div>
                      <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px;">Temporary Password</div>
                      
                      <!-- Tap to Reveal Password Accordion -->
                      <details style="border: 2px dashed #f97316; border-radius: 8px; background-color: #fff7ed; padding: 12px 16px; cursor: pointer;">
                        <summary style="font-size: 14px; font-weight: 700; color: #ea580c; cursor: pointer; outline: none;">
                          👁️ Tap / Click here to reveal password
                        </summary>
                        <div style="margin-top: 10px; padding: 10px 14px; background-color: #ffffff; border-radius: 6px; border: 1px solid #fdba74; text-align: center;">
                          <div style="font-size: 22px; font-weight: 800; font-family: 'Courier New', Courier, monospace; letter-spacing: 3px; color: #0f172a;">
                            ${password}
                          </div>
                          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">
                            (Copy this password to sign in)
                          </div>
                        </div>
                      </details>

                      <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
                        🔒 <em>Note: For security reasons, please change your password in account settings after logging in for the first time.</em>
                      </div>
                    </div>

                  </td>
                </tr>
              </table>

              <!-- Big Login Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 26px 0;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 8px; font-size: 16px; font-weight: 700; box-shadow: 0 4px 12px rgba(234, 88, 12, 0.35);">
                      🚀 Log In to Sales Team Portal
                    </a>
                  </td>
                </tr>
              </table>

              <!-- How to Use / Instructions Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; margin: 16px 0;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-bottom: 10px;">
                      📱 Quick Start Guide:
                    </div>
                    <ol style="margin: 0; padding-left: 20px; font-size: 13px; color: #334155; line-height: 1.7;">
                      <li>Click the <strong>Log In to Sales Team Portal</strong> button above.</li>
                      <li>Enter your registered <strong>Email</strong> and the <strong>Temporary Password</strong> revealed above.</li>
                      <li>Click <strong>Sign In</strong> to open your sales workspace.</li>
                      <li>View and manage your assigned leads, deals, and pipeline stages.</li>
                      <li>Log client interactions, call reminders, and update lead status in real time.</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748b; margin-top: 24px; margin-bottom: 0;">
                If you encounter any issues logging in, please contact your organization administrator or sales manager.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">
                ${orgName} &bull; Powered by Aassay Biz &bull; Everything you need. One smart platform
              </p>
              <p style="margin: 0;">
                This is an automated system notification. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
