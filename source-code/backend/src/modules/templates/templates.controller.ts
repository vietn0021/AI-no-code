import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { TemplatesService } from './templates.service';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách game templates (dữ liệu cứng)' })
  findAll() {
    return this.templatesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một template theo id' })
  @ApiParam({ name: 'id', example: 'snake' })
  findOne(@Param('id') id: string) {
    return this.templatesService.findOne(id.trim());
  }
}
