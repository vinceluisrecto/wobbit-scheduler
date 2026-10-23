import { HomeCallToAction, HomeHero, HomeHowItWorks, HomeThisWeek } from '@/components/home';

export default function HomePage() {
  return (
    <>
      <HomeHero />
      <HomeHowItWorks />
      <HomeThisWeek />
      <HomeCallToAction />
    </>
  );
}
