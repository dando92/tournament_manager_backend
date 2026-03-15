import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '@persistence/entities';

@Injectable()
export class GetSongUseCase {
    constructor(
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
    ) {}

    async execute(id: number): Promise<Song | null> {
        return await this.songRepository.findOneBy({ id });
    }
}
