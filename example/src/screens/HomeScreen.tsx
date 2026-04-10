import React from "react";
import { useTranslation } from "react-i18next";

interface HomeProps {
  userName: string;
  lastSeen: string;
}

export function HomeScreen({ userName, lastSeen }: HomeProps) {
  const { t } = useTranslation();

  return (
    <div className="home">
      <header>
        <h1>{t("home.title")}</h1>
        {/* Correctly using interpolation */}
        <p>{t("home.welcome", { name: userName })}</p>
        <small>{t("home.lastSeen", { date: lastSeen })}</small>
      </header>

      <section className="stats">
        {/* Hardcoded section header 🚨 */}
        <h2>Your Statistics</h2>

        <div className="stat-card">
          <span>{t("home.stats.total")}</span>
          <span>142</span>
        </div>
        <div className="stat-card">
          <span>{t("home.stats.active")}</span>
          <span>98</span>
        </div>
        <div className="stat-card">
          <span>{t("home.stats.pending")}</span>
          <span>44</span>
        </div>
      </section>

      {/* This key doesn't exist ❌ */}
      <p>{t("home.nonExistentKey")}</p>

      {/* Dynamic key — intentionally ignored by locale-lint */}
      <p>{t(`home.${userName}`)}</p>
    </div>
  );
}
