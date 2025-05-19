import type { PaginationQueryDto } from "@/dto/shared.dto";
import type { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      query: PaginationQueryDto & Record<string, any>;
      pagination?: { page: number; limit: number };
    }
  }
}
