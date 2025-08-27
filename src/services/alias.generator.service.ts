import { Injectable } from '@nestjs/common';
import { base62Encode } from 'src/utils/base62.utils';
import { CounterIncrementorService } from './counter.incrementor.service';

@Injectable()
export class AliasGeneratorService {
  constructor(private readonly counterIncrementorService: CounterIncrementorService) {}

  public async generateAlias(): Promise<string> {
    const counter = await this.counterIncrementorService.incrementCounter();
    return base62Encode(counter);
  }
}
