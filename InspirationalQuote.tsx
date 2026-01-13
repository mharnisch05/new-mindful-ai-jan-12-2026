import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Quote } from "lucide-react";

const quotes = [
  { text: "The only way out is through.", author: "Robert Frost" },
  { text: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne" },
  { text: "Healing takes time, and asking for help is a courageous step.", author: "Mariska Hargitay" },
  { text: "There is hope, even when your brain tells you there isn't.", author: "John Green" },
  { text: "You don't have to control your thoughts. You just have to stop letting them control you.", author: "Dan Millman" },
  { text: "Mental health is not a destination, but a process. It's about how you drive, not where you're going.", author: "Noam Shpancer" },
  { text: "Your present circumstances don't determine where you can go; they merely determine where you start.", author: "Nido Qubein" },
  { text: "What mental health needs is more sunlight, more candor, and more unashamed conversation.", author: "Glenn Close" },
  { text: "Recovery is not one and done. It is a lifelong journey that takes place one day, one step at a time.", author: "Anonymous" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "You are not your illness. You have an individual story to tell. You have a name, a history, a personality. Staying yourself is part of the battle.", author: "Julian Seifter" },
  { text: "Sometimes the bravest and most important thing you can do is just show up.", author: "Brené Brown" },
  { text: "Progress, not perfection.", author: "Anonymous" },
  { text: "It's okay to not be okay. It's just not okay to stay that way.", author: "Anonymous" },
  { text: "Your struggle is part of your story.", author: "Anonymous" },
];

export function InspirationalQuote() {
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    // Select a random quote on mount
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  return (
    <Card className="md:col-span-2">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-full flex-shrink-0">
            <Quote className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-lg font-medium italic mb-2">"{quote.text}"</p>
            <p className="text-sm text-muted-foreground">— {quote.author}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
