import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : '';
const fmtDT = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  const date = dt.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
  const time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
  return `${date} ${time}`;
};
const day = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long' });

export const generateTimesheetPDF = async (timesheet) => {
  const { assignment, entries = [], status, weekEndingDate, updatedAt } = timesheet;
  const consultant = assignment?.consultant;
  const project = assignment?.project;
  const signer = project?.signer;
  const client = project?.client;

  const totalReg = entries.reduce((s, e) => s + e.regularHours, 0);
  const totalTravel = entries.reduce((s, e) => s + e.travelHours, 0);
  const totalHours = totalReg + totalTravel;

  const showConsultantSig = status === 'Submitted' || status === 'Approved' || status === 'Rejected';
  const showSignerSig = status === 'Approved';

  const consultantSigName = showConsultantSig ? `${consultant?.firstName || ''} ${consultant?.lastName || ''}`.trim() : '';
  const signerSigName = showSignerSig ? `${signer?.firstName || ''} ${signer?.lastName || ''}`.trim() : '';
  const sigDate = showConsultantSig ? fmtDT(updatedAt) : '';
  const signerDate = showSignerSig ? fmtDT(updatedAt) : '';

  // Color palette matching app theme
  const primary = '#6366f1';
  const headerBg = '#eef2ff';
  const border = '#c7d2fe';
  const labelBg = '#f0f4ff';
  const textDark = '#1e293b';
  const textMuted = '#64748b';

  const infoRows = [
    ['Consultant Name', `${consultant?.firstName || ''} ${consultant?.lastName || ''}`.trim()],
    ['Consultant Email', consultant?.email || '—'],
    ['Signer Manager', `${signer?.firstName || ''} ${signer?.lastName || ''}`.trim() || '—'],
    ['Project Name', project?.name || '—'],
    ['Signer Email', signer?.email || '—'],
    ['Client Company', client?.name || '—'],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:13px;color:${textDark};width:714px;background:white;padding:0;line-height:1.5;">
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid ${primary};padding-bottom:10px;margin-bottom:20px;">
        <h2 style="margin:0;font-size:16px;font-weight:700;color:${textDark};">
          Timesheet for Week Ending: ${fmt(weekEndingDate)}
        </h2>
        <span style="font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px;background:${status === 'Approved' ? '#dcfce7' : status === 'Submitted' ? '#dbeafe' : status === 'Rejected' ? '#fee2e2' : '#f1f5f9'};color:${status === 'Approved' ? '#16a34a' : status === 'Submitted' ? '#2563eb' : status === 'Rejected' ? '#dc2626' : '#64748b'};">
          ${status}
        </span>
      </div>

      <!-- Info Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;border:1px solid ${border};">
        <tbody>
          ${infoRows.map(([label, value]) => `
            <tr>
              <td style="width:190px;background:${labelBg};padding:9px 14px;border:1px solid ${border};font-weight:600;color:${textMuted};font-size:12px;">${label}:</td>
              <td style="padding:9px 14px;border:1px solid ${border};color:${textDark};">${value}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Entries Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:28px;border:1px solid ${border};">
        <thead>
          <tr style="background:${headerBg};">
            <th style="padding:10px 12px;text-align:left;border:1px solid ${border};font-weight:600;color:${textMuted};font-size:12px;">Date</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid ${border};font-weight:600;color:${textMuted};font-size:12px;">Day</th>
            <th style="padding:10px 12px;text-align:left;border:1px solid ${border};font-weight:600;color:${textMuted};font-size:12px;">Project Tasks</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid ${border};font-weight:600;color:${textMuted};font-size:12px;">Regular<br>Hours</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid ${border};font-weight:600;color:${textMuted};font-size:12px;">Travel<br>Hours</th>
            <th style="padding:10px 12px;text-align:center;border:1px solid ${border};font-weight:600;color:${textMuted};font-size:12px;">Total<br>Hours</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => `
            <tr>
              <td style="padding:9px 12px;border:1px solid ${border};white-space:nowrap;">${fmt(e.date)}</td>
              <td style="padding:9px 12px;border:1px solid ${border};white-space:nowrap;">${day(e.date)}</td>
              <td style="padding:9px 12px;border:1px solid ${border};">${e.taskPerformed}</td>
              <td style="padding:9px 12px;border:1px solid ${border};text-align:center;">${e.regularHours.toFixed(2)}</td>
              <td style="padding:9px 12px;border:1px solid ${border};text-align:center;">${e.travelHours.toFixed(2)}</td>
              <td style="padding:9px 12px;border:1px solid ${border};text-align:center;">${(e.regularHours + e.travelHours).toFixed(2)}</td>
            </tr>
          `).join('')}
          <tr style="background:${headerBg};">
            <td colspan="3" style="padding:9px 12px;border:1px solid ${border};text-align:right;font-weight:700;">Totals:</td>
            <td style="padding:9px 12px;border:1px solid ${border};text-align:center;font-weight:700;">${totalReg.toFixed(2)}</td>
            <td style="padding:9px 12px;border:1px solid ${border};text-align:center;font-weight:700;">${totalTravel.toFixed(2)}</td>
            <td style="padding:9px 12px;border:1px solid ${border};text-align:center;font-weight:700;">${totalHours.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Signatures -->
      <div style="margin-bottom:24px;">
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px;">
          <span style="font-weight:600;color:${textMuted};min-width:185px;font-size:13px;">Consultant Signature:</span>
          <span style="font-family:'Georgia',serif;font-style:italic;font-size:20px;color:${primary};text-decoration:underline;min-width:200px;letter-spacing:1px;">${consultantSigName}</span>
          <span style="font-weight:600;color:${textMuted};margin-left:8px;font-size:13px;">Date:</span>
          <span style="font-family:'Georgia',serif;font-style:italic;font-size:13px;color:${primary};text-decoration:underline;">${sigDate}</span>
        </div>
        <div style="display:flex;align-items:baseline;gap:12px;margin-bottom:16px;">
          <span style="font-weight:600;color:${textMuted};min-width:185px;font-size:13px;">Signer Manager Signature:</span>
          <span style="font-family:'Georgia',serif;font-style:italic;font-size:20px;color:${primary};text-decoration:underline;min-width:200px;letter-spacing:1px;">${signerSigName}</span>
          <span style="font-weight:600;color:${textMuted};margin-left:8px;font-size:13px;">Date:</span>
          <span style="font-family:'Georgia',serif;font-style:italic;font-size:13px;color:${primary};text-decoration:underline;">${signerDate}</span>
        </div>
      </div>

      <!-- Disclaimer -->
      <p style="font-size:11px;color:${textMuted};line-height:1.6;border-top:1px solid ${border};padding-top:12px;margin:0;">
        Signators of this document certify by their signature that the work named herein was completed and was acceptable. 
        Payment is subject to the terms and conditions of the Master Services Agreement (or Client Contract) duly executed by Client and TMS LLC.
      </p>
    </div>
  `;

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:white;padding:40px;box-sizing:border-box;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();

    if (pdfHeight <= pageHeight) {
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    } else {
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        pdf.addPage();
        position -= pageHeight;
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
    }

    const weekStr = fmt(weekEndingDate).replace(/\//g, '-');
    pdf.save(`Timesheet_${weekStr}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
};
