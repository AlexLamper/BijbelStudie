export const fallbackLng = "nl"
export const languages = ["nl"]
export const defaultNS = "translation"
export const cookieName = "i18next"

export function getOptions(lng = fallbackLng, ns = defaultNS) {
  return {
    supportedLngs: languages,
    fallbackLng,
    lng,
    fallbackNS: defaultNS,
    defaultNS,
    ns,
  }
}
