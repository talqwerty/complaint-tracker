import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CasesService } from './cases.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { CreateNoteDto } from './dto/create-note.dto';
import { QueryCasesDto } from './dto/query-cases.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CasesController {
  constructor(private readonly cases: CasesService) {}

  @Get()
  findAll(@Query() query: QueryCasesDto) {
    return this.cases.findAll(query);
  }

  // NOTE: keep `stats` above `:id` so it is not captured as an id param.
  @Get('stats')
  stats() {
    return this.cases.stats();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.cases.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCaseDto) {
    return this.cases.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCaseDto,
  ) {
    return this.cases.update(id, dto);
  }

  @Post(':id/notes')
  addNote(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateNoteDto,
  ) {
    return this.cases.addNote(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.cases.remove(id);
  }
}
