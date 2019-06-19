import { ServerGroup } from '../../cluster/model/ServerGroup'
import { DeployableResource } from './DeploymentPlan'

export interface Filter {
    readonly namespaces: string[]
    readonly resources: string[]
}

export function matchesServerGroup(filter: Partial<Filter> | undefined, group: ServerGroup) {
    if (filter === undefined || filter.namespaces === undefined || group.namespace === undefined) {
        return true
    }
    return filter.namespaces.some(n => n === group.namespace)
}

export function matchesResource(filter: Partial<Filter> | undefined, resource: DeployableResource) {
    if (filter === undefined || filter.resources === undefined) {
        return true
    }
    return filter.resources.some(n => n === resource.name)
}
