import { Image } from "@/images/model/Image"

export interface ImageRepository {
    endpoint: string
    images(): Promise<string[]>
    versions(name: string): Promise<Image[]>
    fillCache(): Promise<void>
}
