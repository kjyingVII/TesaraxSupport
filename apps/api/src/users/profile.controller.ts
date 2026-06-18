import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentUser } from "../auth/auth.decorators";
import { ChangeOwnPasswordDto } from "./dto/change-own-password.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@Controller("profile")
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: { id: string }) {
    return this.usersService.getProfile(user.id);
  }

  @Patch()
  updateProfile(@CurrentUser() user: { id: string }, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch("password")
  changePassword(@CurrentUser() user: { id: string }, @Body() dto: ChangeOwnPasswordDto) {
    return this.usersService.changeOwnPassword(user.id, dto);
  }
}
