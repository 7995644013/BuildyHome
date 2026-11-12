/**
 * Email Templates for BuildyHome
 * Professional HTML email templates for various user notifications
 */

export function welcomeEmailTemplate(name: string, loginLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content { 
          padding: 30px 20px; 
        }
        .content p {
          margin: 15px 0;
        }
        .button { 
          display: inline-block; 
          padding: 14px 28px; 
          background: #4F46E5; 
          color: white !important; 
          text-decoration: none; 
          border-radius: 6px;
          font-weight: bold;
          transition: background 0.3s;
        }
        .button:hover {
          background: #4338CA;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .footer {
          background: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏗️ Welcome to BuildyHome!</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Welcome to BuildyHome! Your account has been successfully created and you're all set to start managing your construction projects.</p>
          <p>BuildyHome provides you with powerful tools to:</p>
          <ul>
            <li>Manage construction projects efficiently</li>
            <li>Track tasks and progress in real-time</li>
            <li>Collaborate with your team seamlessly</li>
            <li>Monitor budgets and expenses</li>
          </ul>
          <div class="button-container">
            <a href="${loginLink}" class="button">Login to Your Dashboard</a>
          </div>
          <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
          <p>Best regards,<br><strong>The BuildyHome Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BuildyHome. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function newUserWelcomeTemplate(params: {
  name: string;
  email: string;
  password: string;
  role: string;
}): string {
  const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content { 
          padding: 30px 20px; 
        }
        .credentials { 
          background: #f8f9fa; 
          padding: 20px; 
          border-left: 4px solid #4F46E5; 
          margin: 25px 0;
          border-radius: 4px;
        }
        .credentials h3 {
          margin-top: 0;
          color: #4F46E5;
        }
        .credentials p {
          margin: 10px 0;
          font-family: 'Courier New', monospace;
        }
        .button { 
          display: inline-block; 
          padding: 14px 28px; 
          background: #4F46E5; 
          color: white !important; 
          text-decoration: none; 
          border-radius: 6px;
          font-weight: bold;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .warning { 
          background: #FEF2F2;
          border-left: 4px solid #DC2626;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning p {
          margin: 0;
          color: #991B1B;
          font-weight: bold;
        }
        .footer {
          background: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .role-badge {
          display: inline-block;
          padding: 4px 12px;
          background: #4F46E5;
          color: white;
          border-radius: 12px;
          font-size: 14px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏗️ Your BuildyHome Account</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${params.name}</strong>,</p>
          <p>An administrator has created a BuildyHome account for you with the role: <span class="role-badge">${params.role.replace(/_/g, ' ').toUpperCase()}</span></p>
          
          <div class="credentials">
            <h3>📧 Your Login Credentials</h3>
            <p><strong>Email:</strong> ${params.email}</p>
            <p><strong>Temporary Password:</strong> ${params.password}</p>
          </div>
          
          <div class="warning">
            <p>⚠️ IMPORTANT: You must change your password on first login for security purposes.</p>
          </div>
          
          <p>BuildyHome provides you with tools to manage construction projects efficiently. Log in now to get started!</p>
          
          <div class="button-container">
            <a href="${loginLink}" class="button">Login Now</a>
          </div>
          
          <p>If you have any questions or didn't expect this email, please contact your administrator immediately.</p>
          <p>Best regards,<br><strong>The BuildyHome Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BuildyHome. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function resetOtpTemplate(name: string, otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content { 
          padding: 30px 20px; 
        }
        .otp-box { 
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          padding: 30px; 
          text-align: center; 
          font-size: 42px; 
          font-weight: bold; 
          letter-spacing: 12px; 
          color: white;
          border-radius: 8px;
          margin: 30px 0;
          box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
        }
        .info-box {
          background: #FEF3C7;
          border-left: 4px solid #F59E0B;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 0;
          color: #92400E;
        }
        .warning { 
          background: #FEF2F2;
          border-left: 4px solid #DC2626;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .warning p {
          margin: 0;
          color: #991B1B;
          font-size: 14px;
        }
        .footer {
          background: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>You requested to reset your BuildyHome password. Use the verification code below to proceed with resetting your password:</p>
          
          <div class="otp-box">${otp}</div>
          
          <div class="info-box">
            <p><strong>⏰ This code expires in 15 minutes.</strong></p>
          </div>
          
          <p>Enter this code on the password reset page to create your new password.</p>
          
          <div class="warning">
            <p>⚠️ If you didn't request this password reset, please ignore this email or contact support immediately if you're concerned about your account security.</p>
          </div>
          
          <p>Best regards,<br><strong>The BuildyHome Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BuildyHome. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function verifyEmailOtpTemplate(name: string, otp: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container { 
          max-width: 600px; 
          margin: 20px auto; 
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
          background: linear-gradient(135deg, #059669 0%, #10B981 100%);
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
        }
        .content { 
          padding: 30px 20px; 
        }
        .otp-box { 
          background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
          padding: 30px; 
          text-align: center; 
          font-size: 42px; 
          font-weight: bold; 
          letter-spacing: 12px; 
          color: white;
          border-radius: 8px;
          margin: 30px 0;
          box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
        }
        .info-box {
          background: #FEF3C7;
          border-left: 4px solid #F59E0B;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .info-box p {
          margin: 0;
          color: #92400E;
        }
        .footer {
          background: #f9f9f9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✉️ Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${name}</strong>,</p>
          <p>Thank you for registering with BuildyHome! Please verify your email address using the verification code below:</p>
          
          <div class="otp-box">${otp}</div>
          
          <div class="info-box">
            <p><strong>⏰ This code expires in 15 minutes.</strong></p>
          </div>
          
          <p>Enter this code on the verification page to complete your registration and gain full access to your account.</p>
          
          <p>If you didn't create an account with BuildyHome, you can safely ignore this email.</p>
          
          <p>Best regards,<br><strong>The BuildyHome Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} BuildyHome. All rights reserved.</p>
          <p>This is an automated email, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
