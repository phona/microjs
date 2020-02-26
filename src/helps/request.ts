interface ActiveXObject {
  readonly readyState: number;
  readonly status: number;
  readonly responseText: string;
  readonly statusText: string;

  onreadystatechange: ((this: XMLHttpRequest, ev: Event) => any) | null;

  abort(): void;

  setRequestHeader(name: string, value: string): void;

  send(body?: Document | BodyInit | null): void;

  open(method: string, url: string): void;

  open(method: string, url: string, async: boolean, username?: string | null, password?: string | null): void;
}

function getRequest(): XMLHttpRequest | ActiveXObject {
  if (window.XMLHttpRequest) {
    return new XMLHttpRequest();
  } else {
    //遍历IE中不同版本的ActiveX对象
    const versions = ["Microsoft", "msxm3", "msxml2", "msxml1"];
    for (let i = 0; i < versions.length; i++) {
      try {
        const version = versions[i] + ".XMLHTTP";
        return new ActiveXObject(version);
      } catch (e) { }
    }
  }
}

function setDefault(obj: Record<string, string>, key: string, value: string): void {
  obj[key] = obj[key] || value
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop(): void { }

function object2Querystring(obj: object): string {
  const result = []
  for (const key in obj) {
    result.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
  }
  return `?${result.join('&')}`
}

function object2FormData(obj: object): string {
  const result = []
  for (const key in obj) {
    result.push(`${key}=${obj[key]}`)
  }
  return `${result.join('&')}`
}

class HttpRequest {
  private isTimeout: boolean;
  private timeoutFlag: any;

  public constructor() {
    this.isTimeout = false;
    this.timeoutFlag = null;
  }

  public send(params: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    data?: string | Record<string, string | number | object>;
    async?: boolean;
    timeout?: number;
    success?: (content: string) => void;
    error?: (status: number, content: string) => void;
  }): void {
    // Any variable used more than once is var'd here because
    // minification will munge the variables whereas it can't munge
    // the object access.
    const headers = params.headers || {}
      , method = (params.method || 'GET').toUpperCase()
      , async = params.async === undefined ? true : params.async
      , success = params.success || noop
      , error = params.error || noop
      , timeout = params.timeout

    const contentType = headers['Content-Type']
    if (!contentType)
      headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8'

    let url: string
      , body: string
    if (method === 'GET') {
      const data = params.data || ''
      const str = typeof data === 'string' ? data : object2Querystring(data)
      url = params.data ? params.url + str : params.url
      body = null
    } else {
      const data = params.data || ''
      url = params.url
      body = typeof data === 'string' ? data : object2FormData(data)
    }

    const req = getRequest()
    req.open(method, url, async)
    req.onreadystatechange = (): void => {
      if (req.readyState === 4) {
        if (timeout !== undefined) {
          //由于执行abort()方法后，有可能触发onreadystatechange事件，
          //所以设置一个timeout_bool标识，来忽略中止触发的事件。
          if (this.isTimeout) {
            return;
          }
          clearTimeout(this.timeoutFlag);
        }
        if ((req.status >= 200 && req.status < 300) || req.status === 304) {
          success(req.responseText);
        } else {
          error(req.status, req.statusText);
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
        req && req.abort()
      }, timeout)
    }
  }
}

export default function (params: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: string | Record<string, string | number | object>;
  async?: boolean;
  timeout?: number;
  success?: (content: string) => void;
  error?: (status: number, content: string) => void;
}): void {
  const req = new HttpRequest()
  req.send(params)
}
