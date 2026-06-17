import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { QueryCasesDto } from './dto/query-cases.dto';

@Injectable()
export class CasesService {
  constructor(private readonly prisma: PrismaService) {}

  // Auto-generate case number: CST{YYYY}{MM}{0001..}
  private async generateCaseNumber(): Promise<string> {
    const d = new Date();
    const prefix = `CST${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    const last = await this.prisma.case.findFirst({
      where: { caseNumber: { startsWith: prefix } },
      orderBy: { id: 'desc' },
      select: { caseNumber: true },
    });
    const seq = last ? parseInt(last.caseNumber.slice(-4), 10) + 1 : 1;
    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  async findAll(query: QueryCasesDto) {
    const { status, priority, search } = query;
    const where: Prisma.CaseWhereInput = {};

    if (status && status !== 'All') where.status = status;
    if (priority && priority !== 'All') where.priority = priority;
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { subject: { contains: search } },
        { caseNumber: { contains: search } },
      ];
    }

    return this.prisma.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async stats() {
    const total = await this.prisma.case.count();
    const byStatusRaw = await this.prisma.case.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const byPriorityRaw = await this.prisma.case.groupBy({
      by: ['priority'],
      _count: { _all: true },
    });

    return {
      total,
      byStatus: byStatusRaw.map((r) => ({ status: r.status, count: r._count._all })),
      byPriority: byPriorityRaw.map((r) => ({ priority: r.priority, count: r._count._all })),
    };
  }

  async findOne(id: number) {
    const found = await this.prisma.case.findUnique({
      where: { id },
      include: { notes: { orderBy: { createdAt: 'asc' } } },
    });
    if (!found) throw new NotFoundException('Case not found');
    return found;
  }

  async create(dto: CreateCaseDto) {
    const caseNumber = await this.generateCaseNumber();
    return this.prisma.case.create({
      data: {
        caseNumber,
        customerName: dto.customerName,
        customerContact: dto.customerContact ?? '',
        category: dto.category,
        priority: dto.priority ?? 'Medium',
        subject: dto.subject,
        description: dto.description ?? '',
        assignee: dto.assignee ?? '',
      },
    });
  }

  async update(id: number, dto: UpdateCaseDto) {
    await this.ensureExists(id);

    const data: Prisma.CaseUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.assignee !== undefined) data.assignee = dto.assignee;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.customerContact !== undefined) data.customerContact = dto.customerContact;

    if (Object.keys(data).length === 0) {
      // Nothing to update — return current record.
      return this.prisma.case.findUnique({ where: { id } });
    }

    return this.prisma.case.update({ where: { id }, data });
  }

  async addNote(id: number, dto: CreateNoteDto) {
    await this.ensureExists(id);
    const note = await this.prisma.note.create({
      data: { caseId: id, author: dto.author, content: dto.content },
    });
    // Touch the case so updatedAt reflects activity.
    await this.prisma.case.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    return note;
  }

  async remove(id: number) {
    await this.ensureExists(id);
    // notes are removed via onDelete: Cascade
    await this.prisma.case.delete({ where: { id } });
    return { message: 'Case deleted successfully' };
  }

  private async ensureExists(id: number) {
    const found = await this.prisma.case.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Case not found');
  }
}
