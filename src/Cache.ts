export class Cache<S, T> {
    private data: Map<S, { value: T; age: number }> = new Map()

    public constructor(public maxAgeSeconds?: number) {}

    public get(key: S): T | undefined {
        const entry = this.data.get(key)
        if (entry !== undefined && !this.isOutdated(entry.age)) {
            return entry.value
        }
        return undefined
    }

    private isOutdated(age: number): boolean {
        return this.maxAgeSeconds !== undefined && Date.now() - age > this.maxAgeSeconds * 1000
    }

    public set(key: S, value: T): void {
        this.data.set(key, { value, age: Date.now() })
    }

    public async calculate(key: S, valueProvider: () => Promise<T>): Promise<T> {
        let value = this.get(key)
        if (value === undefined) {
            value = await valueProvider()
            this.set(key, value)
        }
        return value
    }
}
