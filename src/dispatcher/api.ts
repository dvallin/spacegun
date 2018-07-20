

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
            mappedInput = configuration.mapper({ params: context.query as Params, data: context.request.body })
        }
        const output = await procedure(mappedInput)
        context.body = JSON.stringify(output)
        context.status = 200
        context.type = 'application/json'
        return await next()
    }
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

export function register<S, T>(
    procedureName: string,
    procedure: PromiseProvider<S, T>,
    configuration: ComponentConfiguration<S>
) {
    if (configuration.method === Methods.Post) {
        router.post(path(procedureName), handle(procedure, configuration))
    } else if (configuration.method === Methods.Put) {
        router.put(path(procedureName), handle(procedure, configuration))
    } else {
        router.get(path(procedureName), handle(procedure, configuration))
    }
}

export function build() {
    server
        .use(router.routes())
        .use(router.allowedMethods())
}

export function listen() {
    server.listen(Number.parseInt(process.env.SERVER_PORT || "3000"))
}
