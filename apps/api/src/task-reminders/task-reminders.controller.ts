import { Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { Roles } from "../auth/auth.decorators";
import { TaskRemindersService } from "./task-reminders.service";

@Roles(UserRole.ADMIN)
@Controller("admin/task-reminders")
export class TaskRemindersController {
  constructor(private readonly taskRemindersService: TaskRemindersService) {}

  @Get("staff")
  listStaff() {
    return this.taskRemindersService.listStaffReminderTargets();
  }

  @Post("staff/:userId/send")
  sendStaffReminder(@Param("userId") userId: string) {
    return this.taskRemindersService.sendManualReminder(userId);
  }
}
