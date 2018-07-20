import { Layers } from "@/dispatcher/model/Layers"


if (process.env.LAYER === Layers.Standalone || process.env.LAYER === Layers.Client) {
    const cli = require("./cli")
    cli.run()
} else {
    const server = require("./server")
    server.run()
}
