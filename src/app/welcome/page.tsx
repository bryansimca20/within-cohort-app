import { redirect } from 'next/navigation';
import { requireMember } from '@/lib/session';
import { Onboarding } from '@/components/onboarding/Onboarding';

/** First-run experience, outside the (app) group so it renders on a bare black canvas with no header/nav. Server-gated: an already-onboarded member is sent to Today, so hand-typing /welcome can never replay it. */
export default async function WelcomePage() {
  const member = await requireMember();
  if (member.onboardedAt != null) redirect('/today');
  return <Onboarding name={member.name} />;
}
