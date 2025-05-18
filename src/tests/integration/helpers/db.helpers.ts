import { prisma } from "@/db/client";

export const clearDatabase = async () => {
  try {
    await prisma.bookAuthor.deleteMany({});

    await prisma.book.deleteMany({});
    await prisma.author.deleteMany({});
    await prisma.user.deleteMany({});
  } catch (error) {
    console.error("Failed to clear database:", error);
    throw error;
  }
};

export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};

export const createTestUserInDb = async (userData: {
  email: string;
  passwordHash: string;
  name?: string;
}) => {
  return prisma.user.create({
    data: {
      email: userData.email,
      password: userData.passwordHash,
      name: userData.name,
    },
  });
};
