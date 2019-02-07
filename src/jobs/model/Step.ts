import { Filter } from './Filter'

export type StepType =
    | 'clusterProbe'
    | 'planImageDeployment'
    | 'planClusterDeployment'
    | 'planNamespaceDeployment'
    | 'applyDeployment'
    | 'takeSnapshot'
    | 'rollback'
    | 'logError'

export interface StepDescription {
    readonly name: string
    readonly type: StepType
    readonly onSuccess?: string
    readonly onFailure?: string

    readonly filter?: Partial<Filter>
    readonly tag?: string // planImageDeployment
    readonly semanticTagExtractor?: string // planImageDeployment
    readonly cluster?: string // planClusterDeployment/planNamespaceDeployment?
    readonly source?: string // planNamespaceDeployment
    readonly target?: string // planNamespaceDeployment
    readonly hook?: string // clusterProbe
    readonly timeout?: number // clusterProbe
}
