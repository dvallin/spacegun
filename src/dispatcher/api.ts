import { path } from "@/dispatcher"
import { createServer, Context, Next, MiddleWare, createRouter } from "@/dispatcher/server"
import { PromiseProvider } from "@/dispatcher/model/PromiseProvider"
import { ComponentConfiguration } from "@/dispatcher/Component"
import { Params } from "@/dispatcher/model/Params"
import { Methods } from "@/dispatcher/model/Methods"

function handle<S, T>(procedure: PromiseProvider<S, T>, configuration: ComponentConfiguration<S>): MiddleWare {
    return async (context: Context, next: Next) => {
        let mappedInput = undefined
        if (configuration.mapper) {
            mappedInput = configuration.mapper({ params: queryToParams(context.query), data: context.request.body })
        }
        console.log("mapped params ", context.query)
        console.log("mapped data ", context.request.body)
        console.log("to ", mappedInput)
        const output = await procedure(mappedInput)
        context.body = JSON.stringify(output)
        context.status = 200
        context.type = 'application/json'
        return await next()
    }
}

function queryToParams(query: any): Params {
    let p: Params = {}
    Object.keys(query).forEach(k => {
        let v = query[k]
        if (!Array.isArray(v)) {
            v = [v]
        }
        p[k] = v
    })
    return p
}

const server = createServer()
const router = createRouter()
server.use(async (context, next) => {
    try {
        await next()
        if (context.status === 404) {
            console.log(context)
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

export function register<S, T>(
    procedureName: string,
    procedure: PromiseProvider<S, T>,
    configuration: ComponentConfiguration<S>
) {
    const url = `/${path(configuration.moduleName, procedureName)}`
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
        .use(router.routes())
        .use(router.allowedMethods())
}

export function listen() {
    server.listen(serverPort!)
}
