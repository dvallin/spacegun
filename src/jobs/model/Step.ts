import { Filter } from "./Filter"

export type StepType = "clusterProbe" | "planImageDeployment" | "planClusterDeployment" | "applyDeployment" | "takeSnapshot" | "rollback"

export interface StepDescription {
    readonly name: string
    readonly type: StepType
    readonly onSuccess?: string
    readonly onFailure?: string

    readonly filter?: Partial<Filter>
    readonly tag?: string       // planImageDeployment
    readonly semanticTagExtractor?: string | RegExp // planImageDeployment
    readonly cluster?: string   // planClusterDeployment
    readonly hook?: string      // clusterProbe
}
