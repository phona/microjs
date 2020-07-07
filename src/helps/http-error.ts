export default class HttpError extends Error {
  status: number
  describe: string

  constructor(status: number, describe: string) {
    if (!describe) {
      describe = `HttpError: ${status}`
    }
    super(describe)
    this.status = status
    this.describe = describe
  }
}
