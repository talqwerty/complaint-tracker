import { Global, Module } from '@nestjs/common';
import { LineService } from './line.service';
import { LineController } from './line.controller';

@Global()
@Module({
  controllers: [LineController],
  providers: [LineService],
  exports: [LineService],
})
export class NotificationsModule {}
