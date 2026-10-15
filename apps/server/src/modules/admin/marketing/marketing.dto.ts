import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../../../common/dto/page.dto';

const MAX_CENT = 10_000_000;
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

// ───────── 价格策略 ─────────

export class PriceRuleQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  /** active 进行中 / upcoming 未开始 / ended 已结束 */
  @IsOptional()
  @IsIn(['active', 'upcoming', 'ended'])
  phase?: 'active' | 'upcoming' | 'ended';
}

export class PriceRuleDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsIn(['EARLY_BIRD', 'LIMITED_TIME'])
  type: 'EARLY_BIRD' | 'LIMITED_TIME';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CENT)
  priceCent: number;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsBoolean()
  enabled: boolean;
}

// ───────── 优惠券 ─────────

export class CouponQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['active', 'upcoming', 'ended', 'disabled'])
  phase?: 'active' | 'upcoming' | 'ended' | 'disabled';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  keyword?: string;
}

export class CouponDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '请填写名称' })
  @MaxLength(64)
  name: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  description?: string | null;

  @IsIn(['FULL_REDUCTION', 'DIRECT'])
  type: 'FULL_REDUCTION' | 'DIRECT';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_CENT)
  thresholdCent: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CENT)
  discountCent: number;

  @IsIn(['ALL', 'CATEGORY', 'PRODUCT'])
  scope: 'ALL' | 'CATEGORY' | 'PRODUCT';

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsString({ each: true })
  scopeIds: string[];

  /** 0 表示不限 */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  totalCount: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perUserLimit: number;

  @IsBoolean()
  claimable: boolean;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validTo: string;

  @IsBoolean()
  enabled: boolean;
}

export class CouponEnabledDto {
  @IsBoolean()
  enabled: boolean;
}

export class IssueCouponDto {
  /** 发放对象：11 位手机号或用户 ID，可混合 */
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  targets: string[];
}

export class CouponRecordQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['UNUSED', 'LOCKED', 'USED', 'EXPIRED'])
  status?: 'UNUSED' | 'LOCKED' | 'USED' | 'EXPIRED';
}
