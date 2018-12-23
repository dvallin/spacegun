import { call } from "../../dispatcher"
import { IO } from "../../IO"

import * as eventModule from "../../events/EventModule"
import { PipelineDescription } from "../model/PipelineDescription";

export class LogError {

    public constructor(
        public readonly io: IO = new IO()
    ) { }

    public async apply(pipeline: PipelineDescription, error: Error): Promise<{}> {
        this.io.error(error)
        call(eventModule.log)({
            message: `Failed to apply pipeline ${pipeline.name}`,
            timestamp: Date.now(),
            topics: ["slack"],
            description: `An error occured during pipeline execution: ${error.message}`,
            fields: [{
                title: "Stack",
                value: error.stack || ""
            }]
        })
        return {}
    }
}
