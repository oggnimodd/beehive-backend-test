import { prisma } from "@/db/client";
import type { CreateBookDto, UpdateBookDto } from "@/dto/book.dto";
import type { Book, Prisma } from "@prisma/client";

class BookDao {
  async createBook(bookData: CreateBookDto, userId: string) {
    return prisma.book.create({
      data: {
        title: bookData.title,
        isbn: bookData.isbn,
        publishedDate: bookData.publishedDate,
        createdById: userId,
        authors: {
          create: bookData.authorIds.map((authorId) => ({
            author: {
              connect: { id: authorId },
            },
          })),
        },
      },
      include: {
        authors: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findBookById(
    id: string,
    requestingUserId?: string
  ): Promise<(Book & { isFavorite?: boolean; authors: any[] }) | null> {
    if (!id) return null;

    const bookData = await prisma.book.findUnique({
      where: { id },
      include: {
        authors: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ...(requestingUserId && {
          favoritedBy: {
            where: { id: requestingUserId },
            select: { id: true },
          },
        }),
      },
    });

    if (!bookData) return null;

    if (requestingUserId) {
      const { favoritedBy, ...restOfBook } = bookData as any;
      return {
        ...restOfBook,
        isFavorite: favoritedBy && favoritedBy.length > 0,
      };
    }

    const { favoritedBy, ...restOfBook } = bookData as any;
    return {
      ...restOfBook,
      isFavorite: undefined,
    };
  }

  async findBookByIsbn(isbn: string): Promise<Book | null> {
    if (!isbn) return null;
    return prisma.book.findUnique({
      where: { isbn },
    });
  }

  async findBooksByTitle(title: string, createdById?: string, limit = 10) {
    if (!title) return [];

    const where: Prisma.BookWhereInput = {
      title: {
        contains: title,
        mode: "insensitive",
      },
    };

    if (createdById) {
      where.createdById = createdById;
    }

    return prisma.book.findMany({
      where,
      take: limit,
      orderBy: { title: "asc" },
      include: {
        authors: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async findAllBooks(
    page: number,
    limit: number,
    sortBy?: string,
    search?: string,
    filterByCreatedById?: string,
    filterByAuthorId?: string,
    requestingUserId?: string
  ): Promise<{
    books: (Book & { isFavorite?: boolean; authors: any[] })[];
    totalItems: number;
  }> {
    const skip = (page - 1) * limit;
    const orderBy: Prisma.BookOrderByWithRelationInput[] = [];

    if (sortBy) {
      const [field, direction] = sortBy.split(":") as [
        keyof Prisma.BookOrderByWithRelationInput,
        "asc" | "desc",
      ];

      if (
        field &&
        (direction === "asc" || direction === "desc") &&
        Object.keys(prisma.book.fields).includes(field as string)
      ) {
        orderBy.push({ [field]: direction });
      } else {
        orderBy.push({ createdAt: "desc" });
      }
    } else {
      orderBy.push({ createdAt: "desc" });
    }

    const where: Prisma.BookWhereInput = {};

    if (filterByCreatedById) {
      where.createdById = filterByCreatedById;
    }

    if (filterByAuthorId) {
      where.authors = {
        some: {
          authorId: filterByAuthorId,
        },
      };
    }

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
        {
          isbn: {
            contains: search,
            mode: "insensitive" as Prisma.QueryMode,
          },
        },
      ];
    }

    const booksFromDb = await prisma.book.findMany({
      skip,
      take: limit,
      orderBy,
      where,
      include: {
        authors: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        ...(requestingUserId && {
          favoritedBy: {
            where: { id: requestingUserId },
            select: { id: true },
          },
        }),
      },
    });

    const booksWithFavoriteStatus = booksFromDb.map((bookData) => {
      if (requestingUserId) {
        const { favoritedBy, ...restOfBook } = bookData as any;
        return {
          ...restOfBook,
          isFavorite: favoritedBy && favoritedBy.length > 0,
        };
      }

      const { favoritedBy, ...restOfBook } = bookData as any;
      return {
        ...restOfBook,
        isFavorite: undefined,
      };
    });

    const totalItems = await prisma.book.count({ where });

    return {
      books: booksWithFavoriteStatus,
      totalItems,
    };
  }

  async updateBook(id: string, bookData: UpdateBookDto) {
    const dataToUpdate: Prisma.BookUpdateInput = {};

    if (bookData.title !== undefined) {
      dataToUpdate.title = bookData.title;
    }

    if (bookData.isbn !== undefined) {
      dataToUpdate.isbn = bookData.isbn;
    }

    if (bookData.publishedDate !== undefined) {
      dataToUpdate.publishedDate = bookData.publishedDate;
    }

    if (!bookData.authorIds) {
      return prisma.book.update({
        where: { id },
        data: dataToUpdate,
        include: {
          authors: {
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    }
    if (bookData.authorIds) {
      return prisma.$transaction(async (tx) => {
        await tx.bookAuthor.deleteMany({
          where: { bookId: id },
        });

        const updatedBook = await tx.book.update({
          where: { id },
          data: {
            ...dataToUpdate,
            authors: {
              create: bookData?.authorIds?.map((authorId) => ({
                author: {
                  connect: { id: authorId },
                },
              })),
            },
          },
          include: {
            authors: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

        return updatedBook;
      });
    }
  }

  async deleteBook(id: string) {
    return prisma.book.delete({
      where: { id },
    });
  }
}

export default new BookDao();
