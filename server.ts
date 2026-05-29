import express from "express";
import path from "path";
import crypto from "crypto";
import cookieParser from "cookie-parser";
import { createServer as createViteServer } from "vite";

// Generate cryptographic strings for PKCE
function generateCodeVerifier(): string {
  // 32 bytes gives a base64url string of 43 characters
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser());

  // 1. Endpoint to initiate the OAuth flow and generate PKCE values on demand
  app.get("/api/auth/initiate", (req, res) => {
    try {
      // Dynamic client settings or backend env variables fallback
      const clientId = (req.query.client_id as string) || process.env.DERIV_CLIENT_ID || "";
      
      // Compute absolute redirect URI (custom priority, fallback to env APP_URL or request origin)
      let redirectUri = (req.query.redirect_uri as string) || "";
      if (!redirectUri) {
        redirectUri = process.env.APP_URL 
          ? `${process.env.APP_URL}/auth/callback` 
          : `${req.protocol}://${req.get("host")}/auth/callback`;
      }

      if (!clientId) {
        return res.status(400).json({ 
          error: "Missing client_id. Please provide it as a query parameter or configure DERIV_CLIENT_ID in the workspace environment configuration." 
        });
      }

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = generateCodeChallenge(codeVerifier);
      const state = generateState();

      // Store matching challenge details in secure HttpOnly cookie
      res.cookie("deriv_oauth_pkce", JSON.stringify({ codeVerifier, state, clientId, redirectUri }), {
        httpOnly: true,
        secure: true, // required for SameSite=None
        sameSite: "none", // required for cross-origin preview frames
        maxAge: 10 * 60 * 1000 // valid for 10 minutes
      });

      // Assemble full authorization URL
      // Deriv authentication endpoint: https://auth.deriv.com/oauth2/auth
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state
      });

      const authUrl = `https://auth.deriv.com/oauth2/auth?${params.toString()}`;
      res.json({ 
        url: authUrl, 
        redirect_uri: redirectUri,
        codeVerifier,
        codeChallenge,
        state
      });
    } catch (error: any) {
      console.error("Error initiating authorization:", error);
      res.status(500).json({ error: "Failed to initiate authorization flow: " + error.message });
    }
  });

  // 2. Endpoint to receive Deriv OAuth authorization code redirects
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code, state, error: derivError, error_description } = req.query;

    if (derivError) {
      return res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc;">
            <div style="text-align: center; max-width: 450px; padding: 2.5rem; border-radius: 1rem; background-color: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #ef4444; margin-top: 0; font-size: 1.5rem;">✗ Deriv Authorization Error</h2>
              <p style="color: #cbd5e1; margin-bottom: 2rem;">${error_description || derivError}</p>
              <button onclick="window.close()" style="background-color: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer; transition: background-color 0.2s;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }

    const cookieVal = req.cookies.deriv_oauth_pkce;
    if (!cookieVal) {
      return res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc;">
            <div style="text-align: center; max-width: 450px; padding: 2.5rem; border-radius: 1rem; background-color: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #eab308; margin-top: 0; font-size: 1.5rem;">✗ PKCE Session Expired</h2>
              <p style="color: #cbd5e1; margin-bottom: 2rem;">We could not locate your unique challenge parameters. This could be because the session timed out (10 minutes max) or your browser blocked the state cookie.</p>
              <button onclick="window.close()" style="background-color: #eab308; color: #0f172a; border: none; padding: 0.75rem 1.5rem; font-weight: 600; border-radius: 0.375rem; cursor: pointer;">Try Again</button>
            </div>
          </body>
        </html>
      `);
    }

    let parsedCookie;
    try {
      parsedCookie = JSON.parse(cookieVal);
    } catch {
      return res.status(400).send("Invalid PKCE state cookie formatting.");
    }

    const { codeVerifier, state: expectedState, clientId, redirectUri: savedRedirectUri } = parsedCookie;

    // Validate State correlation to prevent CSRF
    if (state !== expectedState) {
      return res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc;">
            <div style="text-align: center; max-width: 450px; padding: 2.5rem; border-radius: 1rem; background-color: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #ef4444; margin-top: 0; font-size: 1.5rem;">✗ Security Validation Mismatch</h2>
              <p style="color: #cbd5e1; margin-bottom: 2rem;">The 'state' returned by Deriv does not match the expected value. To prevent cross-site request forgery, the flow was aborted.</p>
              <button onclick="window.close()" style="background-color: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }

    // Exchange the Authorization Code for token
    try {
      const redirectUri = savedRedirectUri || (process.env.APP_URL 
        ? `${process.env.APP_URL}/auth/callback` 
        : `${req.protocol}://${req.get("host")}/auth/callback`);

      const requestBody = new URLSearchParams({
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier
      });

      // Attach client secret only if provided in system environment
      if (process.env.DERIV_CLIENT_SECRET) {
        requestBody.append("client_secret", process.env.DERIV_CLIENT_SECRET);
      }

      const tokenExchangeResponse = await fetch("https://auth.deriv.com/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: requestBody.toString()
      });

      const tokensData = await tokenExchangeResponse.json() as any;

      if (!tokenExchangeResponse.ok) {
        throw new Error(tokensData.error_description || tokensData.error || "Token exchange failed");
      }

      // Clear the PKCE cookie
      res.clearCookie("deriv_oauth_pkce", {
        secure: true,
        sameSite: "none",
        httpOnly: true
      });

      // Return a successful window opener communicator and close the popup window
      res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc;">
            <div style="text-align: center; max-width: 450px; padding: 2.5rem; border-radius: 1rem; background-color: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #22c55e; margin-top: 0; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                <svg style="width: 28px; height: 28px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Authenticated Successfully
              </h2>
              <p style="color: #cbd5e1; margin-bottom: 2rem;">Your Deriv account tokens are loaded. Returning control back to application container...</p>
              <div style="width: 2.5rem; height: 2.5rem; border: 4px solid #334155; border-top-color: #22c55e; border-radius: 50%; margin: 1rem auto; animation: spin 1s linear infinite;"></div>
              
              <style>
                @keyframes spin { to { transform: rotate(360deg); } }
              </style>

              <script>
                try {
                  const payloadResponse = ${JSON.stringify(tokensData)};
                  localStorage.setItem("deriv_oauth_session_shuttle", JSON.stringify(payloadResponse));
                  
                  let sent = false;
                  if (window.opener) {
                    try {
                      window.opener.postMessage({ 
                        type: "OAUTH_AUTH_SUCCESS", 
                        data: payloadResponse 
                      }, "*");
                      sent = true;
                    } catch (e) {
                      console.error("Failed to post message to opener:", e);
                    }
                  }
                  
                  if (sent) {
                    document.write('<p style="color:#22c55e; font-size: 0.875rem; margin-top: 1rem;">Notified parent window. Closing popup...</p>');
                    setTimeout(() => { window.close(); }, 1200);
                  } else {
                    document.write('<p style="color:#22c55e; font-size: 0.875rem; font-weight: bold; margin-top: 1rem;">Tokens saved locally! Redirecting to application dashboard...</p>');
                    localStorage.setItem("deriv_oauth_session", JSON.stringify(payloadResponse));
                    setTimeout(() => {
                      window.location.href = "/";
                    }, 1200);
                  }
                } catch (err) {
                  console.error("Local storage token exchange error:", err);
                  document.write('<p style="color:#ef4444; font-size: 0.875rem;">Error caching session locally.</p>');
                }
              </script>
            </div>
          </body>
        </html>
      `);
    } catch (exchangeError: any) {
      console.error("Token exchange failed:", exchangeError);
      res.send(`
        <html>
          <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #0f172a; color: #f8fafc;">
            <div style="text-align: center; max-width: 450px; padding: 2.5rem; border-radius: 1rem; background-color: #1e293b; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
              <h2 style="color: #ef4444; margin-top: 0; font-size: 1.5rem;">✗ Token Exchange Failed</h2>
              <p style="color: #cbd5e1; margin-bottom: 2rem;">The server could not exchange your authorize code. Error: ${exchangeError.message}</p>
              <button onclick="window.close()" style="background-color: #ef4444; color: white; border: none; padding: 0.75rem 1.5rem; font-weight: 500; border-radius: 0.375rem; cursor: pointer;">Close Window</button>
            </div>
          </body>
        </html>
      `);
    }
  });

  // Client static assets & SPA Fallbacks + Vite Middleware Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    // Prod static folder serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Deriv OAuth full-stack server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
