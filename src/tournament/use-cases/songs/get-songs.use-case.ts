import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '@persistence/entities';

@Injectable()
export class GetSongsUseCase {
    constructor(
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
    ) {}

    async execute(): Promise<Song[]> {
        return this.songRepository.find();
    }
}
