import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const email = (process.env.SEED_ADMIN_EMAIL || 'admin@natastudios.com').toLowerCase();

// Never hardcode a default password in source control.
const password = process.env.SEED_ADMIN_PASSWORD;
if (!password) {
  console.error(
    '\n❌ Defina SEED_ADMIN_PASSWORD antes de rodar o seed.\n' +
      "   Ex.: SEED_ADMIN_PASSWORD='sua-senha' npm run db:seed\n"
  );
  process.exit(1);
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  // Upsert AND reset the password — running the seed is how an operator sets or
  // rotates the admin password (documented in docs/DEPLOY.md).
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'admin' },
    create: { email, name: 'Admin', passwordHash, role: 'admin' }
  });

  // A little sample data so the dashboard isn't empty on first run.
  if ((await prisma.lead.count()) === 0) {
    await prisma.lead.createMany({
      data: [
        { name: 'Maria Souza', email: 'maria@empresa.com', message: 'Preciso de uma landing page.', source: 'website', status: 'new' },
        { name: 'João Lima', email: 'joao@loja.com', phone: '(11) 98888-0000', message: 'Quero rodar tráfego pago.', source: 'website', status: 'contacted' },
        { name: 'Ana Prado', email: 'ana@startup.com', message: 'Sistema interno / dashboard.', source: 'website', status: 'won' }
      ]
    });
  }
  if ((await prisma.client.count()) === 0) {
    await prisma.client.createMany({
      data: [
        { name: 'Loja Aurora', email: 'contato@aurora.com', company: 'Aurora Ltda', status: 'active' },
        { name: 'Clínica Bem-Estar', email: 'adm@bemestar.com', status: 'prospect' }
      ]
    });
  }

  const clients = await prisma.client.findMany();
  const clientId = (name) => clients.find((c) => c.name.startsWith(name))?.id ?? clients[0]?.id ?? null;
  const days = (n) => new Date(Date.now() + n * 86400000);

  if ((await prisma.project.count()) === 0) {
    await prisma.project.createMany({
      data: [
        { name: 'Site institucional Aurora', status: 'in_progress', clientId: clientId('Loja'), deadline: days(12) },
        { name: 'Landing page Black Friday', status: 'review', clientId: clientId('Loja'), deadline: days(5) },
        { name: 'Dashboard interno Bem-Estar', status: 'backlog', clientId: clientId('Clínica'), deadline: days(30) },
        { name: 'Identidade visual', status: 'done', clientId: clientId('Clínica') },
        { name: 'Automação de WhatsApp', status: 'backlog', clientId: clientId('Loja'), deadline: days(20) }
      ]
    });
  }

  if ((await prisma.socialPost.count()) === 0) {
    await prisma.socialPost.createMany({
      data: [
        { title: 'Reels — bastidores do projeto', platform: 'instagram', status: 'scheduled', clientId: clientId('Loja'), scheduledFor: days(2) },
        { title: 'Carrossel — 5 dicas de SEO', platform: 'instagram', status: 'idea', clientId: clientId('Loja') },
        { title: 'Post — case de sucesso', platform: 'linkedin', status: 'published', clientId: clientId('Clínica'), scheduledFor: days(-3) },
        { title: 'Stories — enquete', platform: 'instagram', status: 'scheduled', clientId: clientId('Clínica'), scheduledFor: days(1) }
      ]
    });
  }

  if ((await prisma.invoice.count()) === 0) {
    await prisma.invoice.createMany({
      data: [
        { description: 'Desenvolvimento site — 1ª parcela', amount: 4500, status: 'paid', clientId: clientId('Loja'), dueDate: days(-10) },
        { description: 'Gestão de tráfego — mensalidade', amount: 1800, status: 'sent', clientId: clientId('Loja'), dueDate: days(6) },
        { description: 'Dashboard interno — entrada', amount: 6000, status: 'draft', clientId: clientId('Clínica'), dueDate: days(15) },
        { description: 'Social media — mensalidade', amount: 1200, status: 'overdue', clientId: clientId('Clínica'), dueDate: days(-4) }
      ]
    });
  }

  console.log('\n✅ Seed concluído.');
  console.log(`   Login:    ${email}`);
  console.log(`   Senha:    ${password}\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
