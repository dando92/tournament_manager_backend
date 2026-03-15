import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchAssignment } from '@persistence/entities';

@Injectable()
export class GetMatchAssignmentUseCase {
    constructor(
        @InjectRepository(MatchAssignment)
        private readonly matchAssignmentRepository: Repository<MatchAssignment>,
    ) {}

    async execute(id: number): Promise<MatchAssignment | null> {
        return await this.matchAssignmentRepository.findOneBy({ id });
    }
}
