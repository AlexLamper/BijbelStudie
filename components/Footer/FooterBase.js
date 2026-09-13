'use client'

import { Trans } from 'react-i18next/TransWithoutContext'
import { languages, cookieName } from '../../app/i18n/settings'
import { useRouter } from 'next/navigation'
import { useTranslation } from '../../app/i18n/client'

export const FooterBase = ({ t, lng }) => {
  const router = useRouter()
  const { i18n } = useTranslation('footer')

  const switchLanguage = (l) => {
    if (lng === l) return
    document.cookie = `${cookieName}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
    i18n.changeLanguage(l)
    router.refresh()
  }

  return (
    <footer style={{ marginTop: 50 }}>
      <Trans i18nKey="languageSwitcher" t={t}>
        Switch from <strong>{lng}</strong> to:{' '}
      </Trans>
      {languages.filter((l) => lng !== l).map((l, index) => (
        <span key={l}>
          {index > 0 && ' or '}
          <button 
            onClick={() => switchLanguage(l)}
            className="text-blue-600 dark:text-blue-400 hover:underline bg-transparent border-none cursor-pointer p-0"
          >
            {l}
          </button>
        </span>
      ))}
    </footer>
  )
}
