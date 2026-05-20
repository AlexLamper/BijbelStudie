import { type NextRequest, NextResponse } from "next/server"
import stripe from "../../../lib/stripe"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../lib/authOptions"
import connectMongoDB from "../../../lib/mongodb"
import User from "../../../models/User"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let { priceId } = body
    const { customerId } = body

    if (!priceId) {
      priceId = process.env.STRIPE_PRICE_ID
    }
    if (!priceId) {
      return NextResponse.json({ error: "Missing priceId" }, { status: 400 })
    }

    const priceIdMode = priceId.startsWith("price_test_") ? "test" : "live"
    const apiKeyMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : "live"

    if (priceIdMode !== apiKeyMode) {
      return NextResponse.json(
        {
          error: "Configuration error",
          details: "Stripe API key and price ID must both be in the same mode (test or live)",
        },
        { status: 400 },
      )
    }

    // Get the current user from the session
    const session = await getServerSession(authOptions)
    let stripeCustomerId = customerId

    // If user is logged in and we don't have a customer ID, create or retrieve one
    if (session?.user?.email && !stripeCustomerId) {
      await connectMongoDB()

      // Find the user in our database
      const user = await User.findOne({ email: session.user.email })

      if (user) {
        // If user exists but doesn't have a Stripe customer ID, create one
        if (!user.stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.name,
            metadata: {
              userId: user._id.toString(),
            },
          })

          // Save the Stripe customer ID to the user record
          user.stripeCustomerId = customer.id
          await user.save()

          stripeCustomerId = customer.id
        } else {
          // Use existing Stripe customer ID
          stripeCustomerId = user.stripeCustomerId
          
          // In test mode, if the customer was created in live mode, create a new test customer
          if (apiKeyMode === "test" && stripeCustomerId.startsWith("cus_")) {
            try {
              // Try to verify the customer exists in test mode
              await stripe.customers.retrieve(stripeCustomerId)
            } catch {
              // Customer doesn't exist in test mode, create a new one
              const testCustomer = await stripe.customers.create({
                email: user.email,
                name: user.name,
                metadata: {
                  userId: user._id.toString(),
                },
              })
              stripeCustomerId = testCustomer.id
            }
          }
        }
      }
    }
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal", "bancontact", "sepa_debit"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.nextUrl.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/canceled`,
      customer: stripeCustomerId || undefined,
      allow_promotion_codes: true,
      billing_address_collection: "required",
    })

    const response = NextResponse.json({ sessionId: stripeSession.id })

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    console.error("[Checkout API] Error creating checkout session:", error)
    const response = NextResponse.json(
      {
        error: "Error creating checkout session",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )

    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  }
}
