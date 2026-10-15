import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IdentityType } from '@luoji/shared';

export class SubmitCertDto {
  @ApiProperty({ enum: Object.values(IdentityType) })
  @IsIn(Object.values(IdentityType))
  identityType: IdentityType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  realName: string;

  @ApiPropertyOptional({ description: '执业证号 / 资格证号' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  licenseNo?: string;

  @ApiPropertyOptional({ description: '医院 / 机构名称' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  organization?: string;

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
