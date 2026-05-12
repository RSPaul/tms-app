export function generateEmailHtml({ title, preheader, content, buttonText, buttonUrl, appUrl }) {
  const logoUrl = `${appUrl}/logo.png`;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0f0f14;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0f0f14;
      padding: 40px 20px;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #1a1a24;
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.05);
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    .header {
      padding: 30px 40px;
      text-align: center;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .logo {
      width: 60px;
      height: 60px;
      margin-bottom: 16px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      color: #ffffff;
      font-weight: 700;
    }
    .body-content {
      padding: 40px;
      font-size: 16px;
      line-height: 1.6;
      color: #cbd5e1;
    }
    .body-content h2 {
      color: #ffffff;
      font-size: 20px;
      margin-top: 0;
      margin-bottom: 20px;
    }
    .body-content p {
      margin-bottom: 20px;
    }
    .body-content ul {
      margin-bottom: 24px;
      padding: 20px;
      background-color: #13131a;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.05);
      list-style-type: none;
    }
    .body-content li {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      color: #94a3b8;
    }
    .body-content li:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    .body-content strong {
      color: #ffffff;
      display: inline-block;
      min-width: 140px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #6366f1;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
    }
    .footer {
      padding: 24px 40px;
      text-align: center;
      background-color: #13131a;
      border-top: 1px solid rgba(255,255,255,0.05);
      font-size: 13px;
      color: #64748b;
    }
    .footer p {
      margin: 0;
    }
    .preheader {
      display: none;
      max-height: 0px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  ${preheader ? `<div class="preheader">${preheader}</div>` : ''}
  <div class="wrapper">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <div class="container">
            <div class="header">
              <img src="${logoUrl}" alt="TMS Logo" class="logo" />
              <h1>TMS Payroll Management</h1>
            </div>
            <div class="body-content">
              ${content}
              ${buttonUrl && buttonText ? `
                <div class="btn-container">
                  <a href="${buttonUrl}" class="btn">${buttonText}</a>
                </div>
              ` : ''}
            </div>
            <div class="footer">
              <p>This is an automated message from the TMS platform. Please do not reply.</p>
              <p style="margin-top: 8px;">&copy; ${new Date().getFullYear()} TMS. All rights reserved.</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `;
}
