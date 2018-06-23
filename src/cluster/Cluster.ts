export interface Cluster {
    clusters: string[]
    pods(cluster: string): Promise<Pod[]>
    deployments(cluster: string): Promise<Deployment[]>
    scalers(cluster: string): Promise<Scaler[]>
}

export interface Pod {
    name: string
    image: string
    restarts: number
}

export interface Deployment {
    name: string
    image: string
}

export interface Scaler {
    name: string
    replicas: Replicas
}

export interface Replicas {
    current: number
    minimum: number
    maximum: number
}
