import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
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

// ───────── 关于我们 ─────────

class TextLine {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  @MaxLength(20)
  value: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '内容不能为空' })
  @MaxLength(20)
  label: string;
}

class AboutBrandDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '品牌名不能为空' })
  @MaxLength(30)
  name: string;

  @Transform(trim)
  @IsString()
  @MaxLength(30)
  slogan: string;
}

class AboutQuoteDto {
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  text: string;

  @Transform(trim)
  @IsString()
  @MaxLength(30)
  source: string;
}

class AboutCompanyDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '公司介绍标题不能为空' })
  @MaxLength(30)
  title: string;

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(600, { each: true, message: '每段最多 600 字' })
  paragraphs: string[];
}

class AboutFounderDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '创始人姓名不能为空' })
  @MaxLength(16)
  name: string;

  @Transform(trim)
  @IsString()
  @MaxLength(30)
  title: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUrl(URL_OPTS, { message: '照片需为 http(s) 链接' })
  @MaxLength(512)
  photo: string | null;

  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  tags: string[];

  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  bio: string;
}

export class AboutPageDto {
  @ValidateNested()
  @Type(() => AboutBrandDto)
  brand: AboutBrandDto;

  @ValidateNested()
  @Type(() => AboutQuoteDto)
  quote: AboutQuoteDto;

  @ValidateNested()
  @Type(() => AboutCompanyDto)
  company: AboutCompanyDto;

  @ValidateNested()
  @Type(() => AboutFounderDto)
  founder: AboutFounderDto;

  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => TextLine)
  stats: TextLine[];
}

// ───────── 课程顾问 ─────────

export class ConsultDto {
  @IsBoolean()
  enabled: boolean;

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '标题不能为空' })
  @MaxLength(20)
  title: string;

  @Transform(trim)
  @IsString()
  @MaxLength(40)
  desc: string;

  @Transform(trim)
  @IsString()
  @MaxLength(40)
  wechatId: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== '')
  @IsUrl(URL_OPTS, { message: '二维码需为图片链接' })
  @MaxLength(512)
  qrImage: string | null;
}
