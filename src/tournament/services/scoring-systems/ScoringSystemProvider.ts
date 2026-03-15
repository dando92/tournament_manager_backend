import { IScoringSystem } from "./IScoringSystem";
import { EurocupScoreCalculator } from "./EurocupScoreCalculator";
import { FinalsCalculator } from "./FinalsCalculator";


export class ScoringSystemProvider {
    systems: Map<string, IScoringSystem>;
    constructor() {
        this.systems = new Map<string, IScoringSystem>();

        this.add(new EurocupScoreCalculator());
        this.add(new FinalsCalculator());
    }

    add(scoreCalculator: IScoringSystem): void {
        this.systems.set(scoreCalculator.getName(), scoreCalculator);
    }

    getScoringSystem(name: string): IScoringSystem {
        return this.systems.get(name);
    }

    getAll(): string[] {
        return Array.from(this.systems.keys());
    }
}
