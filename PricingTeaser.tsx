import { Button } from "@/components/ui/button";

interface PricingTeaserProps {
    onBookDemo: () => void;
    onJoinWaitlist: () => void;
}

export const PricingTeaser = ({ onBookDemo, onJoinWaitlist }: PricingTeaserProps) => {
    return (
        <section className="py-24 bg-background text-center">
            <div className="container px-4 md:px-6 mx-auto max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight mb-6">
                    Simple, Transparent Pricing
                </h2>
                <p className="text-xl text-muted-foreground mb-8">
                    No hidden fees or complicated tiers. Founding practices get exclusive preferred pricing and white-glove onboarding included.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button size="lg" onClick={onBookDemo}>
                        Book a Live Demo
                    </Button>
                    <Button size="lg" variant="outline" onClick={onJoinWaitlist}>
                        Join Early Access
                    </Button>
                </div>
            </div>
        </section>
    );
};
