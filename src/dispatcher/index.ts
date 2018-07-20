
import { PromiseProvider } from "@/dispatcher/model/PromiseProvider"
import { build, listen } from "@/dispatcher/api"

console.log(`starting dispatcher on ${process.env.LAYER}`)

let procedures: {
    [name: string]: PromiseProvider<any, any>
} = {}


export function add<S, T>(procedureName: string, procedure: PromiseProvider<S, T>) {
    console.log(`registered procedure ${procedureName}`)
    procedures[path(procedureName)] = procedure
}

export function get<S, T>(procedureName: string): PromiseProvider<S, T> {
    return procedures[path(procedureName)]
}

export function reset(): void {
    procedures = {}
}

export function path(procedureName: string): string {
    return `/${procedureName}`
}

export function run(): void {
    build()
    listen()
}
