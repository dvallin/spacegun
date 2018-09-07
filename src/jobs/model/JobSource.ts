export interface JobSource {
    readonly type: "cluster" | "image"
    readonly expression?: string
}
