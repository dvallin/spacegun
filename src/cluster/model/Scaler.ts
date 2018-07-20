import { Replicas } from "@/cluster/model/Replicas"

export interface Scaler {
    name: string
    replicas: Replicas
}
