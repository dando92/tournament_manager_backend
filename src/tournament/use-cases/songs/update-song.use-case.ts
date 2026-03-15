import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '@persistence/entities';
import { UpdateSongDto } from '../../dtos';

@Injectable()
export class UpdateSongUseCase {
    constructor(
        @InjectRepository(Song)
        private readonly songRepository: Repository<Song>,
    ) {}

    async execute(id: number, dto: UpdateSongDto): Promise<Song> {
        const song = await this.songRepository.findOneBy({ id });
        if (!song) throw new NotFoundException(`Song with ID ${id} not found`);
        this.songRepository.merge(song, dto);
        return await this.songRepository.save(song);
    }
}
