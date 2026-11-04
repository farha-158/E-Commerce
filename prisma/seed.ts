import * as bcrypt from 'bcrypt';
import { UserRole } from '../generated/prisma/browser';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'e-commerce@commerce.com';
  const adminPassword = 'commerce@309';

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      name: 'Super Admin',
      phone: '01000000000',
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
    },
    create: {
      name: 'Super Admin',
      email: adminEmail,
      phone: '01000000000',
      password_hash: passwordHash,
      role: UserRole.ADMIN,
      isVerified: true,
    },
  });

  console.log('Admin account created successfully:', admin.email);
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
