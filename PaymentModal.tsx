import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_live_51SQfPlAqpzvXppdtcPmq7FLz0kXmDqoH6N5uqJRxoGBGxOtLqk4gVlLKZSKYJ8UYgPmOu3r5SqhGMaRnoQ4sLbLc00iBFPzYC7");

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    amount: number;
  };
  onPaymentSuccess: () => void;
}

function PaymentForm({ invoice, onSuccess, onClose }: { invoice: PaymentModalProps["invoice"], onSuccess: () => void, onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const createPaymentIntent = async () => {
      try {
        setLoadingIntent(true);
        setInitError(null);
        
        // Set timeout for payment initialization
        timeoutId = setTimeout(() => {
          setInitError("Payment form is taking too long to load. Please try again.");
          setLoadingIntent(false);
        }, 30000); // 30 second timeout

        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
          throw new Error("User not authenticated");
        }

        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: {
            invoiceId: invoice.id,
            amount: invoice.amount,
            email: user.email,
          },
        });

        clearTimeout(timeoutId);

        if (error) {
          console.error("[PAYMENT] Edge function error:", error);
          throw error;
        }
        
        if (!data?.clientSecret) {
          console.error("[PAYMENT] No client secret returned:", data);
          throw new Error("No client secret returned");
        }

        setClientSecret(data.clientSecret);
        setLoadingIntent(false);
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error("[PAYMENT] Error creating payment intent:", error);
        const errorMessage = error.message || "Unable to initialize payment. Please try again.";
        setInitError(errorMessage);
        setLoadingIntent(false);
        toast({
          title: "Payment Setup Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };

    createPaymentIntent();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [invoice, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      toast({
        title: "Payment Not Ready",
        description: "Please wait for payment form to load.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      // Confirm the payment with Stripe
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status !== "succeeded") {
        throw new Error("Payment was not successful");
      }

      // Only update invoice status after Stripe confirms success
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          paid_date: new Date().toISOString().split('T')[0]
        })
        .eq("id", invoice.id);

      if (updateError) {
        console.error("[PAYMENT] Error updating invoice:", updateError);
        throw new Error("Payment succeeded but failed to update invoice status");
      }

      // Update payment record
      await supabase
        .from("payments")
        .update({
          status: "completed",
          stripe_charge_id: paymentIntent.id,
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_payment_intent_id", paymentIntent.id);

      toast({
        title: "Payment Successful",
        description: `Payment of $${invoice.amount.toFixed(2)} received. Invoice #${invoice.invoice_number} is now paid.`,
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("[PAYMENT] Payment error:", error);
      toast({
        title: "Payment Failed",
        description: error.message || "Unable to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  if (loadingIntent) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice Number:</span>
            <span className="font-medium">#{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Due:</span>
            <span className="text-2xl font-bold">${invoice.amount.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">Initializing secure payment form...</p>
          </div>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice Number:</span>
            <span className="font-medium">#{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Due:</span>
            <span className="text-2xl font-bold">${invoice.amount.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="text-center py-8 space-y-4">
          <div className="text-destructive">
            <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">{initError}</p>
          </div>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Invoice Number:</span>
          <span className="font-medium">#{invoice.invoice_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Amount Due:</span>
          <span className="text-2xl font-bold">${invoice.amount.toFixed(2)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Card Details</label>
          <div className="border rounded-md p-4 bg-[#2d2d44] dark:bg-[#2d2d44]">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#e0e0e0",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    "::placeholder": {
                      color: "#9ca3af",
                    },
                  },
                  invalid: {
                    color: "#ef4444",
                    iconColor: "#ef4444",
                  },
                },
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Your payment information is secure and encrypted
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processing}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={processing || !stripe || !clientSecret}
            className="flex-1"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay $${invoice.amount.toFixed(2)}`
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function PaymentModal({ open, onOpenChange, invoice, onPaymentSuccess }: PaymentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Elements stripe={stripePromise}>
            <PaymentForm 
              invoice={invoice} 
              onSuccess={onPaymentSuccess} 
              onClose={() => onOpenChange(false)} 
            />
          </Elements>
        </div>
      </DialogContent>
    </Dialog>
  );
}
