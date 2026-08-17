// S-HOME iskeleti (docs/06_SCREEN_CATALOG.md §4) — ComparisonTable/PeriodSelector/veri
// çekme İterasyon 2'de eklenir (docs/10_IMPLEMENTATION_ROADMAP.md §4.2).
export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Terazi</h1>
        <p className="text-sm text-muted-foreground">
          Döviz, gram altın, kripto ve yatırım fonlarının TL bazında reel getirisini karşılaştırın.
        </p>
      </div>
    </div>
  );
}
