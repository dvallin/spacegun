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
    params: object

    state: any
    render: (value: string, params: object) => {}
}

export type MiddleWare = (context: Context, next: Next) => void

export interface Server {
    use(handler: MiddleWare): Server
    listen(port: number): void
}

export interface View {
    filename: string
    path: string
    params: (p: object) => object
}

export interface Views {
    templateEngine(folder: string): MiddleWare
    register(router: Router, view: View): void
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
        const koaStatic = require("koa-static")
        const app = new koa()
        app.use(koaBody({
            jsonLimit: "1kb"
        }))
        app.use(koaStatic(process.env.ASSET_PATH || __dirname + "/assets"))
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
    if (process.env.LAYER === Layers.Server) {
        const koaRouter = require("koa-router")
        router = new koaRouter() as Router
    } else {
        router = {
            get: () => { },
            post: () => { },
            put: () => { },
            routes: () => (() => { }),
            allowedMethods: () => (() => { }),
        }
    }
    return router
}

export function createViews(): Views {
    let views: Views
    if (process.env.LAYER === Layers.Server) {
        const v = require("koa-views")
        views = {
            templateEngine: (folder: string) => v(folder, { extension: "pug" }),
            register: (router: Router, view: View) => {
                router.get(view.path, async (ctx: Context) => {
                    ctx.state.engine = "pug"
                    const params = await view.params(ctx.params)
                    return ctx.render(view.filename, params)
                })
            }
        }
    } else {
        views = {
            templateEngine: () => (() => { }),
            register: () => { },
        }
    }
    return views
}
