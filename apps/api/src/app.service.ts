import { Injectable, Logger } from '@nestjs/common';
import { handleServiceError } from './common/utils/service-error';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHello(): string {
    try {
      return 'Hello World!';
    } catch (error: unknown) {
      handleServiceError(this.logger, 'AppService.getHello', error);
    }
  }
}
