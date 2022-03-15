import { Fastro, Middleware } from './types.ts'
import { Handler, serve, ServeInit } from './deps.ts'
import { Route } from './router.ts'
import { createHandler } from './handler.ts'

interface Options {
  hostname?: string
  port?: number
}

export function fastro(options: Options = {}): Fastro {
  const hostname = options.hostname ?? 'localhost'
  const port = options.port ?? 8000
  const rtr = Route(hostname, port)
  const fstr = {
    serve: (options: ServeInit = {}) => {
      console.log(`Listening on http://${hostname}:${port}`)
      options.port = port
      options.hostname = hostname
      return serve(createHandler(rtr.router), options)
    },
    get: (url: string, opts: Handler | Middleware, handler: Handler) => {
      rtr.get(url, opts, handler)
      return fstr
    },
    post: (url: string, opts: Handler | Middleware, handler: Handler) => {
      rtr.post(url, opts, handler)
      return fstr
    },
    put: (url: string, opts: Handler | Middleware, handler: Handler) => {
      rtr.put(url, opts, handler)
      return fstr
    },
    patch: (url: string, opts: Handler | Middleware, handler: Handler) => {
      rtr.patch(url, opts, handler)
      return fstr
    },
    delete: (url: string, opts: Handler | Middleware, handler: Handler) => {
      rtr.delete(url, opts, handler)
      return fstr
    },
    head: (url: string, opts: Handler | Middleware, handler: Handler) => {
      rtr.head(url, opts, handler)
      return fstr
    },
    options: (url: string, opts: Handler | Middleware, handler: Handler) => {
      rtr.options(url, opts, handler)
      return fstr
    },
  }
  return fstr
}