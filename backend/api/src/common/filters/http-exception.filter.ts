import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : null;

    if (!(exception instanceof HttpException)) {
      this.logger.error('Unhandled exception', exception);
    }

    response
      .status(status)
      .json(this.createResponseBody(status, exceptionResponse, request.originalUrl));
  }

  private createResponseBody(
    status: number,
    exceptionResponse: string | object | null,
    path: string,
  ): ErrorResponseBody {
    const fallbackMessage = status === 500 ? 'Internal server error' : 'Request failed';
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (this.readMessage(exceptionResponse) ?? fallbackMessage);

    return {
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'Error',
      path,
      timestamp: new Date().toISOString(),
    };
  }

  private readMessage(response: object | null): string | string[] | undefined {
    if (response === null || !('message' in response)) {
      return undefined;
    }

    const message = response.message;
    return typeof message === 'string' || Array.isArray(message) ? message : undefined;
  }
}
