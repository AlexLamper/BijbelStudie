import { ReadingPreferencesCard } from "../../components/settings/ReadingPreferencesCard"
import { GeneralSettingsCard } from "../../components/settings/GeneralSettingsCard"

export default function SettingsPage() {
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="px-6 xl:px-10 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Instellingen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Beheer uw accountvoorkeuren en leesopties</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GeneralSettingsCard />
          <ReadingPreferencesCard />
        </div>
      </div>
    </div>
  )
}
