import { Body, Controller, Param, Post, Req, Res } from '@nestjs/common';
import { Get } from '@nestjs/common/decorators';
import type { Request, Response } from 'express';
import { UrlService } from 'src/services/url.service';
import { CreateShortUrlRequest } from '../requests/create-shorturl.request';

@Controller()
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  @Post('/shorten')
  async createShortUrl(@Body() createShortUrlRequest: CreateShortUrlRequest) {
    const shortUrl = await this.urlService.createShortUrl(createShortUrlRequest);
    return shortUrl;
  }

  @Get(':alias')
  async redirect(
    @Param('alias') alias: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const url = await this.urlService.getUrl(alias, req);
    return res.redirect(url);
  }
}
