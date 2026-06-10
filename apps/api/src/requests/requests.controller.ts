import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { Role } from '@desk2desk/shared';
import { RequestsService } from './requests.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ProviderGuard } from '../common/guards/provider.guard';
import { User } from '../entities';
import {
  CreateCommentDto,
  CreateRequestDto,
  ReassignDto,
} from './dto/request.dto';
import { uploadOptions } from './attachment.util';

@Controller('requests')
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateRequestDto) {
    return this.requestsService.create(user, dto);
  }

  @Get('mine')
  listMine(@CurrentUser() user: User) {
    return this.requestsService.listMine(user);
  }

  @Get('available')
  @UseGuards(ProviderGuard)
  listAvailable(@CurrentUser() user: User) {
    return this.requestsService.listAvailable(user);
  }

  @Get('assigned')
  @UseGuards(ProviderGuard)
  listAssigned(@CurrentUser() user: User) {
    return this.requestsService.listAssigned(user);
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  listAll() {
    return this.requestsService.listAll();
  }

  @Get('stats')
  stats(@CurrentUser() user: User) {
    return this.requestsService.stats(user);
  }

  @Get('history')
  @UseGuards(ProviderGuard)
  history(
    @CurrentUser() user: User,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.requestsService.history(user, from, to);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.requestsService.getOne(id, user);
  }

  @Post(':id/claim')
  claim(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.requestsService.claim(id, user);
  }

  @Post(':id/resolve')
  resolve(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.requestsService.resolve(id, user);
  }

  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.requestsService.confirmClose(id, user);
  }

  @Post(':id/reopen')
  reopen(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.requestsService.reopen(id, user);
  }

  @Post(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.requestsService.cancel(id, user);
  }

  @Post(':id/comments')
  addComment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto,
  ) {
    return this.requestsService.addComment(id, user, dto);
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  addAttachment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.requestsService.addAttachment(id, user, file);
  }

  @Get(':id/attachments/:attachmentId/download')
  async downloadAttachment(
    @Param('id', ParseIntPipe) id: number,
    @Param('attachmentId', ParseIntPipe) attachmentId: number,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { absPath, fileName, mimeType } =
      await this.requestsService.getAttachmentForDownload(
        id,
        attachmentId,
        user,
      );
    res.setHeader('Content-Type', mimeType);
    res.download(absPath, fileName);
  }

  @Post(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  reassign(@Param('id', ParseIntPipe) id: number, @Body() dto: ReassignDto) {
    return this.requestsService.reassign(id, dto);
  }
}
