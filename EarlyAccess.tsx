import { Button } from "@/components/ui/button";
import { Check, Star, Zap } from "lucide-react";

interface EarlyAccessProps {
    onJoinWaitlist: () => void;
}

export const EarlyAccess = ({ onJoinWaitlist }: EarlyAccessProps) => {
    return (
        <section className="py-24 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="bg-card border rounded-3xl p-8 md:p-12 lg:p-16 shadow-xl max-w-5xl mx-auto overflow-hidden relative">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                    <div className="grid md:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                                <Star className="h-4 w-4 fill-primary" />
                                Limited Availability
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                                Join the Founding Community
                            </h2>
                            <p className="text-muted-foreground text-lg">
                                We're opening up spots gradually to ensure the best experience. Secure your place in line and get exclusive benefits.
                            </p>
                            <Button size="lg" className="h-12 px-8 text-lg w-full md:w-auto" onClick={onJoinWaitlist}>
                                Join Early Access
                            </Button>
                        </div>

                        <div className="space-y-4 bg-background/50 p-6 rounded-2xl border backdrop-blur-sm">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Zap className="h-5 w-5 text-yellow-500" />
                                Founding Member Perks
                            </h3>
                            <ul className="space-y-3">
                                {[
                                    "Lock in preferred pricing for life",
                                    "Priority 1:1 onboarding & data migration",
                                    "Direct access to product roadmap",
                                    "Exclusive 'Founder' profile badge"
                                ].map((perk, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                                            <Check className="h-3 w-3 text-green-600 dark:text-green-400" />
                                        </div>
                                        <span className="text-sm font-medium">{perk}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
