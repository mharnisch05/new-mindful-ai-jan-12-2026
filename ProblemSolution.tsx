import { Check, X } from "lucide-react";

export const ProblemSolution = () => {
    return (
        <section className="py-24 bg-background">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid md:grid-cols-2 gap-12 lg:gap-24">
                    {/* Create urgency/pain */}
                    <div className="space-y-8">
                        <h2 className="text-3xl font-bold tracking-tight">The Old Way</h2>
                        <p className="text-muted-foreground text-lg">
                            Most EMRs feel like they were built in 1999. They're clunky, slow, and actively get in the way of client care.
                        </p>
                        <ul className="space-y-4">
                            {[
                                "Disconnected tools for billing, scheduling, and notes",
                                "Hours of unpaid admin work every week",
                                "Client engagement drops off between sessions",
                                "Generic, cookie-cutter treatment plans"
                            ].map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-red-900/60 dark:text-red-300/60">
                                    <X className="h-6 w-6 shrink-0 text-red-500" />
                                    <span className="font-medium">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Provide the solution */}
                    <div className="space-y-8 relative">
                        <div className="absolute inset-0 bg-primary/5 -z-10 rounded-3xl transform rotate-2 scale-105" />
                        <div className="bg-card border rounded-2xl p-8 shadow-lg">
                            <h2 className="text-3xl font-bold tracking-tight text-primary">The Mindful AI Way</h2>
                            <p className="text-muted-foreground text-lg mb-8 mt-4">
                                A modern, unified operating system designed for the future of mental healthcare.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "One beautiful platform for your entire practice",
                                    "AI-assisted documentation that drafts itself",
                                    "Engaging client portals with homework & tracking",
                                    "Automated billing and smart scheduling"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <Check className="h-6 w-6 shrink-0 text-green-500" />
                                        <span className="font-medium">{item}</span>
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
