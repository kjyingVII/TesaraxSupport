const { PrismaClient, UserRole } = require("@prisma/client");
const { pbkdf2Sync, randomBytes } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("base64url");
  const iterations = 120000;
  const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
  return `pbkdf2$${iterations}$${salt}$${hash}`;
}

async function main() {
  const passwordHash = hashPassword("password123");

  const users = [
    {
      name: "Demo Admin",
      email: "admin@example.com",
      role: UserRole.ADMIN
    },
    {
      name: "Demo Technician",
      email: "technician@example.com",
      role: UserRole.TECHNICIAN
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        isActive: true
      },
      create: {
        ...user,
        passwordHash,
        isActive: true
      }
    });
  }
}

main()
  .then(() => {
    console.log("Demo users seeded.");
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
