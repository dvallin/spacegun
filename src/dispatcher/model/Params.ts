export type Params = { [key: string]: string | string[] }

export function queryToParams(query: any): Params {
    let p: Params = {}
    if (query !== undefined) {
        Object.keys(query).forEach(k => {
            let v = query[k]
            if (!Array.isArray(v)) {
                v = [v]
            }
            p[k] = v
        })
    }
    return p
}
