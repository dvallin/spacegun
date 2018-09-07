export interface ArtifactRepository {

    saveArtifact(name: string, path: string, data: object): Promise<void>
    loadArtifact(name: string, path: string): Promise<object | undefined>
}
