import chalk from "chalk"

import { CommandFn } from "./"
import { load } from "./helpers"

import * as imageModule from "../images/ImageModule"

import { call } from "../dispatcher"
import { pad } from "../pad"
import { IO } from "../IO"
import { Options } from "../options"

import { Image } from "../cluster/model/Image"

export const imagesCommand: CommandFn = async ({ }: Options, io: IO) => images(io)

async function images(io: IO) {
    const images = await load(call(imageModule.list)())
    images.forEach(image =>
        io.out(image)
    )
}

export async function chooseTag(options: Options, io: IO, image: Image): Promise<string> {
    const tags = await load(call(imageModule.tags)(image))

    if (options.tag) {
        const tag = tags.find(t => t === options.tag)
        if (!tag) {
            throw new Error(`tag ${options.tag} does not exist`)
        }
        return tag
    } else {
        tags.sort()

        io.out("Choose the target image")
        tags.forEach((tag, index) => {
            io.out(chalk.bold.cyan(index.toString()) + ": " + pad(tag, 5))
        })
        return await io.choose('> ', tags)
    }
}
