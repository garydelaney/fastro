import { Middleware, Route } from "./types.ts"
import { Handler, ConnInfo } from "./deps.ts"

const NOT_FOUND_STRING = 'URL not found'
const NOT_FOUND_CODE = 404
const UNDEFINED_MIDDLEWARE = 'Undefined middleware'
const EMPTY = ''
const COLON = ':'
const SLASH = '/'
const DOUBLE_SLASH = '//'
const HASHTAG = '#'
const routerMap: Map<string, FinalRoute> = new Map()

let hostname = EMPTY

export interface FinalRoute {
  method: string
  path: string | RegExp
  url: string
  host: string
  middleware: Handler | Middleware
  handler: Handler
}

function initReouterMap(
  map: Map<string, Route>,
  url: string) {
  const [http, path] = url.split(DOUBLE_SLASH)
  const [host] = path.split(SLASH)
  hostname = `${http}${DOUBLE_SLASH}${host}`
  map.forEach((v, k) => {
    const [method, , kpath] = k.split(HASHTAG)
    const key = `${method}:${hostname}${kpath}`
    const route = {
      path: v.path,
      method: v.method,
      handler: v.handler,
      middleware: v.middleware,
      url: `${hostname}${kpath}`,
      host: hostname
    }
    routerMap.set(key, route)
  })
  map.clear()
}

export function createHandler(map: Map<string, Route>) {
  return function (
    req: Request, connInfo: ConnInfo
  ): Response | Promise<Response> {
    return handleRequest(req, connInfo, map)
  }
}

function handleRequest(
  req: Request,
  connInfo: ConnInfo,
  map: Map<string, Route>,
): Response | Promise<Response> {

  if (routerMap.size < 1) {
    initReouterMap(map, req.url)
  }

  const k = createMapKey(req)
  const route = routerMap.get(k)
  if (!route) return new Response(NOT_FOUND_STRING, { status: NOT_FOUND_CODE })
  if (!route?.handler) {
    const handler: Handler = <Handler>route?.middleware
    return handler(req, connInfo)
  }

  const done = handleMiddleware(req, connInfo, route?.middleware)
  if (done) {
    return route?.handler(req, connInfo)
  }

  return new Response(NOT_FOUND_STRING, { status: NOT_FOUND_CODE })
}

const handleMiddleware = (req: Request, connInfo: ConnInfo, middleware?: Middleware) => {
  if (!middleware) {
    throw new Error(UNDEFINED_MIDDLEWARE)
  }
  let done = false
  middleware(req, connInfo, (err) => {
    if (err) {
      throw err
    }
    done = true
  })
  return done
}

function createMapKey(req: Request): string {
  let result = EMPTY
  routerMap.forEach((v) => {
    if (v.method === req.method && validateURL(v.url, req.url, v.host)) {
      result = `${req.method}${COLON}${v.url}`
    }
  })
  return result
}

function validateURL(routeURL: string, incomingURL: string, host: string) {
  const routePath = routeURL.replace(host, EMPTY).split(SLASH)
  const incomingPath = incomingURL.replace(host, EMPTY).split(SLASH)
  if (routePath.length != incomingPath.length) return false
  return parsePath(routePath, incomingPath)
}

function parsePath(route: string[], incoming: string[]) {
  route.shift(); incoming.shift()
  for (let idx = 0; idx < route.length; idx++) {
    const path = route[idx]
    if (!isValidPath(path, incoming, idx)) return false
  }
  return true
}

function isValidPath(path: string, incoming: string[], idx: number) {
  return (path === incoming[idx] || regex(incoming[idx], path))
}

function regex(_incoming: string, path: string) {
  if (path.charAt(0) === COLON) return true
  return false
}

function getRoute(req: Request): string {
  let result = EMPTY
  routerMap.forEach((v) => {
    if (v.method === req.method && validateURL(v.url, req.url, v.host)) {
      result = `${v.url}`
    }
  })
  return result
}

function extractParams(req: Request) {
  const routeParams = getRoute(req).replace(hostname, EMPTY).split(SLASH)
  const params = req.url.replace(hostname, EMPTY).split(SLASH)
  routeParams.shift(); params.shift()
  return routeParams
    .map((param, index) => { return { param, index } })
    .filter((val) => val.param.charAt(0) === COLON)
    .map((val) => {
      return {
        name: val.param.replace(COLON, EMPTY),
        value: params[val.index]
      }
    })
}

export function getParams(req: Request) {
  // deno-lint-ignore no-explicit-any
  const obj: any = {}
  extractParams(req).forEach((val) => obj[val.name] = val.value)
  return obj
}

export function getParam(name: string, req: Request) {
  const [res] = extractParams(req).filter((val) => val.name === name)
  return res.value
}
