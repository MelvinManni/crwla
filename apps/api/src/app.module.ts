import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { ElasticsearchModule } from './integrations/elasticsearch/es.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AccessRequestsModule } from './modules/access-requests/access-requests.module';
import { SearchesModule } from './modules/searches/searches.module';
import { RunsModule } from './modules/runs/runs.module';
import { ResultsModule } from './modules/results/results.module';
import { SearchModule } from './modules/search/search.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { SourcesModule } from './modules/sources/sources.module';
import { BillingModule } from './modules/billing/billing.module';
import { FilterModule } from './modules/filter/filter.module';
import { ContactModule } from './modules/contact/contact.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ActivityModule } from './modules/activity/activity.module';
import { QueuesModule } from './queues/queues.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ElasticsearchModule,
    HealthModule,
    AuthModule,
    UsersModule,
    AccessRequestsModule,
    SearchesModule,
    RunsModule,
    ResultsModule,
    SearchModule,
    AlertsModule,
    ScraperModule,
    SourcesModule,
    BillingModule,
    FilterModule,
    ContactModule,
    OnboardingModule,
    ActivityModule,
    QueuesModule,
    TasksModule,
  ],
})
export class AppModule {}
