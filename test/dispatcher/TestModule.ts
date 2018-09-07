import { Component } from "../../src/dispatcher/component"
import { Layers } from "../../src/dispatcher/model/Layers"
import { RequestInput } from "../../src/dispatcher/model/RequestInput"

export const globalFunction = jest.fn()
export const localFunction = jest.fn()
export const remoteFunction = jest.fn()

export const moduleName = "clientModule"
export const functions = {
    standalone: "standalone",
    local: "local",
    remoteVoid: "remoteVoid",
    remoteParams: "remoteParams"
}

export class ModuleOnClient {
    @Component({
        moduleName,
        layer: Layers.Standalone
    })
    [functions.standalone](): void {
        globalFunction()
    }

    @Component({
        moduleName,
        layer: Layers.Client
    })
    [functions.local](): void {
        localFunction()
    }

    @Component({
        moduleName,
        layer: Layers.Server
    })
    [functions.remoteVoid](): void {
        remoteFunction()
    }

    @Component({
        moduleName,
        layer: Layers.Server,
        mapper: (input: RequestInput): number => Number.parseInt(input.params!["param"] as string)
    })
    [functions.remoteParams](param: number): void {
        remoteFunction(param)
    }
}
