import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IdentityType } from '@luoji/shared';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class SubmitCertDto {
  @ApiProperty({ enum: Object.values(IdentityType) })
  @IsIn(Object.values(IdentityType))
  identityType: IdentityType;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  realName: string;

  @ApiProperty({ description: '执业证号 / 资格证号' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '请填写执业证号 / 资格证号' })
  @MaxLength(64)
  licenseNo: string;

  @ApiProperty({ description: '医院 / 机构名称' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: '请填写所在医院 / 机构' })
  @MaxLength(128)
  organization: string;

  @ApiProperty({ description: '已直传到私有桶的证件对象 key', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
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
