import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAssetDto } from './dto/create-asset.dto';
import { Asset, AssetDocument } from './schemas/asset.schema';

@Injectable()
export class AssetsService {
  constructor(@InjectModel(Asset.name) private readonly assetModel: Model<AssetDocument>) {}

  async create(dto: CreateAssetDto): Promise<AssetDocument> {
    const doc = new this.assetModel({
      ...dto,
      projectId: new Types.ObjectId(dto.projectId),
      uploadedBy: new Types.ObjectId(dto.uploadedBy),
    });
    return doc.save();
  }
}
