export interface ImageProvider {
    endpoint: string
    images(): Promise<string[]>
    versions(name: string): Promise<ImageVersion[]>
}

export interface ImageVersion {
    url: string
    name: string
    tag: string
    lastUpdated: Date
}
