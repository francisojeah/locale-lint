import { useTranslations } from "next-intl";

export function Home() {
  const t = useTranslations("Home");
  return (
    <>
      {t("title")}
      {t("nav.back")}
    </>
  );
}

export function Root() {
  const t = useTranslations();
  return <>{t("global.ok")}</>;
}
