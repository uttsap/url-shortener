import { ModelCreateParams } from 'lib/postgres/models/BaseModel';

export class ShortUrl {
  id?: number;
  createdAt: Date;
  expiryTime: Date;
  clickCount?: number;
  alias?: string;
  url: string;

  constructor(pojo: ModelCreateParams<ShortUrl, 'id' | 'createdAt'>) {
    const { id, expiryTime, clickCount, alias, url, createdAt = new Date() } = pojo;
    this.id = id;
    this.expiryTime = expiryTime;
    this.clickCount = clickCount;
    this.alias = alias;
    this.url = url;
    this.createdAt = createdAt;
  }
}
