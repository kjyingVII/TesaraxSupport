import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";

type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
  exp: number;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async login(dto: LoginDto) {
    const email = this.requiredString(dto.email, "Email is required.").toLowerCase();
    const password = this.requiredString(dto.password, "Password is required.");

    const user = await this.prisma.user.findUnique({
      where: { email }
    });

    if (!user || !user.isActive || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException("Invalid email or password.");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = this.signToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12
    });

    return {
      data: {
        accessToken: token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role
        }
      }
    };
  }

  async me(authorization?: string) {
    const user = await this.getUserFromAuthorization(authorization);

    return { data: user };
  }

  async getUserFromAuthorization(authorization?: string) {
    const payload = this.verifyAuthorizationHeader(authorization);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Session is no longer valid.");
    }

    return user;
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString("base64url");
    const iterations = 120000;
    const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url");
    return `pbkdf2$${iterations}$${salt}$${hash}`;
  }

  verifyUserPassword(password: string, storedHash: string) {
    return this.verifyPassword(password, storedHash);
  }

  private verifyPassword(password: string, storedHash: string) {
    if (storedHash === "dev-placeholder") {
      return password === "password123";
    }

    const [scheme, iterationsValue, salt, expectedHash] = storedHash.split("$");
    if (scheme !== "pbkdf2" || !iterationsValue || !salt || !expectedHash) return false;

    const iterations = Number(iterationsValue);
    if (!Number.isInteger(iterations) || iterations < 1) return false;

    const actual = Buffer.from(
      pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("base64url")
    );
    const expected = Buffer.from(expectedHash);

    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private signToken(payload: TokenPayload) {
    const header = this.base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const body = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.createSignature(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }

  private verifyAuthorizationHeader(authorization?: string) {
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("Missing bearer token.");
    }

    const token = authorization.slice("Bearer ".length);
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) {
      throw new UnauthorizedException("Invalid token.");
    }

    const expectedSignature = this.createSignature(`${header}.${body}`);
    const actual = Buffer.from(signature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Invalid token signature.");
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException("Session has expired.");
    }

    return payload;
  }

  private createSignature(value: string) {
    return createHmac("sha256", process.env.JWT_ACCESS_SECRET ?? "local-dev-access-secret")
      .update(value)
      .digest("base64url");
  }

  private base64UrlEncode(value: string) {
    return Buffer.from(value).toString("base64url");
  }

  private requiredString(value: string | undefined, message: string) {
    const cleaned = value?.trim();
    if (!cleaned) {
      throw new BadRequestException(message);
    }
    return cleaned;
  }
}
