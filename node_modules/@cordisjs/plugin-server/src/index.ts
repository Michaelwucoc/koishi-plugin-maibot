import { Context, Service } from 'cordis'
import { makeArray, MaybeArray, remove, trimSlash } from 'cosmokit'
import { createServer, Server as HTTPServer, IncomingMessage } from 'node:http'
import { pathToRegexp } from 'path-to-regexp'
import { koaBody } from 'koa-body'
import parseUrl from 'parseurl'
import { WebSocket, WebSocketServer } from 'ws'
import Schema from 'schemastery'
import KoaRouter from '@koa/router'
import Koa, { Middleware } from 'koa'
import { listen } from './listen'

export {} from 'koa-body'

declare module 'cordis' {
  interface Context {
    [Context.Server]: Context.Server<this>
    server: Server & this[typeof Context.Server]
  }

  interface Events {
    'server/ready'(this: Server): void
  }

  namespace Context {
    const Server: unique symbol
    // https://github.com/typescript-eslint/typescript-eslint/issues/6720
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    interface Server<C extends Context = Context> {}
  }
}

type WebSocketCallback = (socket: WebSocket, request: IncomingMessage) => void

export class WebSocketLayer {
  clients = new Set<WebSocket>()
  regexp: RegExp

  constructor(private server: Server, path: MaybeArray<string | RegExp>, public callback?: WebSocketCallback) {
    this.regexp = pathToRegexp(path)
  }

  accept(socket: WebSocket, request: IncomingMessage) {
    if (!this.regexp.test(parseUrl(request)!.pathname!)) return
    this.clients.add(socket)
    socket.addEventListener('close', () => {
      this.clients.delete(socket)
    })
    this.callback?.(socket, request)
    return true
  }

  close() {
    remove(this.server.wsStack, this)
    for (const socket of this.clients) {
      socket.close()
    }
  }
}

export class Server extends KoaRouter {
  [Service.tracker] = {
    associate: 'server',
    property: 'ctx',
  }
  
  public _http: HTTPServer
  public _ws: WebSocketServer
  public wsStack: WebSocketLayer[] = []
  public _koa = new Koa()
  public _body: Middleware

  public host!: string
  public port!: number

  constructor(protected ctx: Context, public config: Server.Config) {
    super()
    ctx.runtime.name = 'server'
    ctx.provide('server')
    ctx.alias('server', ['router'])

    // create server
    const body = koaBody({
      multipart: true,
      jsonLimit: '10mb',
      formLimit: '10mb',
      textLimit: '10mb',
      includeUnparsed: true,
    })
    // ensure body parser is only applied once
    this._body = async (c, next) => {
      if (c[Symbol.for('isBodyParsed')]) return next()
      c[Symbol.for('isBodyParsed')] = true
      await body(c, next)
    }
    this._koa.use(this.routes())
    this._koa.use(this.allowedMethods())

    this._http = createServer(this._koa.callback())
    this._ws = new WebSocketServer({
      server: this._http,
    })

    this._ws.on('connection', (socket, request) => {
      for (const manager of this.wsStack) {
        if (manager.accept(socket, request)) return
      }
      socket.close()
    })

    ctx.decline(['selfUrl', 'host', 'port', 'maxPort'])

    if (config.selfUrl) {
      config.selfUrl = trimSlash(config.selfUrl)
    }

    ctx.on('ready', async () => {
      const { host = '127.0.0.1', port } = config
      if (!port) return
      this.host = host
      this.port = await listen(config)
      this._http.listen(this.port, host)
      this.ctx.logger.info('server listening at %c', `http://${host}:${this.port}`)
      ctx.emit(this, 'server/ready')
    }, true)

    ctx.on('dispose', () => {
      if (config.port) {
        this.ctx.logger.info('server closing')
      }
      this._ws?.close()
      this._http?.close()
    })

    const self = Context.associate(this, 'server')
    ctx.set('server', self)
    ctx.on('internal/listener', function (name: string, listener: Function) {
      if (name !== 'server/ready' || !self[Context.filter](this) || !self.port) return
      this.scope.ensure(async () => listener())
      return () => false
    })

    return self
  }

  [Context.filter](ctx: Context) {
    return ctx[Context.isolate].server === this.ctx[Context.isolate].server
  }

  get selfUrl() {
    const wildcard = ['0.0.0.0', '::']
    const host = wildcard.includes(this.host) ? '127.0.0.1' : this.host
    if (this.port === 80) {
      return `http://${host}`
    } else if (this.port === 443) {
      return `https://${host}`
    } else {
      return `http://${host}:${this.port}`
    }
  }

  /**
   * hack into router methods to make sure that koa middlewares are disposable
   */
  register(...args: Parameters<KoaRouter['register']>) {
    args[2] = makeArray(args[2])
    if (!args[2][0][Symbol.for('noParseBody')]) {
      args[2].unshift(this._body)
    }
    const layer = super.register(...args)
    this.ctx.scope.disposables.push(() => {
      remove(this.stack, layer)
    })
    return layer
  }

  ws(path: MaybeArray<string | RegExp>, callback?: WebSocketCallback) {
    const layer = new WebSocketLayer(this, path, callback)
    this.wsStack.push(layer)
    this.ctx.scope.disposables.push(() => layer.close())
    return layer
  }
}

export namespace Server {
  export interface Config {
    host: string
    port: number
    maxPort?: number
    selfUrl?: string
  }

  export const Config: Schema<Config> = Schema.object({
    host: Schema.string().default('127.0.0.1').description('要监听的 IP 地址。如果将此设置为 `0.0.0.0` 将监听所有地址，包括局域网和公网地址。'),
    port: Schema.natural().max(65535).description('要监听的初始端口号。'),
    maxPort: Schema.natural().max(65535).description('允许监听的最大端口号。'),
    selfUrl: Schema.string().role('link').description('应用暴露在公网的地址。'),
  })
}

export default Server
