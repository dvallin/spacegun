import { RequestInput } from "./RequestInput"

export interface Request<Input, Output> {
    module: string
    procedure: string
    input?: (input: Input | undefined) => RequestInput
    mapper?: (input: RequestInput) => Input | undefined
    output?: (output: Output | undefined) => object
}
