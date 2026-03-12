import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { DemoService } from './demo.service';
import { CreateDemoDto } from './dto/create-demo.dto';
import { UpdateDemoDto } from './dto/update-demo.dto';
import { UserContextService } from '@/common/services/user-context.service';

@Controller('demo')
export class DemoController {
  constructor(
    private readonly demoService: DemoService,
    private readonly userContextService: UserContextService,
  ) {}

  /**
   * 创建 Demo
   * @returns 返回新创建记录的 ID
   */
  @Post()
  async create(@Body() createDemoDto: CreateDemoDto) {
    const id = await this.demoService.create(createDemoDto);
    return { id };
  }

  /**
   * 批量创建 Demo
   * @returns 返回创建的 ID 列表
   */
  @Post('batch')
  async batchCreate(@Body() createDemoDtos: CreateDemoDto[]) {
    const ids = await this.demoService.batchCreate(createDemoDtos);
    return { ids };
  }

  /**
   * 查询所有 Demo
   */
  @Get()
  async findAll() {
    return await this.demoService.findAll();
  }

  /**
   * 获取当前用户信息 - 演示 userContextService 的使用
   */
  @Get('current-user')
  getCurrentUser() {
    const userId = this.userContextService.getCurrentUserId();
    const user = this.userContextService.getCurrentUser();
    const username = this.userContextService.getCurrentUsername();
    const roles = this.userContextService.getCurrentUserRoles();

    return {
      userId,
      username,
      roles,
      fullUser: user,
    };
  }

  /**
   * 分页查询 Demo
   */
  @Get('paginate')
  async paginate(
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '10',
  ) {
    return await this.demoService.paginate(
      parseInt(page, 10),
      parseInt(pageSize, 10),
    );
  }

  /**
   * 查询所有激活的 Demo
   */
  @Get('active')
  async findAllActive() {
    return await this.demoService.findAllActive();
  }

  /**
   * 查询当前用户创建的 Demo
   */
  @Get('my-data')
  async findMyData() {
    // userId 会自动从认证中间件的上下文中获取
    return await this.demoService.findMyData();
  }

  /**
   * 根据名称查询 Demo
   */
  @Get('by-name/:name')
  async findByName(@Param('name') name: string) {
    return await this.demoService.findByName(name);
  }

  /**
   * 根据状态查询 Demo
   */
  @Get('by-status/:status')
  async findByStatus(@Param('status') status: string) {
    return await this.demoService.findByStatus(status);
  }

  /**
   * 根据 ID 查询 Demo
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.demoService.findOne(id);
  }

  /**
   * 更新 Demo
   * @returns 返回是否更新成功
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDemoDto: UpdateDemoDto) {
    const success = await this.demoService.update(id, updateDemoDto);
    return { success };
  }

  /**
   * 恢复软删除的 Demo
   * @returns 返回是否恢复成功
   */
  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    const success = await this.demoService.restore(id);
    return { success };
  }

  /**
   * 删除 Demo（软删除）
   * @returns 返回是否删除成功
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const success = await this.demoService.remove(id);
    return { success };
  }

  /**
   * 批量删除 Demo（软删除）
   * @returns 返回是否删除成功
   */
  @Delete('batch/remove')
  async batchRemove(@Body() body: { ids: string[] }) {
    const success = await this.demoService.batchRemove(body.ids);
    return { success };
  }

  /**
   * 物理删除 Demo
   * @returns 返回是否删除成功
   */
  @Delete(':id/hard')
  async hardRemove(@Param('id') id: string) {
    const success = await this.demoService.hardRemove(id);
    return { success };
  }
}
