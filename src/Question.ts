import * as readline from "readline"

export class Question {

    private readline: readline.ReadLine

    public constructor() {
        this.readline = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })
    }

    choose<T>(question: string, options: T[]): Promise<T> {
        return new Promise((resolve, reject) => {
            this.readline.question(question, (answer) => {
                let index
                try {
                    index = Number.parseInt(answer)
                } catch (error) {
                }
                if (index === undefined || index < 0 || index >= options.length) {
                    reject(new Error(`${answer} is not in the valid range`))
                } else {
                    resolve(options[index])
                }
            })
        })
    }

    expect(question: string, expected: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.readline.question(question, (answer) => {
                resolve(answer === expected)
            })
        })
    }

    public close() {
        this.readline.close()
    }
}
