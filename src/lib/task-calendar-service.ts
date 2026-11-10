import { supabase } from "@/integrations/supabase/client";

export interface TaskCalendarData {
  id: string;
  title: string;
  description?: string | null;
  priority?: string;
  dueDate?: string | null;
  dueTime?: string | null;
  orgId: string;
  orgName: string;
  assignedByName?: string | null;
}

export interface EmployeeRecipient {
  id: string;
  name: string;
  email: string;
}

/**
 * Format a Date to UTC iCalendar format: YYYYMMDDTHHMMSSZ
 */
function formatUtcIcs(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * Format an all-day date: YYYYMMDD
 */
function formatAllDayIcs(dateStr: string): string {
  return dateStr.replace(/-/g, "");
}

/**
 * Escape text for iCalendar RFC 5545
 */
function escapeIcsText(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Generates an RFC 5545 compliant .ics calendar invite string
 */
export function generateTaskIcsContent({
  task,
  employee,
}: {
  task: TaskCalendarData;
  employee: EmployeeRecipient;
}): string {
  const { dueDate, dueTime, title, description, orgName, id } = task;

  let dtStart = "";
  let dtEnd = "";

  if (dueDate) {
    if (dueTime) {
      // Parse in Indian Standard Time (UTC+05:30)
      const startDt = new Date(`${dueDate}T${dueTime}:00+05:30`);
      // Default duration: 1 hour
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
      dtStart = `DTSTART:${formatUtcIcs(startDt)}`;
      dtEnd = `DTEND:${formatUtcIcs(endDt)}`;
    } else {
      // All-day task event
      const cleanStart = formatAllDayIcs(dueDate);
      const nextDay = new Date(dueDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const cleanEnd = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
      dtStart = `DTSTART;VALUE=DATE:${cleanStart}`;
      dtEnd = `DTEND;VALUE=DATE:${cleanEnd}`;
    }
  } else {
    // Fallback if no date specified: create 1-day reminder from today
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    dtStart = `DTSTART;VALUE=DATE:${today}`;
    dtEnd = `DTEND;VALUE=DATE:${today}`;
  }

  const priorityVal =
    task.priority === "Urgent" ? "1" : task.priority === "High" ? "3" : "5";

  const lines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//AassayBiz//Task Calendar 1.0//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${id}@aassaybiz.com`,
    `DTSTAMP:${formatUtcIcs(new Date())}`,
    `ORGANIZER;CN="${escapeIcsText(orgName)}":mailto:no-reply@aassaybiz.com`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN="${escapeIcsText(employee.name)}":mailto:${employee.email}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description || `Task assigned by ${orgName}`)}`,
    dtStart,
    dtEnd,
    `PRIORITY:${priorityVal}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "SEQUENCE:0",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Reminder: ${escapeIcsText(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.join("\r\n");
}

/**
 * Generate direct 1-click Google Calendar URL
 */
export function generateGoogleCalendarUrl({
  title,
  description,
  dueDate,
  dueTime,
  orgName,
}: {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  dueTime?: string | null;
  orgName: string;
}): string {
  let datesParam = "";

  if (dueDate) {
    if (dueTime) {
      const startDt = new Date(`${dueDate}T${dueTime}:00+05:30`);
      const endDt = new Date(startDt.getTime() + 60 * 60 * 1000);
      datesParam = `${formatUtcIcs(startDt)}/${formatUtcIcs(endDt)}`;
    } else {
      const cleanStart = dueDate.replace(/-/g, "");
      const nextDay = new Date(dueDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const cleanEnd = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
      datesParam = `${cleanStart}/${cleanEnd}`;
    }
  } else {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    datesParam = `${today}/${today}`;
  }

  const detailsText = `${description || ""}\n\nAssigned by: ${orgName}\nView in Employee Portal: https://attendance.aassaybiz.com/tasks`;

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    details: detailsText,
    dates: datesParam,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build branded HTML email for task assignment
 */
export function buildTaskAssignmentEmailHtml({
  task,
  employee,
  gCalUrl,
}: {
  task: TaskCalendarData;
  employee: EmployeeRecipient;
  gCalUrl: string;
}): string {
  const priorityColor =
    task.priority === "Urgent"
      ? "#e11d48"
      : task.priority === "High"
      ? "#d97706"
      : "#2563eb";

  const formattedDate = task.dueDate
    ? new Date(task.dueDate + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "No due date";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Task Assigned - ${task.title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0a192f; padding: 24px 32px; border-bottom: 3px solid #f97316;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">${task.orgName}</span>
                    <span style="display: block; font-size: 11px; color: #94a3b8; margin-top: 2px;">Business HR Task Assignment</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; background-color: rgba(249,115,22,0.15); border: 1px solid #f97316; color: #f97316; font-size: 11px; font-weight: 700;">
                      NEW TASK
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Hello ${employee.name},
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.5; color: #475569;">
                A new task has been assigned to you by <strong>${task.assignedByName || task.orgName}</strong>. A Google Calendar invite has been attached to automatically schedule this task.
              </p>

              <!-- Task Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
                      ${task.title}
                    </div>

                    ${
                      task.description
                        ? `<p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569; white-space: pre-line;">${task.description}</p>`
                        : ""
                    }

                    <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 12px;">
                      <tr>
                        <td style="padding: 4px 0; color: #64748b;">Due Date:</td>
                        <td align="right" style="padding: 4px 0; font-weight: 700; color: #0f172a;">
                          📅 ${formattedDate} ${task.dueTime ? `at ${task.dueTime} IST` : ""}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; color: #64748b;">Priority:</td>
                        <td align="right" style="padding: 4px 0;">
                          <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; color: ${priorityColor}; background-color: #ffffff; border: 1px solid #e2e8f0;">
                            ${task.priority || "Medium"}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <!-- 1-Click Google Calendar Button -->
                    <a href="${gCalUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; margin: 4px; box-shadow: 0 2px 8px rgba(37,99,235,0.25);">
                      📅 Add to Google Calendar
                    </a>
                    <!-- View Portal Button -->
                    <a href="https://attendance.aassaybiz.com/tasks" target="_blank" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-size: 13px; font-weight: 700; margin: 4px; box-shadow: 0 2px 8px rgba(249,115,22,0.25);">
                      🚀 View in Portal
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Calendar Notice Box -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 14px 16px; font-size: 12px; color: #1e40af; line-height: 1.5;">
                📌 <strong>Calendar Invite Attached:</strong> An official iCalendar file (<strong>invite.ics</strong>) is attached with this email. Your email client (Gmail, Outlook, Apple Mail) will automatically display a Calendar bar where you can click <strong>Yes</strong> to add this directly to your device calendar.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f1f5f9; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b;">
                Sent via <strong>AassayBiz</strong> - India's Smartest Business Operating & GST Billing Platform.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                You received this email because you are a registered employee of ${task.orgName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Sends task assignment notification email with invite.ics attachment to all assigned employees
 */
export async function sendTaskCalendarInvites({
  task,
  employees,
}: {
  task: TaskCalendarData;
  employees: EmployeeRecipient[];
}): Promise<{ totalSent: number; errors: string[] }> {
  let totalSent = 0;
  const errors: string[] = [];

  // Filter employees with valid email
  const validEmployees = employees.filter((e) => e.email && e.email.includes("@"));

  for (const emp of validEmployees) {
    try {
      // 1. Generate RFC 5545 iCalendar (.ics) content
      const icsString = generateTaskIcsContent({ task, employee: emp });
      const base64Ics = btoa(unescape(encodeURIComponent(icsString)));

      // 2. Generate 1-click Google Calendar URL
      const gCalUrl = generateGoogleCalendarUrl({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        orgName: task.orgName,
      });

      // 3. Build HTML body
      const htmlBody = buildTaskAssignmentEmailHtml({
        task,
        employee: emp,
        gCalUrl,
      });

      const emailSubject = `New Task Assigned: ${task.title} - ${task.orgName}`;

      // 4. Dispatch via Supabase Edge Function (AWS SES)
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
        "send-custom-email",
        {
          body: {
            orgId: task.orgId || "platform",
            to: emp.email.trim(),
            subject: emailSubject,
            html: htmlBody,
            attachments: [
              {
                filename: "invite.ics",
                content: base64Ics,
                content_type: "text/calendar; method=REQUEST; charset=UTF-8",
              },
            ],
          },
        }
      );

      if (!edgeError && edgeData?.success) {
        totalSent++;
        console.log(`[Calendar Invite] Sent invite.ics to ${emp.email} successfully.`);
      } else {
        // Fallback to local / VPS API proxy if edge function fails
        try {
          let apiUrl = "https://aassaybiz.com/api/email/send";
          if (typeof window !== "undefined" && window.location.origin) {
            if (
              window.location.hostname === "localhost" ||
              window.location.hostname === "127.0.0.1"
            ) {
              apiUrl = "http://localhost:3010/api/email/send";
            } else {
              apiUrl = `${window.location.origin}/api/email/send`;
            }
          }

          const fallbackRes = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orgId: task.orgId,
              to: emp.email.trim(),
              subject: emailSubject,
              html: htmlBody,
              attachments: [
                {
                  filename: "invite.ics",
                  content: base64Ics,
                  content_type: "text/calendar; method=REQUEST; charset=UTF-8",
                },
              ],
            }),
          });

          if (fallbackRes.ok) {
            totalSent++;
          } else {
            const errTxt = await fallbackRes.text();
            errors.push(`${emp.email}: ${errTxt}`);
          }
        } catch (fErr: any) {
          errors.push(`${emp.email}: ${fErr.message}`);
        }
      }
    } catch (err: any) {
      console.error(`[Calendar Invite] Failed to send to ${emp.email}:`, err);
      errors.push(`${emp.email}: ${err.message}`);
    }
  }

  return { totalSent, errors };
}
