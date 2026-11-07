export class Dice {
    static roll(sides = 6): number {
        return Math.floor(Math.random() * sides) + 1;
    }

    static rollMultiple(count: number, sides = 6): number[] {
        const rolls: number[] = [];
        for (let i = 0; i < count; i++) {
            rolls.push(this.roll(sides));
        }
        return rolls;
    }
}
