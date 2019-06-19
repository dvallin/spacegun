import { Image } from '../../cluster/model/Image'
import { ServerGroup } from '../../cluster/model/ServerGroup'
import { Batch } from 'src/cluster/model/Batch'

export interface BatchPlan {
    batch: Batch
    image: Image
    group: ServerGroup
}
