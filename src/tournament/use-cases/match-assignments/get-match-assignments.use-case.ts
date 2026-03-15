import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchAssignment } from '@persistence/entities';

@Injectable()
export class GetMatchAssignmentsUseCase {
    constructor(
        @InjectRepository(MatchAssignment)
        private readonly matchAssignmentRepository: Repository<MatchAssignment>,
    ) {}

    async execute(): Promise<MatchAssignment[]> {
        return await this.matchAssignmentRepository.find();
    }
}
