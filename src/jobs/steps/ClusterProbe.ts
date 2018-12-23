import axios from "axios"

export class ClusterProbe {

    public async apply(input: object, hook: string, timeout?: number): Promise<object> {
        const result = await axios.get(hook, { timeout })
        if (result.status === 200) {
            return Promise.resolve(input)
        } else {
            return Promise.reject(new Error(
                `Cluster probe ${hook} returned status code ${result.status}`
            ))
        }
    }
}
