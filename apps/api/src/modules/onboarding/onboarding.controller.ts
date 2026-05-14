import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { OnboardingFlow } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { OnboardingService } from './onboarding.service';

const VALID_FLOWS = new Set<OnboardingFlow>([
  'FIRST_LOGIN' as OnboardingFlow,
  'FIRST_CRAWL' as OnboardingFlow,
]);

function parseFlow(raw: string): OnboardingFlow {
  if (!VALID_FLOWS.has(raw as OnboardingFlow)) {
    throw new BadRequestException(`Unknown onboarding flow: ${raw}`);
  }
  return raw as OnboardingFlow;
}

@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('active')
  async active(@CurrentUser() user: AuthenticatedUser) {
    const flows = await this.onboarding.listActive(user.id, user.role);
    return { flows };
  }

  @Post(':flow/dismiss')
  async dismiss(
    @CurrentUser() user: AuthenticatedUser,
    @Param('flow') flowRaw: string,
  ) {
    return this.onboarding.dismiss(user.id, parseFlow(flowRaw));
  }

  @Post(':flow/complete')
  async complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('flow') flowRaw: string,
  ) {
    return this.onboarding.complete(user.id, parseFlow(flowRaw));
  }
}
