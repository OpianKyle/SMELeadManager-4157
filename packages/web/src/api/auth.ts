import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { database } from "./database";
import * as schema from "./database/schema";
import { sendEmail } from "./mailer";

export const createAuth = (baseURL: string) =>
  betterAuth({
    database: drizzleAdapter(database, {
      provider: "mysql",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Set your Masakhe Lead Manager password",
          html: `
            <div style="font-family:'Open Sans',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
              <div style="background:#0f326b;border-radius:3px;padding:20px 24px;margin-bottom:24px;">
                <p style="font-family:'Open Sans',Arial,sans-serif;font-size:18px;font-weight:700;color:#ffffff;margin:0;">Masakhe Lead Manager</p>
              </div>
              <h2 style="color:#0f326b;margin:0 0 16px;">Set your password</h2>
              <p style="color:#192943;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Hi ${user.name || user.email},<br><br>
                Click the button below to set your password and access your Masakhe Lead Manager account.
                This link expires in 1 hour.
              </p>
              <a href="${url}" style="
                display:inline-block;background:#118849;color:#ffffff;
                font-size:14px;font-weight:700;text-decoration:none;
                padding:13px 28px;border-radius:3px;
              ">Set Password →</a>
              <p style="color:#5e708d;font-size:12px;margin:24px 0 0;line-height:1.5;">
                If you were not expecting this email, you can safely ignore it.
              </p>
              <p style="color:#9eafc2;font-size:11px;margin:16px 0 0;">
                © ${new Date().getFullYear()} Masakhe Group (Pty) Ltd
              </p>
            </div>
          `,
        });
      },
    },
    secret: process.env.BETTER_AUTH_SECRET ?? "masakhe-secret-2026",
    baseURL,
    trustedOrigins: async (request) => {
      const origin = request?.headers.get("origin");
      if (origin) return [origin];
      return [];
    },
  });

// Static export for CLI schema generation
export const auth = createAuth("http://localhost:5000");
