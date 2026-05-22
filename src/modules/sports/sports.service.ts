import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sport, SportDocument } from '../../database/schemas/sport.mongoose-schema';

export interface CreateSportDto {
  nameAr: string;
  emoji?: string;
  color?: string;
}

export interface UpdateSportDto {
  nameAr?: string;
  emoji?: string;
  color?: string;
  isActive?: boolean;
}

@Injectable()
export class SportsService {
  constructor(
    @InjectModel(Sport.name) private sportModel: Model<SportDocument>,
  ) {}

  private generateKey(): string {
    return `sport_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  }

  async findAll(onlyActive = false): Promise<Sport[]> {
    const filter = onlyActive ? { isActive: true } : {};
    return this.sportModel.find(filter).sort({ order: 1, createdAt: 1 }).lean();
  }

  async create(dto: CreateSportDto): Promise<Sport> {
    const count = await this.sportModel.countDocuments();
    const key = this.generateKey();
    const sport = await this.sportModel.create({
      key,
      nameAr: dto.nameAr,
      nameEn: dto.nameAr,
      emoji: dto.emoji ?? '',
      color: dto.color ?? '#22c55e',
      isActive: true,
      order: count,
    });
    return sport.toObject();
  }

  async update(id: string, dto: UpdateSportDto): Promise<Sport> {
    const update: Record<string, any> = {};
    if (dto.nameAr !== undefined) { update.nameAr = dto.nameAr; update.nameEn = dto.nameAr; }
    if (dto.emoji  !== undefined) update.emoji  = dto.emoji;
    if (dto.color  !== undefined) update.color  = dto.color;
    if (dto.isActive !== undefined) update.isActive = dto.isActive;

    const sport = await this.sportModel.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!sport) throw new NotFoundException('الرياضة غير موجودة');
    return sport;
  }

  async toggleActive(id: string): Promise<Sport> {
    const sport = await this.sportModel.findById(id);
    if (!sport) throw new NotFoundException('الرياضة غير موجودة');
    sport.isActive = !sport.isActive;
    await sport.save();
    return sport.toObject();
  }

  async remove(id: string): Promise<void> {
    const result = await this.sportModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('الرياضة غير موجودة');
  }

  async reorder(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id, index) => this.sportModel.findByIdAndUpdate(id, { order: index })),
    );
  }

  async seedDefaults(): Promise<void> {
    const count = await this.sportModel.countDocuments();
    if (count > 0) return;

    const defaults = [
      { key: 'football',   nameAr: 'كرة القدم',   nameEn: 'Football',   emoji: '⚽', color: '#16a34a', isActive: true, order: 0 },
      { key: 'basketball', nameAr: 'كرة السلة',   nameEn: 'Basketball', emoji: '🏀', color: '#ea580c', isActive: true, order: 1 },
      { key: 'tennis',     nameAr: 'تنس',          nameEn: 'Tennis',     emoji: '🎾', color: '#ca8a04', isActive: true, order: 2 },
      { key: 'volleyball', nameAr: 'كرة الطائرة', nameEn: 'Volleyball', emoji: '🏐', color: '#7c3aed', isActive: true, order: 3 },
      { key: 'padel',      nameAr: 'بادل',         nameEn: 'Padel',      emoji: '🏓', color: '#0891b2', isActive: true, order: 4 },
      { key: 'squash',     nameAr: 'إسكواش',       nameEn: 'Squash',     emoji: '🎱', color: '#be185d', isActive: true, order: 5 },
      { key: 'badminton',  nameAr: 'ريشة طائر',   nameEn: 'Badminton',  emoji: '🏸', color: '#b45309', isActive: true, order: 6 },
      { key: 'swimming',   nameAr: 'سباحة',        nameEn: 'Swimming',   emoji: '🏊', color: '#1d4ed8', isActive: true, order: 7 },
    ];

    await this.sportModel.insertMany(defaults);
  }
}
