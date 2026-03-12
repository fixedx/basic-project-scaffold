import { IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SortItem {
  @IsNotEmpty({ message: 'ID不能为空' })
  id: string;

  @IsNotEmpty({ message: '排序不能为空' })
  sort: number;
}

export class SortBannerDto {
  @IsNotEmpty({ message: '排序数据不能为空' })
  @IsArray({ message: '排序数据必须是数组' })
  @ValidateNested({ each: true })
  @Type(() => SortItem)
  items: SortItem[];
}
