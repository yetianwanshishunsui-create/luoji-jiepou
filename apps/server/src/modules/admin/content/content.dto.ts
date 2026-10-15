import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IdentityType, LessonType, PricingMode, ProductType } from '@luoji/shared';
import { PageQueryDto } from '../../../common/dto/page.dto';

const IDENTITIES = Object.values(IdentityType);
const URL_OPTS = { protocols: ['https', 'http'], require_protocol: true, require_tld: false };
/** 单个金额上限：10 万元 */
const MAX_CENT = 10_000_000;

class VisibleToDto {
  @IsArray()
  @ArrayMinSize(1, { message: '至少选择一种可见身份' })
  @ArrayUnique()
  @IsIn(IDENTITIES, { each: true })
  visibleTo: IdentityType[];
}

// ───────── 分类 ─────────

export class CategoryDto extends VisibleToDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  name: string;

  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsInt()
  sort?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

// ───────── 课程产品 ─────────

export class ProductQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(Object.values(ProductType))
  type?: ProductType;

  @IsOptional()
  @IsIn(['DRAFT', 'ONLINE', 'OFFLINE'])
  status?: 'DRAFT' | 'ONLINE' | 'OFFLINE';

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}

export class UpdateProductDto extends VisibleToDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUrl(URL_OPTS, { message: '封面需为图片链接' })
  @MaxLength(512)
  cover?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  detailHtml?: string | null;

  @IsIn(Object.values(PricingMode))
  pricingMode: PricingMode;

  @IsInt()
  @Min(0)
  @Max(MAX_CENT)
  priceCent: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(MAX_CENT)
  originCent?: number | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsInt()
  sort?: number;
}

export class CreateProductDto extends UpdateProductDto {
  @IsIn(Object.values(ProductType))
  type: ProductType;
}

export class ProductStatusDto {
  @IsIn(['DRAFT', 'ONLINE', 'OFFLINE'])
  status: 'DRAFT' | 'ONLINE' | 'OFFLINE';
}

export class ProductItemsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  childProductIds: string[];
}

// ───────── 目录：章节 / 课时 ─────────

export class ChapterDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;
}

export class SortDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];
}

export class LessonDto {
  @IsIn(Object.values(LessonType))
  type: LessonType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;

  /** 腾讯云 VOD FileId（VOD 上传接入前由运营在云点播控制台上传后填写） */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  vodFileId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  audioKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200_000)
  contentHtml?: string | null;

  /** 时长（秒） */
  @IsInt()
  @Min(0)
  @Max(86_400)
  duration: number;

  @IsBoolean()
  isTrial: boolean;

  @IsInt()
  @Min(0)
  @Max(86_400)
  trialSeconds: number;
}

// ───────── 线下课场次 ─────────

export class OfflineSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @IsInt()
  @Min(1)
  @Max(10_000)
  quota: number;

  @IsInt()
  @Min(1)
  @Max(MAX_CENT)
  depositCent: number;

  @IsInt()
  @Min(0)
  @Max(MAX_CENT)
  balanceCent: number;

  @IsDateString()
  balanceDueAt: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

// ───────── 每日 60 秒音频 ─────────

export class DailyAudioQueryDto extends PageQueryDto {
  @IsOptional()
  @Type(() => String)
  @IsIn(['DRAFT', 'ONLINE', 'OFFLINE'])
  status?: 'DRAFT' | 'ONLINE' | 'OFFLINE';
}

export class DailyAudioDto extends VisibleToDto {
  /** YYYY-MM-DD */
  @IsDateString({ strict: true })
  publishDate: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  audioKey: string;

  @IsInt()
  @Min(1)
  @Max(600)
  duration: number;

  @IsIn(['DRAFT', 'ONLINE', 'OFFLINE'])
  status: 'DRAFT' | 'ONLINE' | 'OFFLINE';
}
