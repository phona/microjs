import { JSONObject } from './defines'

type ActiveXObject = {
  readonly readyState: number
  readonly status: number
  readonly responseText: string
  readonly statusText: string

  onreadystatechange: ((this: XMLHttpRequest, ev: Event) => any) | null

  abort(): void

  setRequestHeader(name: string, value: string): void

  send(body?: Document | BodyInit | null): void

  open(method: string, url: string, async?: boolean, username?: string | null, password?: string | null): void
}

function getRequest(): XMLHttpRequest | ActiveXObject {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest()
  } else {
    // 遍历IE中不同版本的ActiveX对象
    const versions = ['Microsoft', 'msxm3', 'msxml2', 'msxml1']
    for (const version of versions) {
      try {
        return new ActiveXObject(version + '.XMLHTTP') as ActiveXObject
        // eslint-disable-next-line no-empty
      } catch (e) {}
    }
    return null
  }
}

const noop = (): void => undefined

function JSONObject2QueryString(obj: JSONObject): string {
  const result = []
  for (const key in obj) {
    result.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key].toString())}`)
  }
  return result.join('&')
}

function JSONObject2FormData(obj: JSONObject): string {
  const result = []
  for (const key in obj) {
    result.push(`${key}=${obj[key].toString()}`)
  }
  return `${result.join('&')}`
}

class HttpRequest {
  private isTimeout: boolean
  private timeoutFlag: ReturnType<typeof setTimeout>

  public constructor() {
    this.isTimeout = false
    this.timeoutFlag = null
  }

  public send(params: Config): void {
    // Any variable used more than once is var'd here because
    // minification will munge the variables whereas it can't munge
    // the object access.
    const headers = params.headers || {}
    const method = (params.method || 'GET').toUpperCase()
    const async = params.async === undefined ? true : params.async
    const success = params.success || noop
    const error = params.error || noop
    const timeout = params.timeout

    const contentType = headers['Content-Type']
    if (!contentType) headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'

    let url: string
    let body: string
    if (method === 'GET') {
      const data = params.data || ''
      const str = typeof data === 'string' ? data : '?' + JSONObject2QueryString(data)
      url = params.data ? params.url + str : params.url
      body = null
    } else {
      const data = params.data || ''
      url = params.url
      body = typeof data === 'string' ? data : JSONObject2FormData(data)
    }

    const req = getRequest()
    req.open(method, url, async)
    req.onreadystatechange = (): void => {
      if (req.readyState === 4) {
        if (timeout !== undefined) {
          // 由于执行abort()方法后，有可能触发onreadystatechange事件，
          // 所以设置一个timeout_bool标识，来忽略中止触发的事件。
          if (this.isTimeout) {
            return
          }
          clearTimeout(this.timeoutFlag)
        }
        if ((req.status >= 200 && req.status < 300) || req.status === 304) {
          success(req.responseText)
        } else {
          error(req.status, req.statusText)
        }
      }
    }

    // if (body) {
    //   setDefault(headers, 'X-Requested-With', 'XMLHttpRequest')
    // }

    for (const field in headers) {
      req.setRequestHeader(field, headers[field])
    }

    req.send(body)

    if (timeout) {
      this.timeoutFlag = setTimeout(() => {
        this.isTimeout = true
        if (req) {
          req.abort()
        }
      }, timeout)
    }
  }
}

export type Config = {
  url: string
  method?: string
  headers?: Record<string, string>
  data?: JSONObject | string
  async?: boolean
  timeout?: number
  success?: (content: string) => void
  error?: (status: number, content: string) => void
}

export default function (params: Config): void {
  const req = new HttpRequest()
  req.send(params)
}
