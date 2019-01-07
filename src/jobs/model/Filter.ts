import { Deployment } from 'src/cluster/model/Deployment'
import { ServerGroup } from 'src/cluster/model/ServerGroup'

export interface Filter {
    readonly namespaces: string[]
    readonly deployments: string[]
}

export function matchesServerGroup(filter: Partial<Filter> | undefined, group: ServerGroup) {
    if (filter === undefined || filter.namespaces === undefined || group.namespace === undefined) {
        return true
    }
    return filter.namespaces.some(n => n === group.namespace)
}

export function matchesDeployment(filter: Partial<Filter> | undefined, deployment: Deployment) {
    if (filter === undefined || filter.deployments === undefined) {
        return true
    }
    return filter.deployments.some(n => n === deployment.name)
}
