import { Body, Controller, Get, Patch } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { UpdateSystemSettingsDto } from "./dto/update-system-settings.dto";
import { SettingsService } from "./settings.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.TECHNICIAN)
  getSystemSettings() {
    return this.settingsService.getSystemSettings();
  }

  @Patch()
  @Roles(UserRole.ADMIN)
  updateSystemSettings(@Body() dto: UpdateSystemSettingsDto, @CurrentUser() user: { id: string }) {
    return this.settingsService.updateSystemSettings(dto, user.id);
  }
}
