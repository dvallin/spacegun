import { add, path } from "@/dispatcher"
import { Layers } from "@/dispatcher/model/Layers"
import { get, post, put } from "@/dispatcher/caller"
import { register as registerApi } from "@/dispatcher/api"

import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Methods } from "@/dispatcher/model/Methods"

export interface ComponentConfiguration<T> {
    moduleName: string
    layer: Layers
    mapper?: (p: RequestInput) => T
    method?: Methods
}

export function Component<T>(configuration: ComponentConfiguration<T>) {
    return function (target: any, procedureName: string, { }: PropertyDescriptor) {
        addPromiseProvider(procedureName, configuration, target)
        registerApi(procedureName, target[procedureName], configuration)
    }
}

function addPromiseProvider<T>(
    procedureName: string, configuration: ComponentConfiguration<T>, target: any
): void {
    let procedure
    const procedurePath = path(configuration.moduleName, procedureName)
    if (isLocalCallable(configuration.layer)) {
        procedure = (input: RequestInput = {}) => {
            let mappedInput = undefined
            if (input) {
                if (configuration.mapper) {
                    mappedInput = configuration.mapper(input)
                }
            }
            return target[procedureName](mappedInput)
        }
    } else if (process.env.LAYER === Layers.Client) {
        if (configuration.method === Methods.Post) {
            procedure = (input: RequestInput = {}) => {
                return post(procedurePath, input)
            }
        } else if (configuration.method === Methods.Put) {
            procedure = (input: RequestInput = {}) => {
                return put(procedurePath, input)
            }
        } else {
            procedure = (input: RequestInput = {}) => {
                return get(procedurePath, input)
            }
        }
    } else {
        procedure = (input: RequestInput = {}) => {
            throw new Error(`a call to ${procedurePath} with input ${JSON.stringify(input)} in layer ${configuration.layer} from ${process.env.LAYER} is not possible`)
        }
    }
    add(configuration.moduleName, procedureName, procedure)
}

function isLocalCallable(layer: Layers) {
    return layer === process.env.LAYER || layer === Layers.Standalone || process.env.LAYER === Layers.Standalone
}
