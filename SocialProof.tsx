
export const SocialProof = () => {
    return (
        <section className="py-12 border-y bg-muted/30">
            <div className="container px-4 md:px-6 mx-auto text-center">
                <p className="text-sm font-medium text-muted-foreground mb-8 uppercase tracking-wider">
                    Trusted by forward-thinking practices
                </p>

                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-70 mb-16 grayscale">
                    {["Thrive Group", "Mindful Practice", "Wellness Center", "Cognitive Care", "Family Therapy"].map((name) => (
                        <div key={name} className="text-xl font-bold font-serif text-foreground/60">
                            {name}
                        </div>
                    ))}
                </div>

                <div className="max-w-3xl mx-auto">
                    <blockquote className="text-2xl md:text-3xl font-medium leading-normal mb-8 text-foreground/90">
                        "Mindful AI hasn't just saved me time—it's brought the joy back into my practice. I'm no longer dreading Sunday night documentation."
                    </blockquote>
                    <div className="flex items-center justify-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-500" />
                        <div className="text-left">
                            <div className="font-semibold">Dr. Sarah Jenkins</div>
                            <div className="text-sm text-muted-foreground">Founder, Thrive Group Practice</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
