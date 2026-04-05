import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Division, Player, Tournament } from '@persistence/entities';
import { CreateDivisionDto, UpdateDivisionDto } from '../dtos';
import { UiUpdateGateway } from '@match/gateways/ui-update.gateway';

@Injectable()
export class DivisionService {
    constructor(
        @InjectRepository(Division)
        private readonly divisionRepository: Repository<Division>,
        @InjectRepository(Tournament)
        private readonly tournamentRepository: Repository<Tournament>,
        private readonly uiUpdateGateway: UiUpdateGateway,
    ) {}

    async create(dto: CreateDivisionDto): Promise<Division> {
        const tournament = await this.tournamentRepository.findOneBy({ id: dto.tournamentId });
        if (!tournament) throw new NotFoundException(`Tournament ${dto.tournamentId} not found`);
        const division = new Division();
        division.name = dto.name;
        division.tournament = tournament;
        const savedDivision = await this.divisionRepository.save(division);
        await this.uiUpdateGateway.emitTournamentUpdate(dto.tournamentId);
        return savedDivision;
    }

    async findAll(tournamentId?: number): Promise<Division[]> {
        if (tournamentId) {
            return this.findAllForTournamentCards(tournamentId);
        }
        return this.divisionRepository.find();
    }

    async findOne(id: number): Promise<Division> {
        const division = await this.findOneForView(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);
        return division;
    }

    async findAllForTournamentCards(tournamentId: number): Promise<Division[]> {
        return this.divisionRepository.find({
            where: { tournament: { id: tournamentId } },
            relations: {
                tournament: true,
                players: true,
                phases: {
                    matches: {
                        players: true,
                        rounds: {
                            song: true,
                            standings: {
                                score: {
                                    player: true,
                                    song: true,
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    async findOneForView(id: number): Promise<Division | null> {
        return this.divisionRepository.findOne({
            where: { id },
            relations: {
                tournament: true,
                players: true,
                phases: {
                    matches: {
                        players: true,
                        rounds: {
                            song: true,
                            standings: {
                                score: {
                                    player: true,
                                    song: true,
                                },
                            },
                            matchAssignments: true,
                        },
                    },
                },
            },
        });
    }

    async findOneForBracketGeneration(id: number): Promise<Division | null> {
        return this.divisionRepository.findOne({
            where: { id },
            relations: {
                players: true,
                phases: {
                    matches: {
                        rounds: {
                            song: true,
                        },
                    },
                },
            },
        });
    }

    async findPlayersOnly(id: number): Promise<Division | null> {
        return this.divisionRepository.findOne({
            where: { id },
            relations: {
                players: true,
            },
        });
    }

    async findOneBasic(id: number): Promise<Division | null> {
        return this.divisionRepository.findOne({
            where: { id },
            relations: {
                tournament: true,
            },
        });
    }

    async update(id: number, dto: UpdateDivisionDto): Promise<Division> {
        const division = await this.findOneBasic(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);
        if (dto.tournamentId) {
            const tournament = await this.tournamentRepository.findOneBy({ id: dto.tournamentId });
            if (!tournament) throw new NotFoundException(`Tournament ${dto.tournamentId} not found`);
            division.tournament = tournament;
            delete dto.tournamentId;
        }
        this.divisionRepository.merge(division, dto);
        return this.divisionRepository.save(division);
    }

    async delete(id: number): Promise<void> {
        const division = await this.findOneBasic(id);
        const tournamentId = division?.tournament?.id;
        await this.divisionRepository.delete(id);
        await this.uiUpdateGateway.emitTournamentUpdate(tournamentId);
    }

    async getPlayers(id: number): Promise<Player[]> {
        const division = await this.findPlayersOnly(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);
        return division.players ?? [];
    }

    async updatePlayers(id: number, players: Player[], seeding: number[]): Promise<void> {
        const division = await this.findPlayersOnly(id);
        if (!division) throw new NotFoundException(`Division ${id} not found`);

        division.players = players;
        division.seeding = seeding;
        await this.divisionRepository.save(division);
    }
}
