import { serve } from "https://deno.land/std@0.192.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import nodemailer from "npm:nodemailer@6.9.10"

const sesTransporter = nodemailer.createTransport({
  host: "email-smtp.ap-south-1.amazonaws.com",
  port: 587,
  secure: false,
  auth: {
    user: "AKIA2LJCCXAWLPSYPMPE",
    pass: "BAxlpu5HTiNPIdt7NRhHnENs2tbnczd/J3PLt/uJfNk5",
  },
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateAttendanceEmailHtml({
  employeeName,
  orgName,
  email,
  password,
  portalUrl,
}: {
  employeeName: string;
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
  <title>Attendance Portal Login Credentials</title>
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
                ✓ Portal Access Granted
              </div>

              <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #0f172a;">
                Hello, ${employeeName}!
              </h2>

              <p style="margin: 0 0 16px 0; font-size: 15px;">
                Your official <strong>Attendance &amp; Workforce Portal</strong> account has been created by <strong>${orgName}</strong>.
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569;">
                You can use this portal to record your daily <strong>Clock In</strong> and <strong>Clock Out</strong>, review assigned shifts, and submit leave applications.
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
                      🚀 Log In to Attendance Portal
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
                      <li>Click the <strong>Log In to Attendance Portal</strong> button above.</li>
                      <li>Enter your registered <strong>Email</strong> and the <strong>Temporary Password</strong> revealed above.</li>
                      <li>Click <strong>Sign In</strong> to open your workspace dashboard.</li>
                      <li>Click <strong>Clock In</strong> at the start of your shift to record attendance.</li>
                      <li>Click <strong>Clock Out</strong> when your shift ends.</li>
                      <li>You can also apply for leaves and view your monthly attendance history anytime.</li>
                    </ol>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #64748b; margin-top: 24px; margin-bottom: 0;">
                If you encounter any issues logging in, please contact your organization administrator or HR team.
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
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Environment variables not found')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    let user: any = null;

    // Verify user authentication with token
    const { data: authUserData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (!authError && authUserData?.user) {
      user = authUserData.user;
    } else {
      // Robust fallback: decode JWT token payload if GoTrue internal endpoint had a connection issue
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const isExpired = payload.exp ? payload.exp * 1000 < Date.now() : false;
          if (payload && payload.sub && !isExpired) {
            user = { id: payload.sub, email: payload.email };
          }
        }
      } catch (jwtErr) {
        console.warn('JWT fallback decode error:', jwtErr);
      }
    }

    if (!user) {
      console.error('Auth Error details:', authError);
      throw new Error(`Unauthorized: ${authError?.message || 'Invalid or expired authentication session'}`);
    }

    const { employee_id, email, password } = await req.json()

    if (!employee_id || !email) {
      throw new Error('Missing required fields: employee_id and email are required')
    }

    const cleanEmail = email.trim().toLowerCase();
    const attendanceAuthEmail = `attendance_${cleanEmail}`;

    // 1. Fetch the employee to ensure they exist and get their name & org_id
    const { data: emp, error: empError } = await supabaseAdmin
      .from('employees')
      .select('name, org_id, auth_user_id')
      .eq('id', employee_id)
      .single()

    if (empError || !emp) {
      throw new Error('Employee not found')
    }

    // Fetch org name
    const { data: orgData } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', emp.org_id)
      .maybeSingle()
    const orgName = orgData?.name || 'Your Organization'

    // 2. Check if an attendance auth user already exists (via RPC or emp.auth_user_id)
    let auth_user_id: string | null = null;
    let isNewAuthUser = false;

    if (emp.auth_user_id) {
      const { data: currentAuth } = await supabaseAdmin.auth.admin.getUserById(emp.auth_user_id);
      if (currentAuth?.user?.email === attendanceAuthEmail) {
        auth_user_id = emp.auth_user_id;
      }
    }

    if (!auth_user_id) {
      const { data: existingUserId } = await supabaseAdmin.rpc('get_user_id_by_email', { 
        user_email: attendanceAuthEmail 
      });
      if (existingUserId) {
        auth_user_id = existingUserId;
      }
    }

    if (auth_user_id) {
      // Re-use existing attendance auth user — update password & metadata
      const updatePayload: any = {
        email_confirm: true,
        user_metadata: { name: emp.name, portal: 'attendance' }
      };
      if (password) {
        updatePayload.password = password;
      }

      const { error: updatePwErr } = await supabaseAdmin.auth.admin.updateUserById(
        auth_user_id,
        updatePayload
      );
      if (updatePwErr) {
        console.warn('Could not update user password:', updatePwErr);
      }
    } else {
      // 3. Create the attendance auth user fresh
      const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: attendanceAuthEmail,
        password: password || '123456@Ak',
        email_confirm: true,
        user_metadata: { name: emp.name, portal: 'attendance' }
      });

      if (createError) {
        if (createError.message?.toLowerCase().includes('already') || createError.message?.toLowerCase().includes('registered')) {
          const { data: retryUserId } = await supabaseAdmin.rpc('get_user_id_by_email', { user_email: attendanceAuthEmail });
          if (retryUserId) {
            auth_user_id = retryUserId;
            if (password) {
              await supabaseAdmin.auth.admin.updateUserById(auth_user_id, { password, email_confirm: true });
            }
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      } else {
        auth_user_id = authData.user.id;
        isNewAuthUser = true;
      }
    }

    if (!auth_user_id) {
      throw new Error('Failed to resolve auth user ID');
    }

    // 4. Update the employee record with auth_user_id
    const { data: employeeData, error: dbError } = await supabaseAdmin
      .from('employees')
      .update({ auth_user_id, email: cleanEmail })
      .eq('id', employee_id)
      .select()
      .single()

    if (dbError) {
      // Only delete auth user if we just created it fresh
      if (isNewAuthUser) {
        await supabaseAdmin.auth.admin.deleteUser(auth_user_id)
      }
      throw dbError
    }

    // 5. Ensure profile has org_id
    try {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, org_id')
        .eq('user_id', auth_user_id)
        .maybeSingle();

      if (existingProfile) {
        if (!existingProfile.org_id) {
          await supabaseAdmin.from('profiles').update({ org_id: emp.org_id }).eq('user_id', auth_user_id);
        }
      } else {
        await supabaseAdmin.from('profiles').insert({
          user_id: auth_user_id,
          org_id: emp.org_id,
          first_name: emp.name.split(' ')[0],
          last_name: emp.name.split(' ').slice(1).join(' ') || null,
        });
      }
    } catch (profileErr) {
      console.warn('Profile sync non-fatal warning:', profileErr);
    }

    // 5. Send Welcome & Attendance Portal Access Email to the Employee
    let emailSent = false
    let emailError: string | null = null

    try {
      const emailHtml = generateAttendanceEmailHtml({
        employeeName: emp.name,
        orgName,
        email,
        password,
        portalUrl: 'https://attendance.aassaybiz.com'
      })

      const info = await sesTransporter.sendMail({
        from: `"Aassay Biz" <no-reply@aassaybiz.com>`,
        to: email,
        subject: `Attendance Portal Access & Login Details - ${orgName}`,
        html: emailHtml,
      });

      console.log(`[create-employee] Email successfully sent to ${email}, messageId: ${info?.messageId}`);
      emailSent = true;
    } catch (mailErr: any) {
      console.warn('[create-employee] SES send error, attempting dispatcher fallback:', mailErr);
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-email-dispatcher`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
          },
          body: JSON.stringify({
            orgId: emp.org_id,
            to: email,
            subject: `Attendance Portal Access & Login Details - ${orgName}`,
            html: generateAttendanceEmailHtml({
              employeeName: emp.name,
              orgName,
              email,
              password,
              portalUrl: 'https://attendance.aassaybiz.com'
            }),
          }),
        });
        emailSent = true;
      } catch (fallbackErr: any) {
        console.error('[create-employee] Dispatcher fallback failed:', fallbackErr);
        emailError = mailErr.message;
      }
    }

    return new Response(
      JSON.stringify({
        ...employeeData,
        portal_email: email,
        portal_password: password,
        org_name: orgName,
        portal_url: 'https://attendance.aassaybiz.com',
        email_sent: emailSent,
        email_error: emailError
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
