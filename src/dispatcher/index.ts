
import { PromiseProvider } from "@/dispatcher/model/PromiseProvider"
import { RequestInput } from "@/dispatcher/model/RequestInput"
import { build, listen } from "@/dispatcher/api"

let procedures: {
    [name: string]: PromiseProvider<any, any>
} = {}


export function add<T>(moduleName: string, procedureName: string, procedure: PromiseProvider<RequestInput, T>) {
    const p = path(moduleName, procedureName)
    if (procedures[p] === undefined) {
        procedures[p] = procedure
    } else {
        throw Error(`duplicate registration of procedure ${p}`)
    }
}

export function get<T>(moduleName: string, procedureName: string): PromiseProvider<RequestInput, T> {
    return procedures[path(moduleName, procedureName)]
}

export function reset(): void {
    procedures = {}
}

export function path(moduleName: string, procedureName: string): string {
    return `${moduleName}/${procedureName}`
}

export function run(): void {
    build()
    listen()
}
