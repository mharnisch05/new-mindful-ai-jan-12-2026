import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Clock, Users } from "lucide-react";

interface HeroProps {
    onBookDemo: () => void;
    onJoinWaitlist: () => void;
}

export const Hero = ({ onBookDemo, onJoinWaitlist }: HeroProps) => {
    return (
        <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24 lg:pt-40 lg:pb-32">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-center">
                    {/* Text Content */}
                    <div className="flex-1 text-center lg:text-left space-y-8 z-10">
                        <Badge variant="secondary" className="px-4 py-2 rounded-full text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
                            <span className="font-semibold">New:</span> Intelligent Client Journeys
                        </Badge>

                        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-foreground">
                            Run a Thriving Practice, <br />
                            <span className="text-primary">Not Just a Business.</span>
                        </h1>

                        <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0">
                            Stop drowning in admin. Mindful AI handles your documentation, scheduling, and billing so you can focus on what matters: your clients.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Button size="lg" className="h-12 px-8 text-lg shadow-lg hover:shadow-xl transition-all" onClick={onBookDemo}>
                                Book a live demo
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 px-8 text-lg" onClick={onJoinWaitlist}>
                                Join early access
                            </Button>
                        </div>

                        <p className="text-sm text-muted-foreground flex items-center justify-center lg:justify-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            HIPAA Compliant
                            <span className="mx-2">•</span>
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            No credit card required
                        </p>
                    </div>

                    {/* Visual Content - Dashboard Mock */}
                    <div className="flex-1 w-full max-w-[600px] lg:max-w-none relative z-10 perspective-1000">
                        <div className="relative rounded-xl bg-background border shadow-2xl overflow-hidden transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-700 ease-out">
                            {/* Mock Header */}
                            <div className="h-12 bg-muted/50 border-b flex items-center px-4 gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                                </div>
                                <div className="mx-auto w-1/3 h-6 bg-muted rounded-md opacity-50" />
                            </div>

                            {/* Mock Content */}
                            <div className="p-6 grid gap-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <Card className="p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                            <Users className="h-4 w-4" />
                                            Active Clients
                                        </div>
                                        <div className="text-2xl font-bold">24</div>
                                        <div className="text-xs text-green-600 font-medium">+3 this week</div>
                                    </Card>
                                    <Card className="p-4 space-y-2">
                                        <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                                            <Clock className="h-4 w-4" />
                                            Hours Saved
                                        </div>
                                        <div className="text-2xl font-bold">12.5</div>
                                        <div className="text-xs text-muted-foreground">Admin automation</div>
                                    </Card>
                                </div>

                                <Card className="p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold">Upcoming Sessions</h3>
                                        <Badge variant="outline">Today</Badge>
                                    </div>
                                    <div className="space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                                    {["JD", "AS", "MK"][i - 1]}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium">Session with {["John Doe", "Sarah Smith", "Mike King"][i - 1]}</div>
                                                    <div className="text-xs text-muted-foreground">cognitive behavioral therapy • 50 min</div>
                                                </div>
                                                <div className="text-sm font-semibold">
                                                    {["10:00", "11:30", "14:00"][i - 1]} AM
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>
                            </div>
                        </div>

                        {/* Decorative blurs */}
                        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl -z-10" />
                        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl -z-10" />
                    </div>
                </div>
            </div>
        </section>
    );
};
