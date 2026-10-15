import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const URL_OPTS = { protocols: ['https', 'http'], require_protocol: true, require_tld: false };

class OptionalImage {
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUrl(URL_OPTS, { message: '图片需为 http(s) 链接' })
  @MaxLength(512)
  image: string | null;
}

// ───────── 首页推荐 ─────────

export class HomeSectionDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '栏目标题不能为空' })
  @MaxLength(20)
  title: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20, { message: '每个栏目最多 20 门课程' })
  @IsString({ each: true })
  productIds: string[];
}

export class HomeSlotsDto {
  @IsArray()
  @ArrayMaxSize(6, { message: '最多 6 个栏目' })
  @ValidateNested({ each: true })
  @Type(() => HomeSectionDto)
  sections: HomeSectionDto[];
}

// ───────── 招商页 ─────────

class HeroDto extends OptionalImage {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '主标题不能为空' })
  @MaxLength(30)
  title: string;

  @Transform(trim)
  @IsString()
  @MaxLength(60)
  subtitle: string;
}

class BenefitDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '权益标题不能为空' })
  @MaxLength(20)
  title: string;

  @Transform(trim)
  @IsString()
  @MaxLength(120)
  desc: string;
}

class CaseDto extends OptionalImage {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '案例标题不能为空' })
  @MaxLength(30)
  title: string;

  @Transform(trim)
  @IsString()
  @MaxLength(300)
  desc: string;
}

class FaqDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '问题不能为空' })
  @MaxLength(60)
  q: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '回答不能为空' })
  @MaxLength(500)
  a: string;
}

export class JoinPageDto {
  @ValidateNested()
  @Type(() => HeroDto)
  hero: HeroDto;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => BenefitDto)
  benefits: BenefitDto[];

  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => CaseDto)
  cases: CaseDto[];

  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => FaqDto)
  faqs: FaqDto[];

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  formTitle: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(8)
  submitText: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  successText: string;
}
