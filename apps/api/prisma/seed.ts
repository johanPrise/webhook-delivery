import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes } from 'node:crypto';
import { generateApiKey, hashApiKey } from '../src/auth/api-key.util';

// Seed de dev : une Application de test + un Endpoint, pour pouvoir tester
// POST /events sans passer par un futur écran d'admin (pas encore construit).
const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

async function main() {
  const apiKey = generateApiKey();
  const endpointSecret = `whsec_${randomBytes(24).toString('hex')}`;

  const application = await prisma.application.create({
    data: {
      name: 'Dev Test App',
      apiKeyHash: hashApiKey(apiKey),
      endpoints: {
        create: {
          url: 'http://localhost:4000/webhook',
          secret: endpointSecret,
          description: 'Récepteur de test local',
        },
      },
    },
    include: { endpoints: true },
  });

  console.log('Application créée :', application.name, `(${application.id})`);
  console.log('Endpoint créé     :', application.endpoints[0]?.id);
  console.log('');
  console.log('Clé API (à conserver, non ré-affichable) :', apiKey);
  console.log('Secret HMAC de l\'endpoint                :', endpointSecret);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });