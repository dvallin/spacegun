import { registerResource } from "@/dispatcher/api"

export interface ResourceConfiguration {
    path: string
}

export function Resource(configuration: ResourceConfiguration) {
    return function (target: any, procedureName: string, { }: PropertyDescriptor) {
        registerResource(configuration, procedureName, target[procedureName])
    }
}
