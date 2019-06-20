import { safeLoad, safeDump } from 'js-yaml'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import * as mkdirp from 'mkdirp'
import { parse } from 'path'

export function load(filePath: string): object {
    return safeLoad(readFileSync(filePath, 'utf8'))
}

export function save(filePath: string, data: object): Promise<void> {
    const path = parse(filePath)
    return new Promise((resolve, reject) => {
        mkdirp(path.dir, e => {
            if (e) {
                reject(e)
            } else {
                writeFileSync(filePath, safeDump(data, { skipInvalid: true }), 'utf8')
                resolve()
            }
        })
    })
}

export function list(filePath: string): string[] {
    return readdirSync(filePath)
}
