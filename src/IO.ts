import * as readline from 'readline'

export class IO {
    public constructor(
        public readonly stdin: NodeJS.ReadableStream = process.stdin,
        public readonly stdout: NodeJS.WritableStream = process.stdout
    ) {}

    public choose<T>(question: string, options: T[]): Promise<T> {
        return new Promise((resolve, reject) => {
            this.readlineContext(question, answer => {
                let index
                try {
                    index = Number.parseInt(answer)
                } catch (error) {}
                if (index === undefined || index < 0 || index >= options.length) {
                    reject(new Error(`${answer} is not in the valid range`))
                } else {
                    resolve(options[index])
                }
            })
        })
    }

    public chooseMultiple<S, T>(question: string, options1: S[], options2: T[]): Promise<{ first: boolean; result: S | T }> {
        return new Promise((resolve, reject) => {
            this.readlineContext(question, answer => {
                let index
                try {
                    index = Number.parseInt(answer)
                } catch (error) {}
                if (index === undefined || index < 0 || index >= options1.length + options2.length) {
                    reject(new Error(`${answer} is not in the valid range`))
                } else if (index >= options1.length) {
                    resolve({ first: false, result: options2[index - options1.length] })
                } else {
                    resolve({ first: true, result: options1[index] })
                }
            })
        })
    }

    public expect(question: string, expected: string): Promise<boolean> {
        return new Promise(resolve => {
            this.readlineContext(question, answer => resolve(answer === expected))
        })
    }

    public error(e: Error | string) {
        console.error(e)
    }

    public out(text: string) {
        console.log(text)
    }

    private readlineContext(question: string, callback: (answer: string) => void) {
        const r = readline.createInterface({
            input: this.stdin,
            output: this.stdout,
        })
        r.question(question, answer => {
            callback(answer)
            r.close()
        })
    }
}
