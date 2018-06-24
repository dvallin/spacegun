export function pad(text: string, columns: number = 12): string {
    const additionalColumns = 7 * columns - text.length
    if (additionalColumns < 0) {
        console.error(`${text} is ${Math.abs(additionalColumns)} too long`)
    } else {
        text += " ".repeat(additionalColumns)
    }
    return text
}
