import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LineService } from '../notifications/line.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { QueryCasesDto } from './dto/query-cases.dto';

@Injectable()
export class CasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly line: LineService,
  ) {}

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
      include: {
        notes: { orderBy: { createdAt: 'asc' } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!found) throw new NotFoundException('Case not found');

    const attachments = await Promise.all(
      found.attachments.map(async (a) => ({
        ...a,
        url: this.storage.isEnabled() ? await this.storage.getUrl(a.key) : null,
      })),
    );

    return { ...found, attachments };
  }

  async create(dto: CreateCaseDto) {
    const caseNumber = await this.generateCaseNumber();
    const created = await this.prisma.case.create({
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

    // Fire-and-forget LINE notification (no-op if not configured).
    void this.line.pushCaseCreated(created);

    return created;
  }

  async update(id: number, dto: UpdateCaseDto) {
    const existing = await this.prisma.case.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!existing) throw new NotFoundException('Case not found');

    const data: Prisma.CaseUpdateInput = {};
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.assignee !== undefined) data.assignee = dto.assignee;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.customerContact !== undefined) data.customerContact = dto.customerContact;

    if (Object.keys(data).length === 0) {
      // Nothing to update — return current record.
      return this.prisma.case.findUnique({ where: { id } });
    }

    const updated = await this.prisma.case.update({ where: { id }, data });

    // Fire-and-forget LINE notification on status transitions (no-op if not configured).
    if (dto.status !== undefined && dto.status !== existing.status) {
      void this.line.pushCaseStatusChanged(updated, existing.status);
    }

    return updated;
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

  async addAttachment(caseId: number, file: Express.Multer.File) {
    await this.ensureExists(caseId);
    const key = `cases/${caseId}/${randomUUID()}${extname(file.originalname)}`;
    await this.storage.upload(key, file.buffer, file.mimetype);

    const attachment = await this.prisma.attachment.create({
      data: {
        caseId,
        key,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    });

    return { ...attachment, url: await this.storage.getUrl(key) };
  }

  async removeAttachment(caseId: number, attachmentId: number) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment || attachment.caseId !== caseId) {
      throw new NotFoundException('Attachment not found');
    }

    // Best-effort delete from storage; always remove the DB row.
    try {
      await this.storage.delete(attachment.key);
    } catch {
      // ignore storage errors on cleanup
    }
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return { message: 'Attachment deleted successfully' };
  }

  private async ensureExists(id: number) {
    const found = await this.prisma.case.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Case not found');
  }
}
