import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SportDocument = Sport & Document;

@Schema({ timestamps: true, collection: 'sports' })
export class Sport {
  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  key!: string;

  @Prop({ required: true, trim: true })
  nameAr!: string;

  @Prop({ required: true, trim: true })
  nameEn!: string;

  @Prop({ default: '' })
  emoji!: string;

  @Prop({ default: '#22c55e' })
  color!: string;

  @Prop({ type: Boolean, default: true, index: true })
  isActive!: boolean;

  @Prop({ type: Number, default: 0 })
  order!: number;
}

export const SportSchema = SchemaFactory.createForClass(Sport);
SportSchema.index({ isActive: 1, order: 1 });
