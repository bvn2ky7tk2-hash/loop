import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: Record<string, string[]> | undefined;
    let data: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b['message'] as string) || message;
        if (Array.isArray(b['message'])) {
          message = 'Validation failed';
          errors = { validation: b['message'] as string[] };
        }
        // Pass through structured conflict data (allocation conflicts)
        if (b['hasConflict']) {
          message = 'Xung đột phân bổ nguồn lực';
          data = { hasConflict: b['hasConflict'], conflicts: b['conflicts'] as unknown[] };
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const prismaErr = exception as Prisma.PrismaClientKnownRequestError;
      if (prismaErr.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        message = 'Dữ liệu đã tồn tại';
      } else if (prismaErr.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        message = 'Không tìm thấy dữ liệu';
      } else if (prismaErr.code === 'P2003') {
        // Foreign key constraint failed
        status = HttpStatus.CONFLICT;
        message = 'Không thể thực hiện vì dữ liệu liên quan vẫn còn tồn tại';
      } else if (prismaErr.code === 'P2011') {
        // Null constraint violation
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        message = 'Trường bắt buộc không được để trống';
      } else if (prismaErr.code === 'P2014') {
        // Required relation violation
        status = HttpStatus.CONFLICT;
        message = 'Vi phạm ràng buộc quan hệ dữ liệu';
      } else if (prismaErr.code === 'P2015') {
        // Related record not found
        status = HttpStatus.NOT_FOUND;
        message = 'Không tìm thấy dữ liệu liên quan';
      }
    } else {
      this.logger.error('Unhandled exception', exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(errors && { errors }),
      ...(data && { data }),
      timestamp: new Date().toISOString(),
    });
  }
}
