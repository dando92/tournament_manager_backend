import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Match } from '@persistence/entities';

@Injectable()
export class DeleteMatchUseCase {
    constructor(
        @InjectRepository(Match)
        private readonly matchRepository: Repository<Match>,
    ) {}

    async execute(id: number): Promise<void> {
        const match = await this.matchRepository.findOneBy({ id });
        if (!match) return;

        // For each source match (those that have this match in their targetPaths),
        // remove this match's id from their targetPaths.
        const sourcePathIds: number[] = (match.sourcePaths ?? []).map(Number);
        if (sourcePathIds.length > 0) {
            const sourceMatches = await this.matchRepository.findByIds(sourcePathIds);
            for (const source of sourceMatches) {
                const updated = (source.targetPaths ?? []).filter(t => Number(t) !== id);
                source.targetPaths = updated;
                await this.matchRepository.save(source);
            }
        }

        await this.matchRepository.remove(match);
    }
}
