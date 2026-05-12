const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    const userId = 1; // dummy user
    const res = await prisma.assignment.findFirst({
      where: { consultantId: userId, status: 'Active' },
      orderBy: { id: 'desc' },
      include: {
        project: { include: { client: true } },
        payRates: { orderBy: { effectiveDate: 'desc' }, take: 1 }
      }
    });
    console.log(res);
  } catch (err) {
    console.error(err.message);
  } finally {
    prisma.$disconnect();
  }
}
test();
