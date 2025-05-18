import { prisma } from "@/db/client";
import type { RegisterUserDto } from "@/dto/auth.dto";
import type { Prisma } from "@prisma/client";

class UserDao {
  async createUser(userData: RegisterUserDto & { passwordHash: string }) {
    return prisma.user.create({
      data: {
        email: userData.email,
        password: userData.passwordHash,
        name: userData.name,
      },
    });
  }

  async findUserByEmail(email: string) {
    if (!email) return null;
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findUserById(id: string, include?: Prisma.UserInclude) {
    if (!id) return null;
    return prisma.user.findUnique({
      where: { id },
      include,
    });
  }
}

export default new UserDao();
