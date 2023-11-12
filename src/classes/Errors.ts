export class AppError extends Error {
  type: string;
  statusCode: number;
  message: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.type = 'HttpException'
    this.statusCode = statusCode;
    this.message = message;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  type: string;

  constructor(message: string) {
    super(message, 404)
    this.type = 'NotFound';
  }
}

export class DuplicationError extends AppError {
  type: string;

  constructor(message: string) {
    super(message, 409)
    this.type = 'Conflict(Duplication)';
  }
}


export class BadRequestError extends AppError {
  type: string;

  constructor(message: string) {
    super(message, 400)
    this.type = 'BadRequest';
  }
}