export class ValidationError extends Error {
  name = 'ValidationError';

  constructor(details) {
    super('The request is invalid.');
    this.details = details;
  }
}

export class NotFoundError extends Error {
  name = 'NotFoundError';

  constructor() {
    super('The item was not found.');
  }
}
