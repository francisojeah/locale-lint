import React, { useState } from "react";
import { useTranslation } from "react-i18next";

// Example React Native / React screen
export function LoginScreen() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");

  return (
    <div className="screen">
      {/* Correctly translated */}
      <h1>{t("auth.login.title")}</h1>
      <p>{t("auth.login.subtitle")}</p>

      {/* Hardcoded strings — should be flagged 🚨 */}
      <div className="hero-banner">Welcome to our platform</div>

      <label htmlFor="email">{t("auth.login.emailLabel")}</label>
      <input
        id="email"
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="password">{t("auth.login.passwordLabel")}</label>
      <input id="password" type="password" placeholder="Password" />

      <button type="button">{t("auth.login.submitButton")}</button>

      {/* This key doesn't exist in translations — undefined key ❌ */}
      <p>{t("auth.loginButton")}</p>

      <a href="/forgot">{t("auth.login.forgotPassword")}</a>

      <div className="footer">
        {/* Hardcoded again 🚨 */}
        <span>Already have an account?</span>
        <a href="/login">{t("auth.login.signupLink")}</a>
      </div>
    </div>
  );
}
