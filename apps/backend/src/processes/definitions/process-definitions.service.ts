import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DefinitionStatus } from '../../generated/prisma';
import { CreateDefinitionDto } from './dto/create-definition.dto';
import { UpdateDefinitionDto } from './dto/update-definition.dto';

@Injectable()
export class ProcessDefinitionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgUnitIds: string[], page = 1, pageSize = 20) {
    const where = orgUnitIds.length ? { orgUnitId: { in: orgUnitIds } } : {};
    const [items, total] = await Promise.all([
      this.prisma.processDefinition.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ name: 'asc' }, { version: 'desc' }],
        select: {
          id: true,
          name: true,
          description: true,
          version: true,
          status: true,
          orgUnitId: true,
          formFields: true,
          taskFormFields: true,
          stepConfig: true,
          key: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.processDefinition.count({ where }),
    ]);
    return {
      data: items,
      meta: { total, page, pageSize },
    };
  }

  async findOne(id: string) {
    const def = await this.prisma.processDefinition.findUnique({ where: { id } });
    if (!def) throw new NotFoundException('Không tìm thấy process definition');
    return { data: def };
  }

  async create(dto: CreateDefinitionDto, orgUnitId: string) {
    const def = await this.prisma.processDefinition.create({
      data: {
        name: dto.name,
        description: dto.description,
        bpmnXml: dto.bpmnXml,
        formFields: (dto.formFields ?? null) as never,
        taskFormFields: (dto.taskFormFields ?? null) as never,
        stepConfig: (dto.stepConfig ?? null) as never,
        key: dto.key ?? null,
        orgUnitId,
        version: 1,
        status: DefinitionStatus.DRAFT,
      },
    });
    return { data: def };
  }

  async update(id: string, dto: UpdateDefinitionDto) {
    const existing = await this.prisma.processDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy process definition');

    // Nếu definition đang ACTIVE và có thay đổi bpmnXml → tạo version mới, set cũ về DRAFT
    if (existing.status === DefinitionStatus.ACTIVE && dto.bpmnXml && dto.bpmnXml !== existing.bpmnXml) {
      await this.prisma.processDefinition.update({
        where: { id },
        data: { status: DefinitionStatus.DRAFT },
      });

      const newDef = await this.prisma.processDefinition.create({
        data: {
          name: dto.name ?? existing.name,
          description: dto.description ?? existing.description,
          bpmnXml: dto.bpmnXml,
          formFields: (dto.formFields !== undefined ? dto.formFields : existing.formFields) as never,
          taskFormFields: (dto.taskFormFields !== undefined ? dto.taskFormFields : existing.taskFormFields) as never,
          stepConfig: (dto.stepConfig !== undefined ? dto.stepConfig : existing.stepConfig) as never,
          key: dto.key !== undefined ? dto.key : existing.key,
          orgUnitId: existing.orgUnitId,
          version: existing.version + 1,
          status: DefinitionStatus.ACTIVE,
        },
      });
      return { data: newDef };
    }

    // Nếu chỉ update metadata (name, description) hoặc DRAFT → cập nhật trực tiếp
    const updated = await this.prisma.processDefinition.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        bpmnXml: dto.bpmnXml,
        ...(dto.formFields !== undefined ? { formFields: dto.formFields as never } : {}),
        ...(dto.taskFormFields !== undefined ? { taskFormFields: dto.taskFormFields as never } : {}),
        ...(dto.stepConfig !== undefined ? { stepConfig: dto.stepConfig as never } : {}),
        ...(dto.key !== undefined ? { key: dto.key } : {}),
      },
    });
    return { data: updated };
  }

  async patchStatus(id: string, status: DefinitionStatus) {
    const existing = await this.prisma.processDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy process definition');

    if (status === DefinitionStatus.ACTIVE) {
      if (!existing.bpmnXml) {
        throw new BadRequestException('Definition chưa có BPMN XML');
      }
    }

    const updated = await this.prisma.processDefinition.update({
      where: { id },
      data: { status },
    });
    return { data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.processDefinition.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Không tìm thấy process definition');
    if (existing.status === DefinitionStatus.ACTIVE) {
      throw new BadRequestException('Không thể xoá definition đang kích hoạt');
    }
    await this.prisma.processDefinition.delete({ where: { id } });
    return { message: 'Đã xoá process definition' };
  }

  async findByKey(key: string) {
    const def = await this.prisma.processDefinition.findUnique({
      where: { key },
    });
    if (!def) return null;
    return def;
  }
}
