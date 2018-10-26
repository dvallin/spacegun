import { Params } from "./Params"

export class RequestInput {
    constructor(
        public params?: Params,
        public data?: any
    ) { }

    public static ofData(data: any, ...p: [string, any][]): RequestInput {
        return new RequestInput(RequestInput.buildParams(p), data)
    }

    public static of(...p: [string, any][]): RequestInput {
        return new RequestInput(RequestInput.buildParams(p))
    }

    private static buildParams(p: [string, any][]): Params | undefined {
        if (p.length > 0) {
            const params: Params = {}
            p.filter(([{ }, value]) => value !== undefined).forEach(([key, value]) => {
                const current = params[key]
                const v = value.toString()
                if (current === undefined) {
                    params[key] = v
                } else if (typeof current === "string") {
                    params[key] = [current, v]
                } else {
                    current.push(v)
                }
            })
            return params
        } else {
            return undefined
        }
    }
}
