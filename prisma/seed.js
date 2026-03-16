const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const tech = await prisma.user.upsert({
    where: { email: 'tech@telecomnetworks.org' },
    update: {},
    create: {
      email: 'tech@telecomnetworks.org',
      name: 'Admin Tecnologia',
      role: 'TECHNOLOGY',
    },
  })

  const supervisor = await prisma.user.upsert({
    where: { email: 'supervisor@telecomnetworks.org' },
    update: {},
    create: {
      email: 'supervisor@telecomnetworks.org',
      name: 'Supervisor Juan',
      role: 'SUPERVISOR',
    },
  })

  const user = await prisma.user.upsert({
    where: { email: 'user@telecomnetworks.org' },
    update: {},
    create: {
      email: 'user@telecomnetworks.org',
      name: 'Empleado Pedro',
      role: 'USER',
    },
  })

  console.log({ tech, supervisor, user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
