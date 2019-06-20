export interface Snapshot {
    name: string
    data: object
}

export interface ClusterSnapshot {
    batches: Snapshot[]
    deployments: Snapshot[]
}
