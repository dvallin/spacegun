import { createServer, Context, Next, MiddleWare, createRouter, createViews } from './server'
import { PromiseProvider } from './model/PromiseProvider'
import { ComponentConfiguration } from './component'
import { Methods } from './model/Methods'
import { ResourceConfiguration } from './resource'
import { Params } from './model/Params'
import { path } from '.'

function handle<S, T>(procedure: PromiseProvider<S, T>, configuration: ComponentConfiguration<S>): MiddleWare {
    return async (context: Context, next: Next) => {
        let mappedInput = undefined
        if (configuration.mapper) {
            mappedInput = configuration.mapper({ params: context.query as Params, data: context.request.body })
        }
        const output = await procedure(mappedInput)
        context.body = JSON.stringify(output)
        context.status = 200
        context.type = 'application/json'
        return await next()
    }
}

export const server = createServer()
export const router = createRouter()
export const views = createViews()
server.use(async (context, next) => {
    try {
        await next()
        if (context.status === 404) {
            console.warn(context)
        }
    } catch (err) {
        console.error(err)
    }
})

export let serverPort: number | undefined
export let serverHost: string | undefined

export function init(host: string, port: number) {
    serverHost = host
    serverPort = port
}

export function register<S, T>(procedureName: string, procedure: PromiseProvider<S, T>, configuration: ComponentConfiguration<S>) {
    const url = `/api/${path(configuration.moduleName, procedureName)}`
    if (configuration.method === Methods.Post) {
        router.post(url, handle(procedure, configuration))
    } else if (configuration.method === Methods.Put) {
        router.put(url, handle(procedure, configuration))
    } else {
        router.get(url, handle(procedure, configuration))
    }
}

export function build() {
    server
        .use(views.templateEngine(__dirname + '/views'))
        .use(router.routes())
        .use(router.allowedMethods())
}

export function registerResource(
    configuration: ResourceConfiguration,
    procedureName: string,
    procedure: PromiseProvider<object | undefined, object>
) {
    views.register(router, {
        filename: procedureName,
        path: configuration.path,
        params: async (p: object) => await procedure(p),
    })
}

export function listen() {
    server.listen(serverPort!)
}
