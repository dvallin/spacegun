import { add } from "@/dispatcher"
import { Layers } from "@/dispatcher/model/Layers"
import { get, post, put } from "@/dispatcher/caller"
import { register } from "@/dispatcher/api"

import { RequestInput } from "@/dispatcher/model/RequestInput"
import { Methods } from "@/dispatcher/model/Methods"

export interface ComponentConfiguration<T> {
    layer: Layers
    mapper?: (p: RequestInput) => T
    method?: Methods
}

export function Component<T>(configuration: ComponentConfiguration<T>) {
    return function (target: any, procedureName: string, { }: PropertyDescriptor) {
        addPromiseProvider(procedureName, configuration, target)
        register(procedureName, target[procedureName], configuration)
    }
}

function addPromiseProvider<T>(
    procedureName: string, configuration: ComponentConfiguration<T>, target: any
): void {
    let procedure
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
                return post(procedureName, input)
            }
        } else if (configuration.method === Methods.Put) {
            procedure = (input: RequestInput = {}) => {
                return put(procedureName, input)
            }
        } else {
            procedure = (input: RequestInput = {}) => {
                return get(procedureName, input)
            }
        }
    } else {
        procedure = (input: RequestInput = {}) => {
            throw new Error(`a call to ${procedureName} with input ${input} in layer ${configuration.layer} from ${process.env.LAYER} is not possible`)
        }
    }
    add(procedureName, procedure)
}

function isLocalCallable(layer: Layers) {
    return layer === process.env.LAYER || process.env.LAYER === Layers.Standalone
}
