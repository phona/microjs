import HTTPStatusCodes from './http-status-codes'

export default class HttpError extends Error {
  status: number;
  describe: string;

  constructor(status: number, describe: string) {
    if (!describe) {
      describe = HTTPStatusCodes[status].split('_').join(' ') || ''
    }
    super(describe)
    this.status = status
    this.describe = describe
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
