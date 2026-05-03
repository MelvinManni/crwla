import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';

@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  async search(
    @Query('q') q: string,
    @Query('source') sourceCsv?: string,
    @Query('location') locationCsv?: string,
    @Query('since') since?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!q || !q.trim()) return { mode: 'noop', hits: [] };
    return this.svc.search({
      q: q.trim(),
      sources: sourceCsv ? sourceCsv.split(',').map((s) => s.trim()).filter(Boolean) : [],
      locations: locationCsv ? locationCsv.split(',').map((s) => s.trim()).filter(Boolean) : [],
      since: since ? new Date(since) : undefined,
      limit: limit ? Math.min(100, Math.max(1, Number(limit))) : 25,
      offset: offset ? Math.max(0, Number(offset)) : 0,
    });
  }
}
