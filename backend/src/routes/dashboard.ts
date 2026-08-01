import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  clientCreateSchema,
  projectCreateSchema,
  projectMoveSchema,
  postCreateSchema,
  invoiceCreateSchema,
  idSchema
} from '../lib/validation.js';
import { logAudit, clientIp, type AuditAction } from '../security/audit.js';
import { requireAuth, requireAdmin, requireSameOrigin } from '../middleware/security.js';

export const dashboardRouter = Router();

// Everything below requires a valid, non-revoked session.
dashboardRouter.use(requireAuth);

/** Shared delete handler: validates the id, removes the row, records the audit. */
async function handleDelete(
  req: any,
  res: any,
  action: AuditAction,
  remove: (id: string) => Promise<Record<string, unknown> | null>
) {
  const parsed = idSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: 'invalid_id' });
    return;
  }
  const removed = await remove(parsed.data).catch(() => null);
  if (!removed) {
    res.status(404).json({ ok: false, error: 'not_found' });
    return;
  }
  await logAudit({ action, actor: req.session.email, ip: clientIp(req), meta: removed });
  res.json({ ok: true });
}

/* ---------------- overview ---------------- */

dashboardRouter.get('/overview', async (_req, res) => {
  const [leads, newLeads, clients, projects, recent] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'new' } }),
    prisma.client.count(),
    prisma.project.count(),
    prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 })
  ]);
  res.json({ ok: true, counts: { leads, newLeads, clients, projects }, recent });
});

/* ---------------- leads ---------------- */

dashboardRouter.get('/leads', async (_req, res) => {
  res.json({ ok: true, leads: await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } }) });
});

dashboardRouter.delete('/leads/:id', requireSameOrigin, (req, res) =>
  handleDelete(req, res, 'delete_lead', (id) =>
    prisma.lead.delete({ where: { id }, select: { id: true, name: true, email: true } })
  )
);

/* ---------------- clients ---------------- */

dashboardRouter.get('/clients', async (_req, res) => {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { projects: true } } }
  });
  res.json({ ok: true, clients });
});

dashboardRouter.post('/clients', requireSameOrigin, async (req, res) => {
  const parsed = clientCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'invalid' });
    return;
  }
  const created = await prisma.client.create({ data: parsed.data });
  await logAudit({
    action: 'create_client',
    actor: req.session!.email,
    ip: clientIp(req),
    meta: { id: created.id, name: created.name }
  });
  res.json({ ok: true, client: created });
});

// Projects/posts/invoices linked to the client are kept (clientId becomes null),
// so financial history is never lost.
dashboardRouter.delete('/clients/:id', requireSameOrigin, (req, res) =>
  handleDelete(req, res, 'delete_client', (id) =>
    prisma.client.delete({ where: { id }, select: { id: true, name: true } })
  )
);

/* ---------------- projects ---------------- */

dashboardRouter.get('/projects', async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { name: true } } }
  });
  res.json({ ok: true, projects });
});

dashboardRouter.post('/projects', requireSameOrigin, async (req, res) => {
  const parsed = projectCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'invalid' });
    return;
  }
  const created = await prisma.project.create({ data: parsed.data });
  await logAudit({
    action: 'create_project',
    actor: req.session!.email,
    ip: clientIp(req),
    meta: { id: created.id, name: created.name }
  });
  res.json({ ok: true, project: created });
});

dashboardRouter.patch('/projects/:id/status', requireSameOrigin, async (req, res) => {
  const parsed = projectMoveSchema.safeParse({ id: req.params.id, status: req.body?.status });
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'invalid' });
    return;
  }
  await prisma.project.update({
    where: { id: parsed.data.id },
    data: { status: parsed.data.status }
  });
  await logAudit({ action: 'move_project', actor: req.session!.email, meta: parsed.data });
  res.json({ ok: true });
});

dashboardRouter.delete('/projects/:id', requireSameOrigin, (req, res) =>
  handleDelete(req, res, 'delete_project', (id) =>
    prisma.project.delete({ where: { id }, select: { id: true, name: true } })
  )
);

/* ---------------- marketing ---------------- */

dashboardRouter.get('/posts', async (_req, res) => {
  const posts = await prisma.socialPost.findMany({
    orderBy: { scheduledFor: 'asc' },
    include: { client: { select: { name: true } } }
  });
  res.json({ ok: true, posts });
});

dashboardRouter.post('/posts', requireSameOrigin, async (req, res) => {
  const parsed = postCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'invalid' });
    return;
  }
  const created = await prisma.socialPost.create({ data: parsed.data });
  await logAudit({
    action: 'create_post',
    actor: req.session!.email,
    ip: clientIp(req),
    meta: { id: created.id, title: created.title }
  });
  res.json({ ok: true, post: created });
});

dashboardRouter.delete('/posts/:id', requireSameOrigin, (req, res) =>
  handleDelete(req, res, 'delete_post', (id) =>
    prisma.socialPost.delete({ where: { id }, select: { id: true, title: true } })
  )
);

/* ---------------- finance ---------------- */

dashboardRouter.get('/invoices', async (_req, res) => {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: 'desc' },
    include: { client: { select: { name: true } } }
  });
  res.json({ ok: true, invoices });
});

dashboardRouter.post('/invoices', requireSameOrigin, async (req, res) => {
  const parsed = invoiceCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ ok: false, error: 'invalid' });
    return;
  }
  const created = await prisma.invoice.create({ data: parsed.data });
  await logAudit({
    action: 'create_invoice',
    actor: req.session!.email,
    ip: clientIp(req),
    meta: { id: created.id, amount: created.amount }
  });
  res.json({ ok: true, invoice: created });
});

dashboardRouter.delete('/invoices/:id', requireSameOrigin, (req, res) =>
  handleDelete(req, res, 'delete_invoice', (id) =>
    prisma.invoice.delete({ where: { id }, select: { id: true, description: true, amount: true } })
  )
);

/* ---------------- audit (admin only) ---------------- */

dashboardRouter.get('/audit', requireAdmin, async (_req, res) => {
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  res.json({ ok: true, logs });
});
