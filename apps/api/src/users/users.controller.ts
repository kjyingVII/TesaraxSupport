import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { CreateUserDto } from "./dto/create-user.dto";
import { ResetUserPasswordDto } from "./dto/reset-user-password.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Roles(UserRole.ADMIN)
@Controller("admin/users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("isActive") isActive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.usersService.list({
      search,
      role,
      isActive,
      page,
      pageSize
    });
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: { id: string }) {
    return this.usersService.create(dto, user.id);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.usersService.getById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: { id: string }) {
    return this.usersService.update(id, dto, user.id);
  }

  @Patch(":id/password")
  resetPassword(@Param("id") id: string, @Body() dto: ResetUserPasswordDto, @CurrentUser() user: { id: string }) {
    return this.usersService.resetPassword(id, dto, user.id);
  }
}
