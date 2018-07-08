import { Replicas } from "./Replicas"

export interface Scaler {
    name: string
    replicas: Replicas
}
