import UserDao from "@/dao/user.dao";
import type { RegisterUserDto, LoginUserDto } from "@/dto/auth.dto";
import {
  hashPassword,
  comparePassword,
  omitPasswordFromResult,
} from "@/utils/password";
import { signToken, type JwtPayload } from "@/utils/jwt";
import { ErrorMessages } from "@/constants";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "@/errors/error-types";
import { generateSimpleUserObject } from "@/utils/user";

class AuthService {
  async registerUser(userData: RegisterUserDto) {
    const existingUser = await UserDao.findUserByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestError(ErrorMessages.EMAIL_ALREADY_EXISTS);
    }

    const passwordHash = await hashPassword(userData.password);
    const newUser = await UserDao.createUser({ ...userData, passwordHash });

    const tokenPayload: JwtPayload = {
      userId: newUser.id,
      email: newUser.email,
    };

    const token = signToken(tokenPayload);

    return { user: generateSimpleUserObject(newUser), token };
  }

  async loginUser(loginData: LoginUserDto) {
    const user = await UserDao.findUserByEmail(loginData.email);
    if (!user) {
      throw new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS);
    }

    const isPasswordMatch = await comparePassword(
      loginData.password,
      user.password
    );
    if (!isPasswordMatch) {
      throw new UnauthorizedError(ErrorMessages.INVALID_CREDENTIALS);
    }

    const tokenPayload: JwtPayload = { userId: user.id, email: user.email };
    const token = signToken(tokenPayload);

    return { user: generateSimpleUserObject(user), token };
  }

  async getMe(userId: string) {
    const user = await UserDao.findUserById(userId);
    if (!user) {
      throw new NotFoundError(ErrorMessages.USER_FOR_TOKEN_NOT_FOUND);
    }
    return omitPasswordFromResult(user);
  }
}

export default new AuthService();
