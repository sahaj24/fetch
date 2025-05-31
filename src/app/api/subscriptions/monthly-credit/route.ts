import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/supabase/config";
import { addSubscriptionCoins } from "@/utils/coinUtils";

// This route will be called by a cron job to credit monthly coins to subscribers
export async function POST(req: NextRequest) {
  try {
    // Check for API key authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = authHeader.split(" ")[1];
    // Verify API key matches the environment variable
    if (apiKey !== process.env.SUBSCRIPTION_CRON_API_KEY) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    // Get all active subscribers from the database
    const { data: activeSubscribers, error: fetchError } = await supabase
      .from("user_subscriptions")
      .select("user_id, plan_name, subscription_id, last_payment_date")
      .eq("status", "active");

    if (fetchError) {
      console.error("Error fetching active subscribers:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch subscribers" },
        { status: 500 }
      );
    }

    // Get the pricing plans to determine how many coins to credit
    const { data: pricingPlans, error: plansError } = await supabase
      .from("pricing_plans")
      .select("name, monthly_coins");

    if (plansError) {
      console.error("Error fetching pricing plans:", plansError);
      return NextResponse.json(
        { error: "Failed to fetch pricing plans" },
        { status: 500 }
      );
    }

    // Create a map of plan names to monthly coins
    const planCoinsMap = pricingPlans.reduce((map: any, plan) => {
      map[plan.name] = plan.monthly_coins;
      return map;
    }, {});

    // Process each active subscriber
    const results = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const subscriber of activeSubscribers) {
      try {
        // Check if we already credited coins this month
        const lastPaymentDate = subscriber.last_payment_date
          ? new Date(subscriber.last_payment_date)
          : null;

        // Skip if already credited this month
        if (
          lastPaymentDate &&
          lastPaymentDate.getMonth() === currentMonth &&
          lastPaymentDate.getFullYear() === currentYear
        ) {
          results.push({
            userId: subscriber.user_id,
            status: "skipped",
            reason: "Already credited this month",
          });
          continue;
        }

        // Get the number of coins for this plan
        const coinsToAdd = planCoinsMap[subscriber.plan_name] || 0;
        if (coinsToAdd === 0) {
          results.push({
            userId: subscriber.user_id,
            status: "skipped",
            reason: "Invalid plan or zero coins",
          });
          continue;
        }

        // Add the subscription coins to the user's balance
        const success = await addSubscriptionCoins(
          subscriber.user_id,
          subscriber.plan_name,
          coinsToAdd
        );

        if (success) {
          // Update the last payment date
          await supabase
            .from("user_subscriptions")
            .update({ last_payment_date: now.toISOString() })
            .eq("user_id", subscriber.user_id);

          results.push({
            userId: subscriber.user_id,
            status: "credited",
            coins: coinsToAdd,
            plan: subscriber.plan_name,
          });
        } else {
          results.push({
            userId: subscriber.user_id,
            status: "failed",
            reason: "Failed to add coins",
          });
        }
      } catch (error: any) {
        console.error(
          `Error processing subscriber ${subscriber.user_id}:`,
          error
        );
        results.push({
          userId: subscriber.user_id,
          status: "error",
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error("Error in monthly credit processing:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
