import { ModelCreateParams } from 'lib/postgres/models/BaseModel';

export class ShortUrl {
  id?: number;
  createdAt: Date;
  expiryTime: Date;
  alias?: string;
  url: string;

  constructor(pojo: ModelCreateParams<ShortUrl, 'id' | 'createdAt'>) {
    const { id, expiryTime, alias, url, createdAt = new Date() } = pojo;
    this.id = id;
    this.expiryTime = expiryTime;
    this.alias = alias;
    this.url = url;
    this.createdAt = createdAt;
  }
}
