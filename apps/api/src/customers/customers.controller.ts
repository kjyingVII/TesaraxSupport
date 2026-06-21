import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerTechniciansDto } from "./dto/update-customer-technicians.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomersService } from "./customers.service";

@Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
@Controller("customers")
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(
    @Query("search") search?: string,
    @Query("isActive") isActive?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string
  ) {
    return this.customersService.list({
      search,
      isActive,
      page,
      pageSize
    });
  }

  @Post()
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Get(":id")
  getById(@Param("id") id: string) {
    return this.customersService.getById(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() user: { id: string }) {
    return this.customersService.update(id, dto, user.id);
  }

  @Get(":id/technicians")
  listTechnicians(@Param("id") id: string) {
    return this.customersService.listTechnicians(id);
  }

  @Patch(":id/technicians")
  updateTechnicians(
    @Param("id") id: string,
    @Body() dto: UpdateCustomerTechniciansDto,
    @CurrentUser() user: { id: string }
  ) {
    return this.customersService.updateTechnicians(id, dto, user.id);
  }

  @Patch(":id/deactivate")
  deactivate(@Param("id") id: string, @CurrentUser() user: { id: string }) {
    return this.customersService.deactivate(id, user.id);
  }
}
