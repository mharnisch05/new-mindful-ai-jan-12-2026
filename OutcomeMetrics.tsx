export const OutcomeMetrics = () => {
    return (
        <section className="py-24 bg-primary text-primary-foreground">
            <div className="container px-4 md:px-6 mx-auto">
                <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-primary-foreground/20">
                    <div className="p-4">
                        <div className="text-4xl md:text-5xl font-bold mb-2">2h+</div>
                        <div className="text-primary-foreground/80 font-medium">Saved daily on admin</div>
                    </div>
                    <div className="p-4">
                        <div className="text-4xl md:text-5xl font-bold mb-2">30%</div>
                        <div className="text-primary-foreground/80 font-medium">Fewer no-shows</div>
                    </div>
                    <div className="p-4">
                        <div className="text-4xl md:text-5xl font-bold mb-2">100%</div>
                        <div className="text-primary-foreground/80 font-medium">HIPAA Compliant</div>
                    </div>
                </div>
            </div>
        </section>
    );
};
