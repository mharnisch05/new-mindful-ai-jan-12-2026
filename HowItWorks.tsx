import { FileText, Rocket, UserPlus } from "lucide-react";

export const HowItWorks = () => {
    return (
        <section className="py-24 bg-background">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">
                        Simplicity at its Core
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Get up and running in minutes, not months.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-muted z-0" />

                    {[
                        {
                            icon: Rocket,
                            title: "1. Set up your practice",
                            desc: "Customize your intake forms, branding, and schedule availability in a few clicks."
                        },
                        {
                            icon: UserPlus,
                            title: "2. Invite your team & clients",
                            desc: "Seamlessly import existing data and send welcome invites to your roster."
                        },
                        {
                            icon: FileText,
                            title: "3. Let Mindful AI handle the rest",
                            desc: "Focus on therapy while we handle notes, billing, and reminders automatically."
                        }
                    ].map((step, i) => (
                        <div key={i} className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-24 h-24 rounded-full bg-background border-4 border-muted flex items-center justify-center mb-6 shadow-sm">
                                <step.icon className="h-10 w-10 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                            <p className="text-muted-foreground">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
