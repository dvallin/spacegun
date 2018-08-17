import { Layers } from "@/dispatcher/model/Layers"

export interface Next {
    (): Promise<any>;
}

export interface Context {
    request: { body: any }
    query: object
    body?: any
    type?: string
    status?: number
}

export type MiddleWare = (context: Context, next: Next) => void

export interface Server {
    use(handler: MiddleWare): Server
    listen(port: number): void
}

export interface Router {
    get(path: string, handler: MiddleWare): void
    post(path: string, handler: MiddleWare): void
    put(path: string, handler: MiddleWare): void
    routes(): MiddleWare
    allowedMethods(): MiddleWare
}

export function createServer(): Server {
    let server: Server
    if (process.env.LAYER === Layers.Server) {
        const koa = require("koa")
        const koaBody = require("koa-body")
        const app = new koa()
        app.use(koaBody({
            jsonLimit: "1kb"
        }))
        server = app as Server
    } else {
        server = {
            use: () => server,
            listen: () => { }
        }
    }
    return server
}

export function createRouter(): Router {
    let router: Router
    if (process.env.LAYER === Layers.Client) {
        router = {
            get: () => { },
            post: () => { },
            put: () => { },
            routes: () => (() => { }),
            allowedMethods: () => (() => { }),
        }
    } else {
        const koaRouter = require("koa-router")
        router = new koaRouter() as Router
    }
    return router
}
