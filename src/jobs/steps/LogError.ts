import { IO } from "../../IO"

export class LogError {

    public constructor(
        public readonly io: IO = new IO()
    ) { }

    public async apply(error: Error): Promise<{}> {
        this.io.error(error)
        return {}
    }
}
