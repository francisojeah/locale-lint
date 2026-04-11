// Pattern 2: satisfies keyword (TS 4.9+)
export default {
  common: {
    save: "Salvar",
    cancel: "Cancelar",
  },
  home: {
    title: "Painel",
    welcome: "Olá {{name}}",
  },
  auth: {
    login: "Entrar",
  },
} satisfies Record<string, unknown>;
