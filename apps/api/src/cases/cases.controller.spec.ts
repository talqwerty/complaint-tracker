import { Test } from '@nestjs/testing';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('CasesController', () => {
  let controller: CasesController;
  let service: jest.Mocked<Pick<
    CasesService,
    'findAll' | 'stats' | 'findOne' | 'create' | 'update' | 'addNote' | 'remove'
  >>;

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      stats: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      addNote: jest.fn(),
      remove: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [CasesController],
      providers: [{ provide: CasesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(CasesController);
  });

  it('findAll forwards query filters to the service', () => {
    const query = { status: 'Open', priority: 'High', search: 'abc' };
    service.findAll.mockReturnValue('list' as never);

    expect(controller.findAll(query)).toBe('list');
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('stats delegates to the service', () => {
    service.stats.mockReturnValue('stats' as never);
    expect(controller.stats()).toBe('stats');
    expect(service.stats).toHaveBeenCalledTimes(1);
  });

  it('findOne passes the parsed id', () => {
    service.findOne.mockReturnValue('one' as never);
    expect(controller.findOne(7)).toBe('one');
    expect(service.findOne).toHaveBeenCalledWith(7);
  });

  it('create forwards the dto', () => {
    const dto = { customerName: 'A', category: 'อื่นๆ', subject: 's' };
    service.create.mockReturnValue('created' as never);
    expect(controller.create(dto)).toBe('created');
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('update forwards id and dto', () => {
    const dto = { status: 'Resolved' };
    service.update.mockReturnValue('updated' as never);
    expect(controller.update(3, dto)).toBe('updated');
    expect(service.update).toHaveBeenCalledWith(3, dto);
  });

  it('addNote forwards id and dto', () => {
    const dto = { author: 'a', content: 'c' };
    service.addNote.mockReturnValue('note' as never);
    expect(controller.addNote(3, dto)).toBe('note');
    expect(service.addNote).toHaveBeenCalledWith(3, dto);
  });

  it('remove passes the parsed id', () => {
    service.remove.mockReturnValue('removed' as never);
    expect(controller.remove(9)).toBe('removed');
    expect(service.remove).toHaveBeenCalledWith(9);
  });
});
