import { Image } from './model/Image'
import { Tag } from './model/Tag'

export interface ImageRepository {
    endpoint: string
    list(): Promise<string[]>
    tags(image: string): Promise<Tag[]>
    image(image: string, tag?: string): Promise<Image>
}
