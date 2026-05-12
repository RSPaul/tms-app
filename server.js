import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { sendEmail } from './utils/email.js';
import { generateEmailHtml } from './utils/emailTemplate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-dev';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// --- Middlewares ---

// Middleware to check if user is authenticated
const authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.id; // Legacy support
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to check if user has Admin role
const requireAdmin = (req, res, next) => {
  authenticate(req, res, () => {
    const rolesArray = req.user.roles ? req.user.roles.split(',') : [];
    if (!rolesArray.includes('Admin')) return res.status(403).json({ error: 'Forbidden' });
    next();
  });
};

const requireConsultant = (req, res, next) => {
  authenticate(req, res, () => {
    const rolesArray = req.user.roles ? req.user.roles.split(',') : [];
    if (!rolesArray.includes('Consultant') && !rolesArray.includes('Admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
};

const requireSigner = (req, res, next) => {
  authenticate(req, res, () => {
    const rolesArray = req.user.roles ? req.user.roles.split(',') : [];
    if (!rolesArray.includes('Signer') && !rolesArray.includes('Admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
};

const requirePayroll = (req, res, next) => {
  authenticate(req, res, () => {
    const rolesArray = req.user.roles ? req.user.roles.split(',') : [];
    if (!rolesArray.includes('Payroll') && !rolesArray.includes('Admin')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });
};

// Seed an admin user on startup
async function seedAdmin() {
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        roles: 'Admin',
        status: 'Active'
      }
    });
    console.log('Seeded initial admin user: admin@test.com / admin123');
  }
}
seedAdmin();

// --- Authentication Routes ---

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    
    // For development, if user doesn't exist but has a valid role keyword, let's mock it
    // But ideally, we only allow real users
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, roles: user.roles, firstName: user.firstName, lastName: user.lastName },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Set HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    res.json({ message: 'Logged in successfully', user: { roles: user.roles, firstName: user.firstName, lastName: user.lastName } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: { roles: decoded.roles, firstName: decoded.firstName, lastName: decoded.lastName } });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // For security, don't reveal if user exists, just return success
      return res.json({ message: 'If an account exists with this email, you will receive a reset link.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiry }
    });

    const resetUrl = `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

    await sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html: generateEmailHtml({
        appUrl: process.env.APP_URL || 'http://localhost:5173',
        title: 'Password Reset',
        content: `
          <h2>Password Reset</h2>
          <p>You requested a password reset for your TMS account.</p>
          <p>Please click the button below to set a new password. This link will expire in 1 hour.</p>
          <p style="font-size: 0.9rem; color: #64748b; margin-top: 20px;">If you did not request this, please ignore this email.</p>
        `,
        buttonText: 'Reset Password',
        buttonUrl: resetUrl
      })
    });

    res.json({ message: 'If an account exists with this email, you will receive a reset link.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, password } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Incorrect current password' });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedNewPassword }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change Password Error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
app.get('/api/admin/dashboard-stats', requireAdmin, async (req, res) => {
  try {
    const activeProjectsCount = await prisma.project.count({ where: { status: 'Active' } });
    
    const activeAssignments = await prisma.assignment.findMany({ where: { status: 'Active' } });
    const activeAssignmentsCount = activeAssignments.length;
    const activeConsultantsCount = new Set(activeAssignments.map(a => a.consultantId)).size;
    
    console.log(`Dashboard Stats Debug: Total Active Assignments=${activeAssignmentsCount}, Unique Consultants=${activeConsultantsCount}`);

    // Rate extremes
    const maxBillRate = await prisma.payRate.findFirst({
      orderBy: { billRate: 'desc' },
      include: { assignment: { include: { project: { include: { client: true } } } } }
    });
    const minBillRate = await prisma.payRate.findFirst({
      where: { billRate: { gt: 0 } },
      orderBy: { billRate: 'asc' },
      include: { assignment: { include: { project: { include: { client: true } } } } }
    });
    const maxPayRate = await prisma.payRate.findFirst({
      orderBy: { payRate: 'desc' },
      include: { assignment: { include: { consultant: true } } }
    });
    const minPayRate = await prisma.payRate.findFirst({
      where: { payRate: { gt: 0 } },
      orderBy: { payRate: 'asc' },
      include: { assignment: { include: { consultant: true } } }
    });

    // Financial Analysis
    // We'll calculate for: Overall, Last 30 Days (Monthly), Last 7 Days (Weekly)
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const calculateFinance = async (startDate = null) => {
      const where = startDate ? { date: { gte: startDate } } : {};
      const entries = await prisma.timeEntry.findMany({
        where,
        include: { payRate: true }
      });

      let totalRevenue = 0;
      let totalCost = 0;
      entries.forEach(entry => {
        totalRevenue += entry.regularHours * (entry.payRate?.billRate || 0);
        totalCost += entry.regularHours * (entry.payRate?.payRate || 0);
      });

      return {
        revenue: totalRevenue,
        cost: totalCost,
        margin: totalRevenue - totalCost,
        marginPercent: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
      };
    };

    const overall = await calculateFinance();
    const monthly = await calculateFinance(oneMonthAgo);
    const weekly = await calculateFinance(oneWeekAgo);

    res.json({
      _version: "v2-assignments-fix",
      _timestamp: new Date().toISOString(),
      counts: { 
        activeProjectsCount: activeProjectsCount || 0, 
        activeConsultantsCount: activeConsultantsCount || 0, 
        activeAssignmentsCount: activeAssignmentsCount || 0 
      },
      rates: { maxBillRate, minBillRate, maxPayRate, minPayRate },
      finance: { overall, monthly, weekly }
    });
  } catch (error) {
    console.error('Admin Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// --- Reports Endpoints ---

app.get('/api/admin/reports/performance', requireAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = {};
    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: { payRate: true }
    });

    let totalBilled = 0;
    let totalPaid = 0;

    entries.forEach(entry => {
      totalBilled += (entry.regularHours + entry.travelHours) * (entry.payRate?.billRate || 0);
      totalPaid += (entry.regularHours + entry.travelHours) * (entry.payRate?.payRate || 0);
    });

    res.json({
      totalBilled,
      totalPaid,
      grossMargin: totalBilled - totalPaid,
      entryCount: entries.length
    });
  } catch (error) {
    console.error('Performance Report Error:', error);
    res.status(500).json({ error: 'Failed to generate performance report' });
  }
});

app.get('/api/admin/reports/consultant', requireAdmin, async (req, res) => {
  try {
    const { consultantId, start, end } = req.query;
    if (!consultantId) return res.status(400).json({ error: 'Consultant ID is required' });

    const where = { 
      timesheet: {
        assignment: {
          consultantId: parseInt(consultantId)
        }
      }
    };
    if (start && end) {
      where.date = {
        gte: new Date(start),
        lte: new Date(end)
      };
    }

    const entries = await prisma.timeEntry.findMany({
      where,
      include: {
        payRate: true,
        timesheet: {
          include: {
            assignment: {
              include: {
                project: {
                  include: { 
                    signer: true 
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    console.log(`Found ${entries.length} entries for report`);

    const reportData = entries.map(entry => {
      const billRate = entry.payRate?.billRate || 0;
      const payRate = entry.payRate?.payRate || 0;
      const totalHours = entry.regularHours + entry.travelHours;

      // Safe access to nested properties via timesheet -> assignment
      const assignment = entry.timesheet?.assignment;
      const projectName = assignment?.project?.name || 'N/A';
      const signerName = assignment?.project?.signer 
        ? `${assignment.project.signer.firstName} ${assignment.project.signer.lastName}`
        : 'N/A';

      return {
        id: entry.id,
        project: projectName,
        signer: signerName,
        weekEnding: entry.date,
        regularHours: entry.regularHours,
        travelHours: entry.travelHours,
        amountBilled: totalHours * billRate,
        amountPaid: totalHours * payRate
      };
    });

    res.json(reportData);
  } catch (error) {
    console.error('Consultant Report Error Details:', error);
    res.status(500).json({ error: 'Failed to generate consultant report', details: error.message });
  }
});

// --- Client CRUD Routes ---



// Middleware to check if user has Admin role
// --- Client CRUD Routes ---

app.get('/api/clients', requireAdmin, async (req, res) => {
  const clients = await prisma.client.findMany({ orderBy: { id: 'desc' } });
  res.json(clients);
});

app.post('/api/clients', requireAdmin, async (req, res) => {
  try {
    const { name, status } = req.body;
    const newClient = await prisma.client.create({ data: { name, status } });
    res.json(newClient);
  } catch (error) {
    console.error("Create Client Error:", error);
    res.status(500).json({ error: 'Failed to create client' });
  }
});

app.put('/api/clients/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status } = req.body;
    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { name, status }
    });
    res.json(updatedClient);
  } catch (error) {
    console.error("Update Client Error:", error);
    res.status(500).json({ error: 'Failed to update client' });
  }
});

app.delete('/api/clients/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.client.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error("Delete Client Error:", error);
    res.status(500).json({ error: 'Failed to delete client' });
  }
});

// --- Users CRUD Routes ---

app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'desc' },
      include: { client: true }
    });
    // Don't send passwords to frontend
    const safeUsers = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    res.json(safeUsers);
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, status, roles, clientId } = req.body;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    // Generate random password or use default
    const plainPassword = 'password123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    const newUser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phone,
        status: status || 'Active',
        roles,
        password: hashedPassword,
        clientId: clientId ? parseInt(clientId) : null
      },
      include: { client: true }
    });
    
    // Send welcome email
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    await sendEmail({
      to: email,
      subject: 'Welcome to TMS',
      html: generateEmailHtml({
        appUrl,
        title: 'Welcome to TMS',
        content: `
          <h2>Welcome to TMS, ${firstName}!</h2>
          <p>Your account has been created successfully.</p>
          <ul>
            <li><strong>Login Email:</strong> ${email}</li>
            <li><strong>Password:</strong> ${plainPassword}</li>
          </ul>
          <p>We recommend changing your password after your first login.</p>
        `,
        buttonText: 'Log In Now',
        buttonUrl: appUrl
      })
    }).catch(err => console.error('Failed to send welcome email:', err));

    const { password: _, ...safeUser } = newUser;
    res.json(safeUser);
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.put('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, status, roles, clientId } = req.body;
    
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        firstName,
        lastName,
        email,
        phone,
        status,
        roles,
        clientId: clientId ? parseInt(clientId) : null
      },
      include: { client: true }
    });
    
    const { password: _, ...safeUser } = updatedUser;
    res.json(safeUser);
  } catch (error) {
    console.error("Update User Error:", error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error("Delete User Error:", error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// --- Projects CRUD Routes ---

app.get('/api/projects', requireAdmin, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { id: 'desc' },
      include: {
        client: true,
        signer: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
    res.json(projects);
  } catch (error) {
    console.error("Fetch Projects Error:", error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

app.post('/api/projects', requireAdmin, async (req, res) => {
  try {
    const { name, description, status, clientId, signerId } = req.body;
    
    if (!name || !clientId || !signerId) {
      return res.status(400).json({ error: 'Name, Client, and Signer are required' });
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        description,
        status: status || 'Active',
        clientId: parseInt(clientId),
        signerId: parseInt(signerId)
      },
      include: {
        client: true,
        signer: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });

    // Notify Signer
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    if (newProject.signer && newProject.signer.email) {
      await sendEmail({
        to: newProject.signer.email,
        subject: `New Project Assigned: ${newProject.name}`,
        html: generateEmailHtml({
        appUrl,
        title: 'New Project Assigned',
        content: `
          <h2>New Project Assigned</h2>
          <p>Hi ${newProject.signer.firstName},</p>
          <p>You have been assigned as the Signer for a new project.</p>
          <ul>
            <li><strong>Project:</strong> ${newProject.name}</li>
            <li><strong>Client:</strong> ${newProject.client.name}</li>
            <li><strong>Description:</strong> ${newProject.description || 'N/A'}</li>
          </ul>
        `,
        buttonText: 'View Dashboard',
        buttonUrl: appUrl
      })
      }).catch(err => console.error('Failed to send project email:', err));
    }
    
    res.json(newProject);
  } catch (error) {
    console.error("Create Project Error:", error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

app.put('/api/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, clientId, signerId } = req.body;
    
    if (!name || !clientId || !signerId) {
      return res.status(400).json({ error: 'Name, Client, and Signer are required' });
    }

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        status,
        clientId: parseInt(clientId),
        signerId: parseInt(signerId)
      },
      include: {
        client: true,
        signer: { select: { id: true, firstName: true, lastName: true, email: true } }
      }
    });
    
    res.json(updatedProject);
  } catch (error) {
    console.error("Update Project Error:", error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

app.delete('/api/projects/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error("Delete Project Error:", error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// --- Assignments & PayRates CRUD Routes ---

app.get('/api/assignments', requireAdmin, async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      orderBy: { id: 'desc' },
      include: {
        consultant: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { include: { client: true } },
        payRates: { orderBy: { effectiveDate: 'asc' } }
      }
    });
    res.json(assignments);
  } catch (error) {
    console.error("Fetch Assignments Error:", error);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

app.post('/api/assignments', requireAdmin, async (req, res) => {
  try {
    const { consultantId, projectId, recipientEmails, status, payRates } = req.body;
    
    if (!consultantId || !projectId) {
      return res.status(400).json({ error: 'Consultant and Project are required' });
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        consultantId: parseInt(consultantId),
        projectId: parseInt(projectId),
        recipientEmails,
        status: status || 'Active',
        payRates: {
          create: payRates.map(pr => ({
            payRate: parseFloat(pr.payRate),
            billRate: parseFloat(pr.billRate),
            travelPayRate: parseFloat(pr.travelPayRate),
            travelBillRate: parseFloat(pr.travelBillRate),
            payRateType: pr.payRateType,
            effectiveDate: new Date(pr.effectiveDate)
          }))
        }
      },
      include: {
        consultant: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { include: { client: true } },
        payRates: { orderBy: { effectiveDate: 'asc' } }
      }
    });

    // Notify Consultant
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    if (newAssignment.consultant && newAssignment.consultant.email) {
      await sendEmail({
        to: newAssignment.consultant.email,
        subject: `New Assignment: ${newAssignment.project.name}`,
        html: generateEmailHtml({
        appUrl,
        title: 'New Assignment',
        content: `
          <h2>New Assignment</h2>
          <p>Hi ${newAssignment.consultant.firstName},</p>
          <p>You have been assigned to a new project and can now log time against it.</p>
          <ul>
            <li><strong>Project:</strong> ${newAssignment.project.name}</li>
            <li><strong>Client:</strong> ${newAssignment.project.client.name}</li>
          </ul>
        `,
        buttonText: 'Log Time',
        buttonUrl: appUrl
      })
      }).catch(err => console.error('Failed to send assignment email:', err));
    }
    
    res.json(newAssignment);
  } catch (error) {
    console.error("Create Assignment Error:", error);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

app.put('/api/assignments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { consultantId, projectId, recipientEmails, status, payRates } = req.body;
    
    if (!consultantId || !projectId) {
      return res.status(400).json({ error: 'Consultant and Project are required' });
    }

    // Only allow updating Assignment details and ADDING new payRates.
    // Existing payRates shouldn't be edited here per requirement.
    // So we just find the new ones (those without an id) and create them.
    const newPayRates = payRates.filter(pr => !pr.id).map(pr => ({
      payRate: parseFloat(pr.payRate),
      billRate: parseFloat(pr.billRate),
      travelPayRate: parseFloat(pr.travelPayRate),
      travelBillRate: parseFloat(pr.travelBillRate),
      payRateType: pr.payRateType,
      effectiveDate: new Date(pr.effectiveDate)
    }));

    const updatedAssignment = await prisma.assignment.update({
      where: { id: parseInt(id) },
      data: {
        consultantId: parseInt(consultantId),
        projectId: parseInt(projectId),
        recipientEmails,
        status,
        payRates: {
          create: newPayRates
        }
      },
      include: {
        consultant: { select: { id: true, firstName: true, lastName: true, email: true } },
        project: { include: { client: true } },
        payRates: { orderBy: { effectiveDate: 'asc' } }
      }
    });
    
    res.json(updatedAssignment);
  } catch (error) {
    console.error("Update Assignment Error:", error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

app.delete('/api/assignments/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.assignment.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error("Delete Assignment Error:", error);
    res.status(500).json({ error: 'Failed to delete assignment' });
  }
});

app.delete('/api/payrates/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if there are time entries using this pay rate
    const timeEntriesCount = await prisma.timeEntry.count({
      where: { payRateId: parseInt(id) }
    });

    if (timeEntriesCount > 0) {
      return res.status(400).json({ error: 'Cannot delete Pay Rate: there are locked time entries using this rate.' });
    }

    await prisma.payRate.delete({ where: { id: parseInt(id) } });
    res.json({ message: 'Pay Rate deleted successfully' });
  } catch (error) {
    console.error("Delete PayRate Error:", error);
    res.status(500).json({ error: 'Failed to delete pay rate' });
  }
});

app.post('/api/payrates', requireAdmin, async (req, res) => {
  try {
    const { assignmentId, payRate, billRate, travelPayRate, travelBillRate, payRateType, effectiveDate } = req.body;
    const newPayRate = await prisma.payRate.create({
      data: {
        assignmentId: parseInt(assignmentId),
        payRate: parseFloat(payRate),
        billRate: parseFloat(billRate),
        travelPayRate: parseFloat(travelPayRate),
        travelBillRate: parseFloat(travelBillRate),
        payRateType,
        effectiveDate: new Date(effectiveDate + 'T12:00:00Z')
      }
    });
    res.json(newPayRate);
  } catch (error) {
    console.error("Create PayRate Error:", error);
    res.status(500).json({ error: 'Failed to create pay rate' });
  }
});

// --- Consultant Routes ---

// --- Consultant Routes ---

app.get('/api/consultant/dashboard', requireConsultant, async (req, res) => {
  try {
    const userId = req.userId;

    const latestAssignment = await prisma.assignment.findFirst({
      where: { consultantId: userId, status: 'Active' },
      orderBy: { id: 'desc' },
      include: {
        project: { include: { client: true } },
        payRates: { orderBy: { effectiveDate: 'desc' } }
      }
    });

    const latestApprovedTimesheet = await prisma.timesheet.findFirst({
      where: { assignment: { consultantId: userId }, status: 'Approved' },
      orderBy: { updatedAt: 'desc' }
    });

    const latestRejectedTimesheet = await prisma.timesheet.findFirst({
      where: { assignment: { consultantId: userId }, status: 'Rejected' },
      orderBy: { updatedAt: 'desc' }
    });

    const pendingDraftTimesheet = await prisma.timesheet.findFirst({
      where: { assignment: { consultantId: userId }, status: 'Draft' },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({
      latestAssignment,
      latestApprovedTimesheet,
      latestRejectedTimesheet,
      pendingDraftTimesheet
    });
  } catch (error) {
    console.error("Consultant Dashboard Error:", error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
});

app.get('/api/consultant/assignments', requireConsultant, async (req, res) => {
  try {
    const userId = req.userId;
    const assignments = await prisma.assignment.findMany({
      where: { consultantId: userId, status: 'Active' },
      include: {
        project: { include: { client: true } },
        payRates: { orderBy: { effectiveDate: 'desc' } } // To get current rate easily
      }
    });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assignments', details: error.message });
  }
});

app.post('/api/consultant/time-entries', requireConsultant, async (req, res) => {
  try {
    const { assignmentId, payRateId, date, taskPerformed, regularHours, travelHours, action } = req.body;
    // action is "save" or "submit"

    // 1. Find or create a Timesheet for this assignment and Week Ending Date (Sunday)
    const entryDate = new Date(date);
    const dayOfWeek = entryDate.getDay(); // 0 is Sunday
    const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const weekEndingDate = new Date(entryDate);
    weekEndingDate.setDate(weekEndingDate.getDate() + daysToSunday);
    weekEndingDate.setHours(12, 0, 0, 0); // Normalize time to avoid timezone shifts

    let timesheet = await prisma.timesheet.findFirst({
      where: { 
        assignmentId: parseInt(assignmentId),
        weekEndingDate: {
          gte: new Date(weekEndingDate.setHours(0,0,0,0)),
          lte: new Date(weekEndingDate.setHours(23,59,59,999))
        }
      }
    });

    if (!timesheet) {
      timesheet = await prisma.timesheet.create({
        data: {
          assignmentId: parseInt(assignmentId),
          weekEndingDate: new Date(weekEndingDate.setHours(12,0,0,0)), // reset
          status: 'Draft'
        }
      });
    } else if (timesheet.status === 'Submitted' || timesheet.status === 'Approved') {
      return res.status(400).json({ error: 'Timesheet for this week is already submitted or approved.' });
    }

    // 2. Check if a TimeEntry for this date already exists. If so, update it. If not, create it.
    // For simplicity, we assume one entry per day per assignment in this MVP.
    const startOfDay = new Date(entryDate);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(entryDate);
    endOfDay.setHours(23,59,59,999);

    const existingEntry = await prisma.timeEntry.findFirst({
      where: {
        timesheetId: timesheet.id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existingEntry) {
      await prisma.timeEntry.update({
        where: { id: existingEntry.id },
        data: {
          payRateId: parseInt(payRateId),
          taskPerformed,
          regularHours: parseFloat(regularHours),
          travelHours: parseFloat(travelHours)
        }
      });
    } else {
      await prisma.timeEntry.create({
        data: {
          timesheetId: timesheet.id,
          payRateId: parseInt(payRateId),
          date: new Date(entryDate.setHours(12,0,0,0)),
          taskPerformed,
          regularHours: parseFloat(regularHours),
          travelHours: parseFloat(travelHours)
        }
      });
    }

    // 3. If action === 'submit', update the timesheet status
    if (action === 'submit') {
      await prisma.timesheet.update({
        where: { id: timesheet.id },
        data: { status: 'Submitted' }
      });
    }

    res.json({ message: action === 'submit' ? 'Timesheet submitted successfully' : 'Time entry saved successfully' });
  } catch (error) {
    console.error("Time Entry Error:", error);
    res.status(500).json({ error: 'Failed to process time entry' });
  }
});

// GET all timesheets for the logged-in consultant (with summary totals)
app.get('/api/consultant/timesheets', requireConsultant, async (req, res) => {
  try {
    const userId = req.userId;
    const timesheets = await prisma.timesheet.findMany({
      where: { assignment: { consultantId: userId } },
      orderBy: { weekEndingDate: 'desc' },
      include: {
        assignment: {
          include: {
            project: { include: { client: true } }
          }
        },
        entries: {
          select: { regularHours: true, travelHours: true }
        }
      }
    });

    // Attach totals to each timesheet
    const result = timesheets.map(ts => ({
      ...ts,
      totalRegularHours: ts.entries.reduce((sum, e) => sum + e.regularHours, 0),
      totalTravelHours: ts.entries.reduce((sum, e) => sum + e.travelHours, 0),
      entryCount: ts.entries.length
    }));

    res.json(result);
  } catch (error) {
    console.error('Fetch Timesheets Error:', error);
    res.status(500).json({ error: 'Failed to fetch timesheets', details: error.message });
  }
});

// GET a single timesheet with all its daily entries
app.get('/api/consultant/timesheets/:id', requireConsultant, async (req, res) => {
  try {
    const userId = req.userId;
    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id: parseInt(req.params.id),
        assignment: { consultantId: userId }  // security: only own timesheets
      },
      include: {
        assignment: {
          include: {
            consultant: true,
            project: { include: { client: true, signer: true } }
          }
        },
        entries: {
          orderBy: { date: 'asc' },
          include: { payRate: true }
        }
      }
    });

    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    res.json(timesheet);
  } catch (error) {
    console.error('Fetch Timesheet Detail Error:', error);
    res.status(500).json({ error: 'Failed to fetch timesheet' });
  }
});

// PUT recall a submitted timesheet back to Draft
app.put('/api/consultant/timesheets/:id/recall', requireConsultant, async (req, res) => {
  try {
    const userId = req.userId;
    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id: parseInt(req.params.id),
        assignment: { consultantId: userId }
      }
    });

    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    if (timesheet.status !== 'Submitted') {
      return res.status(400).json({ error: 'Only submitted timesheets can be recalled.' });
    }

    const updated = await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: { status: 'Draft' }
    });

    res.json({ message: 'Timesheet recalled successfully', timesheet: updated });
  } catch (error) {
    console.error('Recall Timesheet Error:', error);
    res.status(500).json({ error: 'Failed to recall timesheet' });
  }
});

// PUT submit an entire timesheet (all existing draft entries)
app.put('/api/consultant/timesheets/:id/submit', requireConsultant, async (req, res) => {
  try {
    const userId = req.userId;
    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id: parseInt(req.params.id),
        assignment: { consultantId: userId }
      },
      include: { 
        entries: true,
        assignment: {
          include: { 
            consultant: true,
            project: { include: { signer: true } }
          }
        }
      }
    });

    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    if (timesheet.status !== 'Draft' && timesheet.status !== 'Rejected') {
      return res.status(400).json({ error: 'Only Draft or Rejected timesheets can be submitted.' });
    }
    if (timesheet.entries.length === 0) {
      return res.status(400).json({ error: 'Cannot submit an empty timesheet. Please log at least one time entry.' });
    }

    const updated = await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: { status: 'Submitted' }
    });

    // Notify Signer
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const signer = timesheet.assignment.project.signer;
    if (signer && signer.email) {
      const totalReg = timesheet.entries.reduce((sum, e) => sum + e.regularHours, 0);
      const totalTravel = timesheet.entries.reduce((sum, e) => sum + e.travelHours, 0);
      const weekEnding = new Date(timesheet.weekEndingDate).toLocaleDateString();
      
      await sendEmail({
        to: signer.email,
        subject: `Timesheet Submitted: ${timesheet.assignment.consultant.firstName} ${timesheet.assignment.consultant.lastName}`,
        html: generateEmailHtml({
        appUrl,
        title: 'Timesheet Submitted for Approval',
        content: `
          <h2>Timesheet Submitted</h2>
          <p>Hi ${signer.firstName},</p>
          <p><strong>${timesheet.assignment.consultant.firstName} ${timesheet.assignment.consultant.lastName}</strong> has submitted a timesheet for your review.</p>
          <ul>
            <li><strong>Project:</strong> ${timesheet.assignment.project.name}</li>
            <li><strong>Week Ending:</strong> ${weekEnding}</li>
            <li><strong>Regular Hours:</strong> ${totalReg}</li>
            <li><strong>Travel Hours:</strong> ${totalTravel}</li>
          </ul>
        `,
        buttonText: 'Review Timesheet',
        buttonUrl: `${appUrl}/?ts=${timesheet.guid}`
      })
      }).catch(err => console.error('Failed to send timesheet submit email:', err));
    }

    res.json({ message: 'Timesheet submitted successfully', timesheet: updated });
  } catch (error) {
    console.error('Submit Timesheet Error:', error);
    res.status(500).json({ error: 'Failed to submit timesheet' });
  }
});

// DELETE a single time entry (only if parent timesheet is still Draft)
app.delete('/api/consultant/time-entries/:id', requireConsultant, async (req, res) => {
  try {
    const userId = req.userId;
    const entry = await prisma.timeEntry.findFirst({
      where: { id: parseInt(req.params.id) },
      include: {
        timesheet: {
          include: { assignment: true }
        }
      }
    });

    if (!entry) return res.status(404).json({ error: 'Time entry not found' });
    if (entry.timesheet.assignment.consultantId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (entry.timesheet.status !== 'Draft') {
      return res.status(400).json({ error: 'Cannot delete entries from a non-draft timesheet.' });
    }

    await prisma.timeEntry.delete({ where: { id: entry.id } });
    res.json({ message: 'Time entry deleted successfully' });
  } catch (error) {
    console.error('Delete Time Entry Error:', error);
    res.status(500).json({ error: 'Failed to delete time entry' });
  }
});

// --- Signer Routes ---

// --- Signer Routes ---

app.get('/api/signer/dashboard', requireSigner, async (req, res) => {
  try {
    const userId = req.userId;
    // Find all timesheets for projects where this user is the signer
    const projects = await prisma.project.findMany({
      where: { signerId: userId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    const pendingCount = await prisma.timesheet.count({
      where: { assignment: { projectId: { in: projectIds } }, status: 'Submitted' }
    });

    const rejectedCount = await prisma.timesheet.count({
      where: { assignment: { projectId: { in: projectIds } }, status: 'Rejected' }
    });

    // To get hours, we need the entries
    const draftTimesheets = await prisma.timesheet.findMany({
      where: { assignment: { projectId: { in: projectIds } }, status: 'Draft' },
      include: { entries: true }
    });
    let draftHours = 0;
    draftTimesheets.forEach(ts => {
      ts.entries.forEach(e => { draftHours += e.regularHours + e.travelHours; });
    });

    const approvedTimesheets = await prisma.timesheet.findMany({
      where: { assignment: { projectId: { in: projectIds } }, status: 'Approved' },
      include: { entries: true }
    });
    let approvedHours = 0;
    approvedTimesheets.forEach(ts => {
      ts.entries.forEach(e => { approvedHours += e.regularHours + e.travelHours; });
    });

    res.json({
      pendingCount,
      rejectedCount,
      draftHours,
      approvedHours
    });
  } catch (error) {
    console.error("Signer Dashboard Error:", error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

app.get('/api/signer/timesheets', requireSigner, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query; // optional filter
    
    const projects = await prisma.project.findMany({
      where: { signerId: userId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    const whereClause = { assignment: { projectId: { in: projectIds } } };
    if (status) {
      whereClause.status = status;
    }

    const timesheets = await prisma.timesheet.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' },
      include: {
        assignment: {
          include: {
            consultant: true,
            project: { include: { client: true } }
          }
        },
        entries: { select: { regularHours: true, travelHours: true } }
      }
    });

    const result = timesheets.map(ts => ({
      ...ts,
      totalRegularHours: ts.entries.reduce((sum, e) => sum + e.regularHours, 0),
      totalTravelHours: ts.entries.reduce((sum, e) => sum + e.travelHours, 0),
      entryCount: ts.entries.length
    }));

    res.json(result);
  } catch (error) {
    console.error('Fetch Signer Timesheets Error:', error);
    res.status(500).json({ error: 'Failed to fetch timesheets' });
  }
});

app.get('/api/signer/timesheets/:id', requireSigner, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Verify the signer owns the project
    const projects = await prisma.project.findMany({
      where: { signerId: userId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    const idParam = req.params.id;
    const isGuid = idParam.length > 10; // Simple heuristic for UUID

    const timesheet = await prisma.timesheet.findFirst({
      where: {
        ...(isGuid ? { guid: idParam } : { id: parseInt(idParam) }),
        assignment: { projectId: { in: projectIds } }
      },
      include: {
        assignment: {
          include: {
            consultant: true,
            project: { include: { client: true, signer: true } }
          }
        },
        entries: {
          orderBy: { date: 'asc' },
          include: { payRate: true }
        }
      }
    });

    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    res.json(timesheet);
  } catch (error) {
    console.error('Fetch Signer Timesheet Detail Error:', error);
    res.status(500).json({ error: 'Failed to fetch timesheet' });
  }
});

app.put('/api/signer/timesheets/:id/approve', requireSigner, async (req, res) => {
  try {
    const userId = req.userId;
    const projects = await prisma.project.findMany({
      where: { signerId: userId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id: parseInt(req.params.id),
        assignment: { projectId: { in: projectIds } }
      }
    });

    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    if (timesheet.status !== 'Submitted') return res.status(400).json({ error: 'Timesheet must be in Submitted state to approve.' });

    const updated = await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: { status: 'Approved', approvedAt: new Date() }
    });

    res.json({ message: 'Timesheet approved successfully', timesheet: updated });
  } catch (error) {
    console.error('Approve Timesheet Error:', error);
    res.status(500).json({ error: 'Failed to approve timesheet' });
  }
});

app.put('/api/signer/timesheets/:id/reject', requireSigner, async (req, res) => {
  try {
    const userId = req.userId;
    const { reason } = req.body;
    
    const projects = await prisma.project.findMany({
      where: { signerId: userId },
      select: { id: true }
    });
    const projectIds = projects.map(p => p.id);

    const timesheet = await prisma.timesheet.findFirst({
      where: {
        id: parseInt(req.params.id),
        assignment: { projectId: { in: projectIds } }
      },
      include: {
        assignment: {
          include: { consultant: true, project: true }
        }
      }
    });

    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    if (timesheet.status !== 'Submitted') return res.status(400).json({ error: 'Timesheet must be in Submitted state to reject.' });

    const updated = await prisma.timesheet.update({
      where: { id: timesheet.id },
      data: { status: 'Rejected' }
    });

    // Notify Consultant about rejection
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const consultant = timesheet.assignment.consultant;
    if (consultant && consultant.email) {
      const weekEnding = new Date(timesheet.weekEndingDate).toLocaleDateString();
      await sendEmail({
        to: consultant.email,
        subject: `Timesheet Rejected: ${timesheet.assignment.project.name}`,
        html: generateEmailHtml({
        appUrl,
        title: 'Timesheet Rejected',
        content: `
          <h2>Timesheet Rejected</h2>
          <p>Hi ${consultant.firstName},</p>
          <p>Your timesheet for <strong>${timesheet.assignment.project.name}</strong> (Week Ending: ${weekEnding}) has been <strong>rejected</strong>.</p>
          ${reason ? `<p><strong>Reason provided:</strong> ${reason}</p>` : ''}
          <p>Please log in to the TMS Dashboard, recall your timesheet to Draft, make the necessary corrections, and resubmit.</p>
        `,
        buttonText: 'View Dashboard',
        buttonUrl: appUrl
      })
      }).catch(err => console.error('Failed to send rejection email:', err));
    }

    res.json({ message: 'Timesheet rejected successfully', timesheet: updated });
  } catch (error) {
    console.error('Reject Timesheet Error:', error);
    res.status(500).json({ error: 'Failed to reject timesheet' });
  }
});

// --- Payroll Routes ---

app.get('/api/payroll/dashboard', requirePayroll, async (req, res) => {
  try {
    // Get all approved timesheets with full entry + pay rate data
    const approvedTimesheets = await prisma.timesheet.findMany({
      where: { status: 'Approved' },
      include: {
        entries: { include: { payRate: true } },
        assignment: {
          include: {
            consultant: true,
            project: { include: { client: true } }
          }
        }
      }
    });

    // Pending (Approved but not yet "processed" — we treat all Approved as pending payroll)
    const pendingPayrollCount = approvedTimesheets.length;

    let totalApprovedHours = 0;
    let totalBilled = 0;
    let totalPaid = 0;

    // This week & this month
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let weekBilled = 0, weekPaid = 0;
    let monthBilled = 0, monthPaid = 0;

    approvedTimesheets.forEach(ts => {
      const weekDate = new Date(ts.weekEndingDate);
      const isThisWeek = weekDate >= startOfWeek;
      const isThisMonth = weekDate >= startOfMonth;

      ts.entries.forEach(entry => {
        const regHours = entry.regularHours;
        const travelHours = entry.travelHours;
        const pr = entry.payRate;

        if (!pr) return;

        totalApprovedHours += regHours + travelHours;

        const billed = regHours * pr.billRate + travelHours * pr.travelBillRate;
        const paid = regHours * pr.payRate + travelHours * pr.travelPayRate;

        totalBilled += billed;
        totalPaid += paid;

        if (isThisWeek) { weekBilled += billed; weekPaid += paid; }
        if (isThisMonth) { monthBilled += billed; monthPaid += paid; }
      });
    });

    // Recent 5 approved timesheets for activity feed
    const recentTimesheets = approvedTimesheets
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(ts => {
        let tsHours = 0, tsBilled = 0, tsPaid = 0;
        ts.entries.forEach(e => {
          tsHours += e.regularHours + e.travelHours;
          if (e.payRate) {
            tsBilled += e.regularHours * e.payRate.billRate + e.travelHours * e.payRate.travelBillRate;
            tsPaid += e.regularHours * e.payRate.payRate + e.travelHours * e.payRate.travelPayRate;
          }
        });
        return {
          id: ts.id,
          consultantName: `${ts.assignment.consultant.firstName} ${ts.assignment.consultant.lastName}`,
          projectName: ts.assignment.project.name,
          clientName: ts.assignment.project.client?.name,
          weekEndingDate: ts.weekEndingDate,
          totalHours: tsHours,
          totalBilled: tsBilled,
          totalPaid: tsPaid,
          netRevenue: tsBilled - tsPaid
        };
      });

    res.json({
      pendingPayrollCount,
      totalApprovedHours: Math.round(totalApprovedHours * 100) / 100,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      netRevenue: Math.round((totalBilled - totalPaid) * 100) / 100,
      thisWeek: {
        billed: Math.round(weekBilled * 100) / 100,
        paid: Math.round(weekPaid * 100) / 100,
        net: Math.round((weekBilled - weekPaid) * 100) / 100
      },
      thisMonth: {
        billed: Math.round(monthBilled * 100) / 100,
        paid: Math.round(monthPaid * 100) / 100,
        net: Math.round((monthBilled - monthPaid) * 100) / 100
      },
      recentTimesheets
    });
  } catch (error) {
    console.error('Payroll Dashboard Error:', error);
    res.status(500).json({ error: 'Failed to fetch payroll data' });
  }
});

app.get('/api/payroll/timesheets', requirePayroll, async (req, res) => {
  try {
    const { payRateType, status, startDate, endDate, projectName, consultantName, entryStartDate, entryEndDate } = req.query;

    const whereClause = {};
    if (status === 'all') {
      // Ignore status filter completely
    } else if (status) {
      whereClause.status = status;
    } else {
      // Default for components that don't specify a status
      whereClause.status = 'Approved';
    }

    if (projectName) {
      whereClause.assignment = {
        project: { name: { contains: projectName } }
      };
    }

    if (consultantName) {
      // If whereClause.assignment already exists, we combine them
      whereClause.assignment = {
        ...(whereClause.assignment || {}),
        consultant: {
          OR: [
            { firstName: { contains: consultantName } },
            { lastName: { contains: consultantName } },
            {
              AND: [
                { firstName: { contains: consultantName.split(' ')[0] || '' } },
                { lastName: { contains: consultantName.split(' ')[1] || '' } }
              ]
            }
          ]
        }
      };
    }

    if (entryStartDate || entryEndDate) {
      whereClause.entries = {
        some: {
          date: {}
        }
      };
      if (entryStartDate) whereClause.entries.some.date.gte = new Date(entryStartDate);
      if (entryEndDate) {
        const end = new Date(entryEndDate);
        end.setHours(23, 59, 59, 999);
        whereClause.entries.some.date.lte = end;
      }
    }

    if (startDate || endDate) {
      // For general records (status=all or specific status), weekEndingDate is a better filter.
      // But if user specifically wants approved history, we could use approvedAt.
      // To keep it simple and consistent for "Records", we use weekEndingDate here.
      const dateField = (status === 'Approved' || status === 'Processed') ? 'approvedAt' : 'weekEndingDate';
      
      whereClause[dateField] = {};
      if (startDate) whereClause[dateField].gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause[dateField].lte = end;
      }
    }

    const timesheets = await prisma.timesheet.findMany({
      where: whereClause,
      orderBy: { weekEndingDate: 'desc' },
      include: {
        entries: { include: { payRate: true } },
        assignment: {
          include: {
            consultant: true,
            project: {
              include: {
                client: true,
                signer: true
              }
            }
          }
        }
      }
    });

    const result = timesheets.map(ts => {
      const entries = ts.entries;
      // Get dominant pay rate type from entries
      const dominantRate = entries[0]?.payRate;
      const payRateTypeVal = dominantRate?.payRateType ?? 'N/A';
      const payRateVal = dominantRate?.payRate ?? 0;
      const travelPayRateVal = dominantRate?.travelPayRate ?? 0;

      let totalRegHours = 0;
      let totalTravelHours = 0;
      let totalPay = 0;

      entries.forEach(e => {
        totalRegHours += e.regularHours;
        totalTravelHours += e.travelHours;
        const pr = e.payRate;
        if (pr) {
          totalPay += e.regularHours * pr.payRate + e.travelHours * pr.travelPayRate;
        }
      });

      return {
        id: ts.id,
        consultantName: `${ts.assignment.consultant.firstName} ${ts.assignment.consultant.lastName}`,
        weekEndingDate: ts.weekEndingDate,
        clientName: ts.assignment.project.client?.name ?? '—',
        projectName: ts.assignment.project.name,
        signerName: ts.assignment.project.signer
          ? `${ts.assignment.project.signer.firstName} ${ts.assignment.project.signer.lastName}`
          : '—',
        payRateType: payRateTypeVal,
        payRate: payRateVal,
        travelPayRate: travelPayRateVal,
        hoursWorked: Math.round(totalRegHours * 100) / 100,
        hoursTraveled: Math.round(totalTravelHours * 100) / 100,
        totalPay: Math.round(totalPay * 100) / 100,
        status: ts.status,
        approvedAt: ts.approvedAt,
        processedAt: ts.processedAt,
        entries: ts.entries
      };
    }).filter(ts => !payRateType || ts.payRateType === payRateType);

    res.json(result);
  } catch (error) {
    console.error('Payroll Timesheets Error:', error);
    res.status(500).json({ error: 'Failed to fetch payroll timesheets' });
  }
});

app.put('/api/payroll/timesheets/:id/process', requirePayroll, async (req, res) => {
  try {
    const updated = await prisma.timesheet.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Processed', processedAt: new Date() }
    });
    res.json({ message: 'Timesheet marked as Processed', timesheet: updated });
  } catch (error) {
    console.error('Process Timesheet Error:', error);
    res.status(500).json({ error: 'Failed to process timesheet' });
  }
});

app.get('/api/payroll/timesheets/:id', requirePayroll, async (req, res) => {
  try {
    const timesheet = await prisma.timesheet.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        assignment: {
          include: {
            consultant: true,
            project: { include: { client: true } }
          }
        },
        entries: {
          include: { payRate: true },
          orderBy: { date: 'asc' }
        }
      }
    });

    if (!timesheet) return res.status(404).json({ error: 'Timesheet not found' });
    res.json(timesheet);
  } catch (error) {
    console.error('Payroll Timesheet Detail Error:', error);
    res.status(500).json({ error: 'Failed to fetch timesheet details' });
  }
});

app.put('/api/payroll/timesheets/process-bulk', requirePayroll, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No timesheet IDs provided' });
    }

    const updated = await prisma.timesheet.updateMany({
      where: { id: { in: ids } },
      data: { status: 'Processed', processedAt: new Date() }
    });
    res.json({ message: `${updated.count} timesheets marked as Processed` });
  } catch (error) {
    console.error('Bulk Process Timesheets Error:', error);
    res.status(500).json({ error: 'Failed to process timesheets' });
  }
});

// Admin lookups for filters
app.get('/api/admin/projects', requirePayroll, async (req, res) => {
  try {
    const projects = await prisma.project.findMany({ select: { id: true, name: true } });
    res.json(projects);
  } catch (e) { 
    console.error('Error fetching admin projects:', e);
    res.status(500).json([]); 
  }
});

app.get('/api/admin/consultants', requirePayroll, async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = {};
    if (projectId && !isNaN(parseInt(projectId))) {
      where.assignments = { some: { projectId: parseInt(projectId) } };
    }
    const consultants = await prisma.user.findMany({
      where: { ...where, roles: { contains: 'Consultant' } },
      select: { id: true, firstName: true, lastName: true }
    });
    res.json(consultants.map(c => ({ id: c.id, name: `${c.firstName} ${c.lastName}` })));
  } catch (e) { 
    console.error('Error fetching admin consultants:', e);
    res.status(500).json([]); 
  }
});

// Serve React frontend in production
const distPath = join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — must be after all API routes
  app.get('*', (req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
