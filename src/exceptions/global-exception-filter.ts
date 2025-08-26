import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException
} from '@nestjs/common';
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
      case exception instanceof BadRequestException:
        message =
          !!exception['response'] &&
          !!exception['response'].message &&
          Array.isArray(exception['response'].message)
            ? exception['response'].message[0]
            : exception['response'].message;
        break;
      case exception instanceof UnauthorizedException:
        message = errorMessages.unAuthorized;
        break;
      case exception instanceof ForbiddenException:
        message = errorMessages.forbiddenException;
        break;
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
