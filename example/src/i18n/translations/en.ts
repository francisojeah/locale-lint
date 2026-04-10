// Pattern 1: Typed variable with indirect export — most common in typed RN projects
import type { TranslationSchema } from './types'

const en: TranslationSchema = {
  common: {
    save: "Save",
    cancel: "Cancel",
  },
  home: {
    title: "Dashboard",
    welcome: "Hello {{name}}",
  },
  auth: {
    login: "Sign in",
  }
}

export default en
