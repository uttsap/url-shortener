import { Injectable } from '@nestjs/common';
import { base62Encode } from 'src/utils/base62.utils';
import { CounterService } from './counter.service';

@Injectable()
export class AliasService {
  constructor(private readonly counterService: CounterService) {}

  public async generate(): Promise<string> {
    const counter = await this.counterService.increment();
    return base62Encode(counter);
  }
}
