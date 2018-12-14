import { Artifact } from "./model/Artifact"

export interface ArtifactRepository {

    saveArtifact(path: string, artifact: Artifact): Promise<void>
    listArtifacts(path: string): Promise<Artifact[]>
}
