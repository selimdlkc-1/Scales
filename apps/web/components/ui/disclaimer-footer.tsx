// [P-006]: yatırım tavsiyesi verilmez — sabit uyarı metni her sayfada bu bileşenden
// render edilir, hiçbir ekran kendi kopyasını yazmaz (docs/06_SCREEN_CATALOG.md §6).
export function DisclaimerFooter() {
  return (
    <footer className="border-t">
      <p className="mx-auto max-w-5xl px-4 py-4 text-sm text-muted-foreground">
        Geçmiş performans gelecekteki getiriyi göstermez. Bu sayfadaki bilgiler yatırım tavsiyesi
        niteliği taşımaz.
      </p>
    </footer>
  );
}
