import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      success: true,
      data: {
        service: 'teaching-management-system-be',
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
