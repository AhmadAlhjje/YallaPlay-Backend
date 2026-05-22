import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SportsService } from './sports.service';
import { SportsController } from './sports.controller';
import { Sport, SportSchema } from '../../database/schemas/sport.mongoose-schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Sport.name, schema: SportSchema }]),
  ],
  controllers: [SportsController],
  providers: [SportsService],
  exports: [SportsService, MongooseModule],
})
export class SportsModule implements OnModuleInit {
  constructor(private readonly sportsService: SportsService) {}

  async onModuleInit() {
    await this.sportsService.seedDefaults();
  }
}
