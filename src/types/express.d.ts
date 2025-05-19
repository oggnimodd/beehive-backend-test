import type { User } from "@prisma/client";
import type { PaginationQueryDto } from "@/dto/shared.dto";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      query: PaginationQueryDto & Record<string, any>;
    }
  }
}
