export interface ClusterProvider {
    clusters: string[]
    pods(cluster: string): Promise<Pod[]>
    deployments(cluster: string): Promise<Deployment[]>
    updateDeployment(cluster: string, deployment: Deployment, targetImage: Image): Promise<Deployment>
    scalers(cluster: string): Promise<Scaler[]>
}

export interface Pod {
    name: string
    ready: boolean
    image?: Image
    restarts?: number
}

export interface Deployment {
    name: string
    image?: Image
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

export interface Image {
    url: string
    name: string
    tag: string
}
