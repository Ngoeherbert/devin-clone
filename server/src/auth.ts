import "dotenv/config";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const TRIAL_DAYS = 14;

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [process.env.CORS_ORIGIN ?? "http://localhost:5173"],

  // Correct location for ID configuration:
  advanced: {
    database: {
      generateId: "uuid", // or () => crypto.randomUUID()
    },
  },

  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  databaseHooks: {
    user: {
      create: {
        // Every new user gets their own subscription row with its own trial clock —
        // this is what keeps one user's trial from ever touching another's.
        async after(newUser) {
          const trialEndsAt = new Date(
            Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000,
          );
          await db.insert(schema.subscription).values({
            userId: newUser.id,
            plan: "free",
            status: "trialing",
            trialEndsAt,
          });
        },
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    // Sign-up requires OTP verification before the account is usable —
    // see requireEmailVerification below and the email-otp plugin.
    requireEmailVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },

  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 minutes, matches the resend cooldown on the client
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        // type: "email-verification" (signup) | "forget-password" (reset) | "sign-in" | "change-email"
        // Wire up your email provider (Resend, Postmark, SES, etc.) here.
        // Do not await a slow provider on serverless — fire and forget, or use waitUntil.
        console.log(`[email-otp] send ${type} code ${otp} to ${email}`);
      },
    }),
  ],
});
