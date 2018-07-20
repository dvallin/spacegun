import { Params } from "@/dispatcher/model/Params"

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
            p.forEach(([key, value]) => params[key] = value)
            return params
        } else {
            return undefined
        }
    }
}
