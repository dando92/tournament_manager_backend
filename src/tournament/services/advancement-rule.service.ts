import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvancementCompetitionKind, AdvancementRule } from '@persistence/entities';
import { CreateAdvancementRuleDto, UpdateAdvancementRuleDto } from '@tournament/dtos';

@Injectable()
export class AdvancementRuleService {
  constructor(
    @InjectRepository(AdvancementRule)
    private readonly advancementRuleRepository: Repository<AdvancementRule>,
  ) {}

  async create(dto: CreateAdvancementRuleDto): Promise<AdvancementRule> {
    const rule = this.advancementRuleRepository.create(dto);
    return await this.advancementRuleRepository.save(rule);
  }

  async findById(id: number): Promise<AdvancementRule | null> {
    return await this.advancementRuleRepository.findOneBy({ id });
  }

  async findBySource(sourceKind: AdvancementCompetitionKind, sourceId: number): Promise<AdvancementRule[]> {
    return await this.advancementRuleRepository.find({
      where: { sourceKind, sourceId },
      order: { sourcePlacement: 'ASC', targetSlot: 'ASC', id: 'ASC' },
    });
  }

  async findByTarget(targetKind: AdvancementCompetitionKind, targetId: number): Promise<AdvancementRule[]> {
    return await this.advancementRuleRepository.find({
      where: { targetKind, targetId },
      order: { targetSlot: 'ASC', sourcePlacement: 'ASC', id: 'ASC' },
    });
  }

  async update(id: number, dto: UpdateAdvancementRuleDto): Promise<AdvancementRule> {
    const rule = await this.findById(id);
    if (!rule) throw new NotFoundException(`AdvancementRule with ID ${id} not found`);

    this.advancementRuleRepository.merge(rule, dto);
    return await this.advancementRuleRepository.save(rule);
  }

  async delete(id: number): Promise<void> {
    const rule = await this.findById(id);
    if (!rule) return;

    await this.advancementRuleRepository.remove(rule);
  }
}
