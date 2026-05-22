import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SportsService } from './sports.service';

@ApiTags('Sports')
@Controller('sports')
export class SportsController {
  constructor(private readonly sportsService: SportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active sports (public)' })
  @ApiQuery({ name: 'all', required: false, type: Boolean, description: 'Include inactive sports (admin use)' })
  async findAll(@Query('all') all?: string) {
    const onlyActive = all !== 'true';
    return this.sportsService.findAll(onlyActive);
  }
}
