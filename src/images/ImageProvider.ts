export interface ImageProvider {
    images(): Promise<string[]>
    versions(repository: string): Promise<ImageVersion[]>
}

export interface ImageVersion {
    image: string
    tag: string
}
