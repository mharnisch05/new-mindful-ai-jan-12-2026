import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ = () => {
    const faqs = [
        {
            question: "Is Mindful AI HIPAA compliant?",
            answer: "Yes, absolutely. We use bank-level encryption (AES-256) for all data at rest and in transit. We sign a BAA (Business Associate Agreement) with every practice to ensure full compliance."
        },
        {
            question: "Can I migrate data from my current EMR?",
            answer: "Yes. Our concierge onboarding team handles the migration for you. We can import client lists, notes, and appointment history from SimplePractice, TherapyNotes, and others."
        },
        {
            question: "Is this suitable for solo practitioners?",
            answer: "Perfectly. Mindful AI is built to scale with you, whether you're a solo provider just starting out or a group practice with 50+ clinicians."
        },
        {
            question: "Does it support telehealth?",
            answer: "Yes, we have a built-in, secure video platform. No need to pay for Zoom or Google Meet separately. It includes screen sharing and interactive whiteboards."
        },
        {
            question: "What do Early Access members get?",
            answer: "Founding members receive locked-in preferred pricing for life, priority access to new features, and white-glove onboarding support directly from our product team."
        }
    ];

    return (
        <section className="py-24 bg-muted/30">
            <div className="container px-4 md:px-6 mx-auto max-w-3xl">
                <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
                    Frequently Asked Questions
                </h2>
                <Accordion type="single" collapsible className="w-full">
                    {faqs.map((faq, i) => (
                        <AccordionItem key={i} value={`item-${i}`}>
                            <AccordionTrigger className="text-left text-lg">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground text-base">
                                {faq.answer}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
};
