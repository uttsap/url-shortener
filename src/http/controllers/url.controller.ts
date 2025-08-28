import { Body, Controller, Post } from "@nestjs/common";
import { UrlService } from "src/services/url.service";
import { CreateShortUrlRequest } from "../requests/create-shorturl.request";

@Controller('/shorten')
export class UrlController {
    constructor(private readonly urlService: UrlService) {
    }

    @Post()
    async createShortUrl(@Body() createShortUrlRequest: CreateShortUrlRequest) {
        const shortUrl = await this.urlService.createShortUrl(createShortUrlRequest);
        return shortUrl;
    }
}
