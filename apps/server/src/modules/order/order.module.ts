import { Module } from '@nestjs/common';
import { OrderController, PayNotifyController } from './order.controller';
import { OrderScheduler } from './order.scheduler';
import { OrderService } from './order.service';
import { RefundService } from './refund.service';

@Module({
  controllers: [OrderController, PayNotifyController],
  providers: [OrderService, RefundService, OrderScheduler],
  exports: [OrderService, RefundService],
})
export class OrderModule {}
