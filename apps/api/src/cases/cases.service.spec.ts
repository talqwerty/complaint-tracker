import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CasesService } from './cases.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LineService } from '../notifications/line.service';

type PrismaMock = {
  case: {
    findFirst: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    count: jest.Mock;
    groupBy: jest.Mock;
  };
  note: {
    create: jest.Mock;
  };
  attachment: {
    findUnique: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
};

function createPrismaMock(): PrismaMock {
  return {
    case: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    note: {
      create: jest.fn(),
    },
    attachment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('CasesService', () => {
  let service: CasesService;
  let prisma: PrismaMock;
  let storage: {
    isEnabled: jest.Mock;
    upload: jest.Mock;
    getUrl: jest.Mock;
    delete: jest.Mock;
  };
  let line: { pushCaseCreated: jest.Mock; pushCaseStatusChanged: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    storage = {
      isEnabled: jest.fn().mockReturnValue(false),
      upload: jest.fn(),
      getUrl: jest.fn(),
      delete: jest.fn(),
    };
    line = {
      pushCaseCreated: jest.fn().mockResolvedValue(undefined),
      pushCaseStatusChanged: jest.fn().mockResolvedValue(undefined),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: LineService, useValue: line },
      ],
    }).compile();

    service = moduleRef.get(CasesService);
  });

  describe('create', () => {
    it('generates a fresh CST case number and defaults priority to Medium', async () => {
      prisma.case.findFirst.mockResolvedValue(null);
      prisma.case.create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

      const result = await service.create({
        customerName: 'ACME',
        category: 'อื่นๆ',
        subject: 'test',
      });

      expect(prisma.case.create).toHaveBeenCalledTimes(1);
      const data = prisma.case.create.mock.calls[0][0].data;
      expect(data.caseNumber).toMatch(/^CST\d{6}0001$/);
      expect(data.priority).toBe('Medium');
      expect(result.caseNumber).toMatch(/^CST\d{6}0001$/);
      // notifies LINE on creation
      expect(line.pushCaseCreated).toHaveBeenCalledTimes(1);
    });

    it('increments the sequence from the latest case number', async () => {
      prisma.case.findFirst.mockResolvedValue({ caseNumber: 'CST2026060041' });
      prisma.case.create.mockImplementation(({ data }) => Promise.resolve({ id: 42, ...data }));

      await service.create({ customerName: 'ACME', category: 'อื่นๆ', subject: 'x' });

      const data = prisma.case.create.mock.calls[0][0].data;
      expect(data.caseNumber.slice(-4)).toBe('0042');
    });
  });

  describe('findAll', () => {
    it('builds an OR search filter and ignores "All" sentinels', async () => {
      prisma.case.findMany.mockResolvedValue([]);

      await service.findAll({ status: 'All', priority: 'High', search: 'abc' });

      const arg = prisma.case.findMany.mock.calls[0][0];
      expect(arg.where.status).toBeUndefined();
      expect(arg.where.priority).toBe('High');
      expect(arg.where.OR).toHaveLength(3);
      expect(arg.orderBy).toEqual({ createdAt: 'desc' });
    });
  });

  describe('findAll without filters', () => {
    it('queries with an empty where clause', async () => {
      prisma.case.findMany.mockResolvedValue([]);

      await service.findAll({});

      const arg = prisma.case.findMany.mock.calls[0][0];
      expect(arg.where).toEqual({});
    });
  });

  describe('stats', () => {
    it('aggregates total and flattens groupBy results', async () => {
      prisma.case.count.mockResolvedValue(3);
      prisma.case.groupBy
        .mockResolvedValueOnce([
          { status: 'Open', _count: { _all: 2 } },
          { status: 'Resolved', _count: { _all: 1 } },
        ])
        .mockResolvedValueOnce([{ priority: 'High', _count: { _all: 3 } }]);

      const result = await service.stats();

      expect(result.total).toBe(3);
      expect(result.byStatus).toEqual([
        { status: 'Open', count: 2 },
        { status: 'Resolved', count: 1 },
      ]);
      expect(result.byPriority).toEqual([{ priority: 'High', count: 3 }]);
    });
  });

  describe('findOne', () => {
    it('returns the case with notes and attachments', async () => {
      const found = {
        id: 1,
        caseNumber: 'CST2026060001',
        notes: [],
        attachments: [],
      };
      prisma.case.findUnique.mockResolvedValue(found);

      const result = await service.findOne(1);

      expect(prisma.case.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          notes: { orderBy: { createdAt: 'asc' } },
          attachments: { orderBy: { createdAt: 'asc' } },
        },
      });
      expect(result).toMatchObject({ id: 1, caseNumber: 'CST2026060001' });
      expect(result.attachments).toEqual([]);
    });

    it('adds signed URLs to attachments when storage is enabled', async () => {
      prisma.case.findUnique.mockResolvedValue({
        id: 1,
        notes: [],
        attachments: [{ id: 7, key: 'cases/1/abc.png' }],
      });
      storage.isEnabled.mockReturnValue(true);
      storage.getUrl.mockResolvedValue('https://cdn/cases/1/abc.png');

      const result = await service.findOne(1);

      expect(storage.getUrl).toHaveBeenCalledWith('cases/1/abc.png');
      expect(result.attachments[0].url).toBe('https://cdn/cases/1/abc.png');
    });

    it('throws NotFoundException when the case does not exist', async () => {
      prisma.case.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('patches only the provided fields', async () => {
      prisma.case.findUnique.mockResolvedValue({ id: 1, status: 'Open' });
      prisma.case.update.mockResolvedValue({ id: 1, status: 'Resolved' });

      await service.update(1, { status: 'Resolved' });

      expect(prisma.case.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'Resolved' },
      });
    });

    it('notifies LINE with the old and new status on a status change', async () => {
      prisma.case.findUnique.mockResolvedValue({ id: 1, status: 'Open' });
      const updated = { id: 1, status: 'Resolved' };
      prisma.case.update.mockResolvedValue(updated);

      await service.update(1, { status: 'Resolved' });

      expect(line.pushCaseStatusChanged).toHaveBeenCalledTimes(1);
      expect(line.pushCaseStatusChanged).toHaveBeenCalledWith(updated, 'Open');
    });

    it('does not notify LINE when the status is unchanged', async () => {
      prisma.case.findUnique.mockResolvedValue({ id: 1, status: 'Open' });
      prisma.case.update.mockResolvedValue({ id: 1, status: 'Open', assignee: 'bob' });

      await service.update(1, { status: 'Open', assignee: 'bob' });

      expect(line.pushCaseStatusChanged).not.toHaveBeenCalled();
    });

    it('returns the current record without updating when patch is empty', async () => {
      const current = { id: 1, status: 'Open' };
      prisma.case.findUnique
        .mockResolvedValueOnce({ id: 1 }) // ensureExists
        .mockResolvedValueOnce(current); // return current

      const result = await service.update(1, {});

      expect(prisma.case.update).not.toHaveBeenCalled();
      expect(result).toBe(current);
    });

    it('throws NotFoundException for a missing case', async () => {
      prisma.case.findUnique.mockResolvedValue(null);
      await expect(service.update(404, { status: 'Open' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('addNote', () => {
    it('creates a note and touches the case updatedAt', async () => {
      prisma.case.findUnique.mockResolvedValue({ id: 1 });
      const note = { id: 9, caseId: 1, author: 'a', content: 'c' };
      prisma.note.create.mockResolvedValue(note);
      prisma.case.update.mockResolvedValue({ id: 1 });

      const result = await service.addNote(1, { author: 'a', content: 'c' });

      expect(prisma.note.create).toHaveBeenCalledWith({
        data: { caseId: 1, author: 'a', content: 'c' },
      });
      expect(prisma.case.update).toHaveBeenCalledTimes(1);
      const updateArg = prisma.case.update.mock.calls[0][0];
      expect(updateArg.where).toEqual({ id: 1 });
      expect(updateArg.data.updatedAt).toBeInstanceOf(Date);
      expect(result).toBe(note);
    });

    it('throws NotFoundException when the case is missing', async () => {
      prisma.case.findUnique.mockResolvedValue(null);
      await expect(
        service.addNote(404, { author: 'a', content: 'c' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.note.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing case', async () => {
      prisma.case.findUnique.mockResolvedValue({ id: 5 });
      prisma.case.delete.mockResolvedValue({ id: 5 });

      const res = await service.remove(5);

      expect(prisma.case.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(res).toEqual({ message: 'Case deleted successfully' });
    });

    it('throws NotFoundException when the case does not exist', async () => {
      prisma.case.findUnique.mockResolvedValue(null);
      await expect(service.remove(404)).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.case.delete).not.toHaveBeenCalled();
    });
  });

  describe('addAttachment', () => {
    const file = {
      originalname: 'photo.png',
      mimetype: 'image/png',
      size: 1234,
      buffer: Buffer.from('x'),
    } as Express.Multer.File;

    it('uploads to storage, stores the row, and returns a URL', async () => {
      prisma.case.findUnique.mockResolvedValue({ id: 1 }); // ensureExists
      prisma.attachment.create.mockImplementation(({ data }) =>
        Promise.resolve({ id: 5, ...data }),
      );
      storage.getUrl.mockResolvedValue('https://cdn/file.png');

      const result = await service.addAttachment(1, file);

      expect(storage.upload).toHaveBeenCalledTimes(1);
      const [key, buffer, mime] = storage.upload.mock.calls[0];
      expect(key).toMatch(/^cases\/1\/.+\.png$/);
      expect(buffer).toBe(file.buffer);
      expect(mime).toBe('image/png');
      expect(prisma.attachment.create).toHaveBeenCalledTimes(1);
      expect(result.url).toBe('https://cdn/file.png');
      expect(result.filename).toBe('photo.png');
    });

    it('throws NotFoundException for a missing case', async () => {
      prisma.case.findUnique.mockResolvedValue(null);
      await expect(service.addAttachment(404, file)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('removeAttachment', () => {
    it('deletes from storage and DB when it belongs to the case', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 5,
        caseId: 1,
        key: 'cases/1/abc.png',
      });
      prisma.attachment.delete.mockResolvedValue({ id: 5 });

      const result = await service.removeAttachment(1, 5);

      expect(storage.delete).toHaveBeenCalledWith('cases/1/abc.png');
      expect(prisma.attachment.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result).toEqual({ message: 'Attachment deleted successfully' });
    });

    it('throws NotFoundException when the attachment is on another case', async () => {
      prisma.attachment.findUnique.mockResolvedValue({
        id: 5,
        caseId: 999,
        key: 'k',
      });
      await expect(service.removeAttachment(1, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.attachment.delete).not.toHaveBeenCalled();
    });
  });
});
