import { Module } from '@nestjs/common';
import { CUSTOMER_REPOSITORY } from './domain/customer.repository';
import { PrismaCustomerRepository } from './infra/prisma-customer.repository';
import { CustomersService } from './application/customers.service';
import { CustomersController } from './presentation/customers.controller';

@Module({
  controllers: [CustomersController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: PrismaCustomerRepository },
    CustomersService,
  ],
  exports: [CUSTOMER_REPOSITORY],
})
export class CustomersModule {}
