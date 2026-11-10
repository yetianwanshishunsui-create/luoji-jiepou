import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsMobilePhone, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';
import { IdentityType, PROVINCES } from '@luoji/shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const TEXT_MSG = '请填写文字内容';
const isDoctor = (o: { identityType?: string }) => o.identityType === IdentityType.DOCTOR;

/**
 * 认证提交：
 * - 医生：姓名、省份、城市、机构、科室、电话、执业证照片，全部必填
 * - 从业者：电话、机构、职位必填；工作证 / 胸牌照片选传
 */
export class SubmitCertDto {
  @ApiProperty({ enum: Object.values(IdentityType) })
  @IsIn(Object.values(IdentityType))
  identityType: IdentityType;

  @ApiPropertyOptional({ description: '姓名（医生必填）' })
  @ValidateIf(isDoctor)
  @Transform(trim)
  @IsString({ message: TEXT_MSG })
  @IsNotEmpty({ message: '请填写姓名' })
  @MaxLength(32, { message: '内容过长，最多 32 字' })
  realName?: string;

  @ApiPropertyOptional({ description: '省份（医生必填）', enum: PROVINCES })
  @ValidateIf(isDoctor)
  @IsIn(PROVINCES, { message: '请选择省份' })
  province?: string;

  @ApiPropertyOptional({ description: '城市（医生必填）' })
  @ValidateIf(isDoctor)
  @Transform(trim)
  @IsString({ message: TEXT_MSG })
  @IsNotEmpty({ message: '请填写城市' })
  @MaxLength(32, { message: '内容过长，最多 32 字' })
  city?: string;

  @ApiProperty({ description: '医院 / 机构名称' })
  @Transform(trim)
  @IsString({ message: TEXT_MSG })
  @IsNotEmpty({ message: '请填写所在机构' })
  @MaxLength(128, { message: '内容过长，最多 128 字' })
  organization: string;

  @ApiPropertyOptional({ description: '科室（医生必填）' })
  @ValidateIf(isDoctor)
  @Transform(trim)
  @IsString({ message: TEXT_MSG })
  @IsNotEmpty({ message: '请填写科室' })
  @MaxLength(64, { message: '内容过长，最多 64 字' })
  department?: string;

  @ApiPropertyOptional({ description: '职位（从业者必填）' })
  @ValidateIf((o: SubmitCertDto) => o.identityType === IdentityType.PRACTITIONER)
  @Transform(trim)
  @IsString({ message: TEXT_MSG })
  @IsNotEmpty({ message: '请填写职位' })
  @MaxLength(64, { message: '内容过长，最多 64 字' })
  position?: string;

  @ApiProperty({ description: '联系电话' })
  @IsMobilePhone('zh-CN', {}, { message: '请填写正确的手机号' })
  phone: string;

  @ApiProperty({ description: '已直传到私有桶的证件对象 key（医生至少 1 张执业证照片）', type: [String] })
  @IsArray()
  @ValidateIf(isDoctor)
  @ArrayMinSize(1, { message: '请上传执业证照片' })
  @ArrayMaxSize(6)
  @Matches(/^cert\/[\w\-/.]+$/, { each: true, message: '证件文件路径不合法' })
  files: string[];
}

export class ReviewCertDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT'] })
  @IsIn(['APPROVE', 'REJECT'])
  action: 'APPROVE' | 'REJECT';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  rejectReason?: string;
}
