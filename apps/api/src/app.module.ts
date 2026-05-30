import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { MailModule } from './core/mail/mail.module';
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
import { ShareModule } from './modules/share/share.module';
import { DigestModule } from './modules/digest/digest.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { QueuesModule } from './queues/queues.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule,
    // Global rate limit. Default applies to every route; auth routes tighten
    // it with @Throttle, and the Polar webhook opts out with @SkipThrottle.
    // In-memory store — fine for a single instance; swap in a Redis storage
    // adapter when running multiple API replicas.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: (config.get<number>('THROTTLE_TTL_SECONDS', 60) ?? 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 120) ?? 120,
          },
        ],
      }),
    }),
    PrismaModule,
    MailModule,
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
    ShareModule,
    DigestModule,
    NotificationsModule,
    QueuesModule,
    TasksModule,
  ],
  providers: [
    // Apply the rate limiter globally.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
