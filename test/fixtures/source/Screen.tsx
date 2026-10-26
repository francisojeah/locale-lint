import { useTranslation } from "react-i18next";

export function Screen() {
  const { t } = useTranslation();
  const items = [];
  items.t("not.a.key"); // array method named t — must NOT be treated as a key
  return (
    <>
      {t("home.title")}
      {i18n.t("home.subtitle")}
      {intl.formatMessage({ id: "home.cta" })}
      {t(`dynamic.${id}`)}
    </>
  );
}
