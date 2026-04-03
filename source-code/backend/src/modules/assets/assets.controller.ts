import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { assetImageMulterOptions } from './asset-upload.options';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@ApiTags('assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách asset theo project' })
  @ApiQuery({
    name: 'projectId',
    required: true,
    description: 'Mongo ObjectId project',
  })
  list(
    @Query('projectId') projectId: string,
    @CurrentUser() user: { sub: string } | undefined,
  ) {
    if (!projectId?.trim()) {
      throw new BadRequestException('Thiếu projectId (query)');
    }
    if (!user?.sub) {
      throw new UnauthorizedException();
    }
    return this.assetsService.listByProject(projectId.trim());
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload ảnh (PNG/JPEG/GIF/WebP, tối đa 5MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'projectId',
    required: true,
    description: 'Mongo ObjectId project',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', assetImageMulterOptions))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Query('projectId') projectId: string,
    @CurrentUser() user: { sub: string } | undefined,
  ) {
    if (!file) {
      throw new BadRequestException('Thiếu file (field name: file)');
    }
    if (!projectId?.trim()) {
      throw new BadRequestException('Thiếu projectId (query)');
    }
    if (!user?.sub) {
      throw new UnauthorizedException();
    }
    return this.assetsService.uploadFile(file, user.sub, projectId.trim());
  }

  @Post()
  @ApiOperation({ summary: 'Register asset metadata' })
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.create(dto);
  }
}
