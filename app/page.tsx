import Hero from '@/components/sections/Hero';
import WhatYoullExperience from '@/components/sections/WhatYoullExperience';
import DailySchedule from '@/components/sections/DailySchedule';
import DoesThisSoundLikeYou from '@/components/sections/DoesThisSoundLikeYou';
import Testimonials from '@/components/sections/Testimonials';
import VideoTestimonialsMarquee from '@/components/sections/VideoTestimonialsMarquee';
// import HallOfFame from '@/components/sections/HallOfFame';
import ValueStack from '@/components/sections/ValueStack';
import MeetAnkita from '@/components/sections/MeetAnkita';
import BodyWorxMethod from '@/components/sections/BodyWorxMethod';
import TwoOptions from '@/components/sections/TwoOptions';
import FAQ from '@/components/sections/FAQ';
import FinalCTA from '@/components/sections/FinalCTA';
import StickyMobileCTA from '@/components/StickyMobileCTA';

export default function HomePage() {
  return (
    <>
      <main>
        {/* 1. Hero offer */}
        <Hero />

        {/* 2. What You'll Experience in 3 Days */}
        <WhatYoullExperience />

        {/* 3. Your 3-Day Schedule */}
        <DailySchedule />

        {/* 4. Does this sound like you? - pain-point qualification */}
        <DoesThisSoundLikeYou />

        {/* 5. Why Pregnant Moms Trust BodyWorx - testimonials */}
        <Testimonials />

        {/* 5a. Video reels + long-form text reviews - dual marquee */}
        <VideoTestimonialsMarquee />

        {/* 5b. Hall of Fame - transformation marquees */}
        {/* <HallOfFame /> */}

        {/* 6. GET INSTANT ACCESS - primary value stack */}
        <ValueStack variant="primary" />

        {/* 7. Meet Dr. Ankita */}
        <MeetAnkita />

        {/* 8. Why this works - The BodyWorx Method */}
        <BodyWorxMethod />

        {/* 9. Let's be honest - Two-option comparison */}
        <TwoOptions />

        {/* 11. FAQ */}
        <FAQ />

        {/* 12. Final CTA */}
        <FinalCTA />
      </main>
      <StickyMobileCTA />
    </>
  );
}
