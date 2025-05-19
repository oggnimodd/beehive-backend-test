import { prisma } from "@/db/client";
import type { CreateAuthorDto, UpdateAuthorDto } from "@/dto/author.dto";
import type { Author, Prisma } from "@prisma/client";

class AuthorDao {
  async createAuthor(authorData: CreateAuthorDto, userId: string) {
    return prisma.author.create({
      data: {
        name: authorData.name,
        bio: authorData.bio,
        createdById: userId,
      },
    });
  }

  async findAuthorById(
    id: string,
    requestingUserId?: string
  ): Promise<(Author & { isFavorite?: boolean }) | null> {
    if (!id) return null;

    const authorData = await prisma.author.findUnique({
      where: { id },
      include: {
        ...(requestingUserId && {
          favoritedBy: {
            where: { id: requestingUserId },
            select: { id: true },
          },
        }),
      },
    });

    if (!authorData) return null;

    if (requestingUserId) {
      const { favoritedBy, ...restOfAuthor } = authorData as any;
      return {
        ...restOfAuthor,
        isFavorite: favoritedBy && favoritedBy.length > 0,
      };
    }

    const { favoritedBy, ...restOfAuthor } = authorData as any;
    return { ...restOfAuthor, isFavorite: undefined };
  }

  async findAuthorsByName(name: string, createdById?: string, limit = 10) {
    if (!name) return [];
    const where: Prisma.AuthorWhereInput = {
      name: { contains: name, mode: "insensitive" },
    };
    if (createdById) {
      where.createdById = createdById;
    }
    return prisma.author.findMany({
      where,
      take: limit,
      orderBy: { name: "asc" },
    });
  }

  async findAllAuthors(
    page: number,
    limit: number,
    sortBy?: string,
    search?: string,
    filterByCreatedById?: string,
    requestingUserId?: string
  ): Promise<{
    authors: (Author & { isFavorite?: boolean })[];
    totalItems: number;
  }> {
    const skip = (page - 1) * limit;
    const orderBy: Prisma.AuthorOrderByWithRelationInput[] = [];
    if (sortBy) {
      const [field, direction] = sortBy.split(":") as [
        keyof Prisma.AuthorOrderByWithRelationInput,
        "asc" | "desc",
      ];
      if (
        field &&
        (direction === "asc" || direction === "desc") &&
        Object.keys(prisma.author.fields).includes(field as string)
      ) {
        orderBy.push({ [field]: direction });
      } else {
        orderBy.push({ createdAt: "desc" });
      }
    } else {
      orderBy.push({ createdAt: "desc" });
    }

    const where: Prisma.AuthorWhereInput = {};
    if (filterByCreatedById) {
      where.createdById = filterByCreatedById;
    }

    if (search) {
      const searchCondition = {
        OR: [
          {
            name: { contains: search, mode: "insensitive" as Prisma.QueryMode },
          },
          {
            bio: { contains: search, mode: "insensitive" as Prisma.QueryMode },
          },
        ],
      };
      where.OR = searchCondition.OR;
    }

    const authorsFromDb = await prisma.author.findMany({
      skip,
      take: limit,
      orderBy,
      where,
      include: {
        ...(requestingUserId && {
          favoritedBy: {
            where: { id: requestingUserId },
            select: { id: true },
          },
        }),
      },
    });

    const authorsWithFavoriteStatus = authorsFromDb.map((authorData) => {
      if (requestingUserId) {
        const { favoritedBy, ...restOfAuthor } = authorData as any;
        return {
          ...restOfAuthor,
          isFavorite: favoritedBy && favoritedBy.length > 0,
        };
      }
      const { favoritedBy, ...restOfAuthor } = authorData as any;
      return { ...restOfAuthor, isFavorite: undefined };
    });

    const totalItems = await prisma.author.count({ where });
    return { authors: authorsWithFavoriteStatus, totalItems };
  }

  async updateAuthor(id: string, authorData: UpdateAuthorDto) {
    const dataToUpdate: Prisma.AuthorUpdateInput = {};
    if (authorData.name !== undefined) {
      dataToUpdate.name = authorData.name;
    }
    if (authorData.bio !== undefined) {
      dataToUpdate.bio = authorData.bio;
    }
    return prisma.author.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async deleteAuthor(id: string) {
    return prisma.author.delete({
      where: { id },
    });
  }
}

export default new AuthorDao();
