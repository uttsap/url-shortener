import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Response } from 'express';
import * as errorMessages from '../constants/errorMessage.json';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    let message = '';
    const status = exception.status ? exception.status : HttpStatus.INTERNAL_SERVER_ERROR;

    switch (true) {
      case exception instanceof ThrottlerException:
        message = 'Too many requests from this IP, please try again later.';
        break;
      case exception instanceof BadRequestException: {
        const res = exception.getResponse();
        let msg: string | undefined;
        if (typeof res === 'string') {
          msg = res;
        } else if (Array.isArray((res as unknown as { message: string[] }).message)) {
          msg = (res as unknown as { message: string[] }).message[0];
        } else {
          msg = (res as unknown as { message: string }).message;
        }
        message = msg ?? 'Bad Request';
        break;
      }

      case exception instanceof NotFoundException:
        message = errorMessages.resourcesNotFound;
        break;
      case exception instanceof ServiceUnavailableException:
        message = errorMessages.serverUnavailable;
        break;
      case exception instanceof HttpException:
        message = errorMessages.serverError;
        break;
      default:
        message = errorMessages.serverError;
        break;
    }

    response.status(status).json({
      message,
      success: false,
      data: {}
    });
  }
}
