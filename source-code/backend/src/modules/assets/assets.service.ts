import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateAssetDto } from './dto/create-asset.dto';
import { Asset, AssetDocument, AssetFileType } from './schemas/asset.schema';

export type UploadAssetResult = {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
  asset: AssetDocument;
};

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

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    projectId: string,
  ): Promise<UploadAssetResult> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('projectId không hợp lệ');
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('userId không hợp lệ');
    }

    const url = `/uploads/${file.filename}`;
    const doc = new this.assetModel({
      projectId: new Types.ObjectId(projectId),
      uploadedBy: new Types.ObjectId(userId),
      fileName: file.filename,
      fileUrl: url,
      fileType: AssetFileType.Image,
      fileSize: file.size,
    });
    const asset = await doc.save();

    return {
      url,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      asset,
    };
  }

  async listByProject(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('projectId không hợp lệ');
    }
    const docs = await this.assetModel
      .find({ projectId: new Types.ObjectId(projectId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return docs.map((d) => ({
      id: String(d._id),
      fileUrl: d.fileUrl,
      fileName: d.fileName,
    }));
  }
}
