import { Brain, Calendar, CreditCard, MessageSquare, Shield, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const FeaturesGrid = () => {
    const features = [
        {
            icon: Brain,
            title: "Smart Documentation",
            description: "AI that listens (securely) and drafts your SOAP notes, letters, and intake forms in seconds."
        },
        {
            icon: Calendar,
            title: "Zero-Friction Scheduling",
            description: "Intelligent booking that minimizes gaps and automatically handles reschedules and reminders."
        },
        {
            icon: MessageSquare,
            title: "Secure Telehealth",
            description: "Built-in, HIPAA-compliant video calls with integrated whiteboard and screen sharing."
        },
        {
            icon: Sparkles,
            title: "Client Journeys",
            description: "Assign digital homework, track mood trends, and keep clients engaged between sessions."
        },
        {
            icon: CreditCard,
            title: "Automated Billing",
            description: "Seamless insurance claims, credit card processing, and superbill generation."
        },
        {
            icon: Shield,
            title: "Bank-Level Security",
            description: "Fully HIPAA compliant with end-to-end encryption for peace of mind."
        }
    ];

    return (
        <section className="py-24 bg-muted/30">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">
                        Everything Your Practice Needs
                    </h2>
                    <p className="text-muted-foreground text-lg">
                        Replace your subscriptions to 5 different tools with one unified operating system.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <Card key={i} className="border-none shadow-md hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                    <feature.icon className="h-6 w-6 text-primary" />
                                </div>
                                <CardTitle className="text-xl">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground">
                                    {feature.description}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};
