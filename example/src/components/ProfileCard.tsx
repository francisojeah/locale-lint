import React from "react";
import { useTranslation } from "react-i18next";

interface ProfileProps {
  name: string;
  bio?: string;
}

// home.oldWidget is defined in translations but never used anywhere in code
// profile keys are used here

export function ProfileCard({ name, bio }: ProfileProps) {
  const { t } = useTranslation();

  return (
    <div className="profile-card">
      <h2>{t("profile.title")}</h2>
      <p className="name">{name}</p>
      {bio && <p className="bio">{bio}</p>}
      <button type="button">{t("profile.editButton")}</button>

      {/* Hardcoded tooltip text 🚨 */}
      <span title="Click to edit your profile details">
        {t("profile.bio")}
      </span>

      {/* i18n.t() style — also detected */}
    </div>
  );
}
