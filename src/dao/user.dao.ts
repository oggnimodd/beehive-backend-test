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
        favoriteAuthorIds: [],
        favoriteBookIds: [],
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

  async addAuthorToFavorites(userId: string, authorId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        favoriteAuthorIds: {
          push: authorId,
        },
        favoriteAuthors: {
          connect: { id: authorId },
        },
      },
    });
  }

  async removeAuthorFromFavorites(userId: string, authorId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { favoriteAuthorIds: true },
    });

    if (!user) {
      return null;
    }

    const updatedFavoriteAuthorIds = user.favoriteAuthorIds.filter(
      (id) => id !== authorId
    );

    return prisma.user.update({
      where: { id: userId },
      data: {
        favoriteAuthorIds: {
          set: updatedFavoriteAuthorIds,
        },
        favoriteAuthors: {
          disconnect: { id: authorId },
        },
      },
    });
  }

  async addBookToFavorites(userId: string, bookId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        favoriteBookIds: {
          push: bookId,
        },
        favoriteBooks: {
          connect: { id: bookId },
        },
      },
    });
  }

  async removeBookFromFavorites(userId: string, bookId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { favoriteBookIds: true },
    });

    if (!user) {
      return null;
    }

    const updatedFavoriteBookIds = user.favoriteBookIds.filter(
      (id) => id !== bookId
    );

    return prisma.user.update({
      where: { id: userId },
      data: {
        favoriteBookIds: {
          set: updatedFavoriteBookIds,
        },
        favoriteBooks: {
          disconnect: { id: bookId },
        },
      },
    });
  }
}

export default new UserDao();
