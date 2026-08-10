// Terazi — TEFAS fon statik listesi
// Kaynak: docs/02_DATABASE_SCHEMA.md §9, docs/00_PROJECT_OVERVIEW.md §2 madde "Yatırım fonu",
// docs/mimari-kararlar.md [I-003] — 4 şemsiye kategorisi × kategori başına 15 fon = 60 satır.
//
// Kategoriler (kod tarafında ayrı bir şema alanı olarak SAKLANMAZ — docs/02 §2.2'de yalnızca
// `symbol`/`name_tr`/`data_source`/`external_ref` var; kategori gruplaması bu dosyada yalnızca
// okunabilirlik içindir): Hisse Senedi Şemsiye Fonu, Borçlanma Araçları Şemsiye Fonu,
// Altın/Kıymetli Madenler Şemsiye Fonu, Değişken Şemsiye Fonu.
//
// Kodlar gerçek, kamuya açık TEFAS fon kodlarıdır (docs/01_DOMAIN_MODEL.md §2.2, §4 madde 7 —
// uydurma kod yasağı). Kesin AUM sıralaması (kategori başına "ilk 15") bu listede best-effort
// web araştırmasıyla belirlenmiştir, canlı TEFAS AUM sıralamasıyla birebir garanti edilmez.
// Bu liste operatör tarafından periyodik olarak (Faz 2 §2.2 sonrası, ayda bir) gözden geçirilip
// güncellenebilir — worker kendiliğinden bu listeyi değiştirmez (docs/01 §2.2, §4 madde 7).
//
// `externalRef`, worker'ın (Faz 2 §2.2) TEFAS sorgusunda kullanacağı gerçek fon kodudur;
// `symbol`, docs/02 §2.2'deki `TEFAS:<kod>` formatına uyar.

export interface TefasFundSeed {
  code: string;
  nameTr: string;
}

/** Hisse Senedi Şemsiye Fonu — 15 fon. */
export const hisseSenediFunds: TefasFundSeed[] = [
  { code: 'AAV', nameTr: 'Ata Portföy İkinci Hisse Senedi Fonu' },
  { code: 'AK3', nameTr: 'Ak Portföy Hisse Senedi Fonu' },
  { code: 'DAH', nameTr: 'Deniz Portföy Hisse Senedi Fonu' },
  { code: 'FYD', nameTr: 'QNB Portföy Birinci Hisse Senedi Fonu' },
  { code: 'FPH', nameTr: 'Fiba Portföy Hisse Senedi Fonu' },
  { code: 'GHS', nameTr: 'Garanti Portföy Hisse Senedi Fonu' },
  { code: 'GO9', nameTr: 'One Portföy Birinci Hisse Senedi Fonu' },
  { code: 'HVS', nameTr: 'HSBC Portföy Hisse Senedi Fonu' },
  { code: 'ACC', nameTr: 'İstanbul Portföy Dördüncü Hisse Senedi Fonu' },
  { code: 'AHI', nameTr: 'Atlas Portföy Birinci Hisse Senedi Fonu' },
  { code: 'BIH', nameTr: 'Pardus Portföy Birinci Hisse Senedi Fonu' },
  { code: 'BIG', nameTr: 'Yapı Kredi Portföy Üçüncü Hisse Senedi Fonu' },
  { code: 'BUY', nameTr: 'Ak Portföy Büyüyen Şirketler Hisse Senedi Fonu' },
  { code: 'ICZ', nameTr: 'Ak Portföy Teknoloji Şirketleri Hisse Senedi Fonu' },
  { code: 'IDH', nameTr: 'İş Portföy BIST 100 Dışı Şirketler Hisse Senedi Fonu' },
];

/** Borçlanma Araçları Şemsiye Fonu — 15 fon. */
export const borclanmaAraclariFunds: TefasFundSeed[] = [
  { code: 'BBF', nameTr: 'Pardus Portföy Birinci Borçlanma Araçları Fonu' },
  { code: 'AK2', nameTr: 'Ak Portföy Uzun Vadeli Borçlanma Araçları Fonu' },
  { code: 'APT', nameTr: 'Ak Portföy Orta Vadeli Borçlanma Araçları Fonu' },
  { code: 'DBB', nameTr: 'Deniz Portföy Borçlanma Araçları Fonu' },
  { code: 'FI3', nameTr: 'QNB Portföy Borçlanma Araçları Fonu' },
  { code: 'FIT', nameTr: 'Fiba Portföy Borçlanma Araçları Fonu' },
  { code: 'GA1', nameTr: 'Garanti Portföy Borçlanma Araçları Fonu' },
  { code: 'GTF', nameTr: 'Azimut PYŞ Birinci Borçlanma Araçları Fonu' },
  { code: 'GUV', nameTr: 'Garanti Portföy Uzun Vadeli Borçlanma Araçları Fonu' },
  { code: 'HST', nameTr: 'HSBC Portföy Borçlanma Araçları Fonu' },
  { code: 'MBR', nameTr: 'MT Portföy Birinci Borçlanma Araçları Fonu' },
  { code: 'OBI', nameTr: 'Oyak Portföy İkinci Borçlanma Araçları Fonu' },
  { code: 'OKT', nameTr: 'Oyak Portföy Birinci Borçlanma Araçları Fonu' },
  { code: 'TBT', nameTr: 'TEB Portföy Borçlanma Araçları Fonu' },
  { code: 'TPF', nameTr: 'Tacirler Portföy Borçlanma Araçları Fonu' },
];

/** Altın/Kıymetli Madenler Şemsiye Fonu — 15 fon. */
export const altinKiymetliMadenlerFunds: TefasFundSeed[] = [
  { code: 'AFO', nameTr: 'Ak Portföy Altın Fonu' },
  { code: 'BLT', nameTr: 'Bulls Portföy Altın Fonu' },
  { code: 'DBA', nameTr: 'Deniz Portföy Altın Fonu' },
  { code: 'FAL', nameTr: 'One Portföy Altın Fonu' },
  { code: 'FIB', nameTr: 'Fiba Portföy Altın Fonu' },
  { code: 'GTA', nameTr: 'Garanti Portföy Altın Fonu' },
  { code: 'HBF', nameTr: 'HSBC Portföy Altın Fonu' },
  { code: 'ICA', nameTr: 'ICBC Turkey Portföy Altın Fonu' },
  { code: 'NAU', nameTr: 'Neo Portföy Altın Fonu' },
  { code: 'PIR', nameTr: 'Piramit Portföy Altın Fonu' },
  { code: 'PTN', nameTr: 'Phillip Portföy Altın Fonu' },
  { code: 'RPG', nameTr: 'Rota Portföy Altın Fonu' },
  { code: 'TUA', nameTr: 'TEB Portföy Altın Fonu' },
  { code: 'TTA', nameTr: 'İş Portföy Altın Fonu' },
  { code: 'UP1', nameTr: 'Ünlü Portföy Altın Fonu' },
];

/** Değişken Şemsiye Fonu — 15 fon. */
export const degiskenFunds: TefasFundSeed[] = [
  { code: 'ACD', nameTr: 'İstanbul Portföy İkinci Değişken Fon' },
  { code: 'AGC', nameTr: 'Ak Portföy İkinci Değişken Fon' },
  { code: 'AN1', nameTr: 'Strateji Portföy Birinci Değişken Fon' },
  { code: 'BHF', nameTr: 'Pardus Portföy Birinci Değişken Fon' },
  { code: 'BVD', nameTr: 'BV Portföy Birinci Değişken Fon' },
  { code: 'DBP', nameTr: 'Deniz Portföy Birinci Değişken Fon' },
  { code: 'ECA', nameTr: 'Global MD Portföy Birinci Değişken Fon' },
  { code: 'EIB', nameTr: 'Astra Portföy Değişken Fon' },
  { code: 'FID', nameTr: 'Fiba Portföy Çoklu Varlık İkinci Değişken Fon' },
  { code: 'FNO', nameTr: 'QNB Portföy Birinci Değişken Fon' },
  { code: 'GPB', nameTr: 'Garanti Portföy Birinci Değişken Fon' },
  { code: 'GPI', nameTr: 'Garanti Portföy İkinci Değişken Fon' },
  { code: 'HPD', nameTr: 'HSBC Portföy İkinci Değişken Fon' },
  { code: 'IAE', nameTr: 'İstanbul Portföy Agresif Değişken Fon' },
  { code: 'IBB', nameTr: 'İş Portföy Atak Değişken Fon' },
];

/** Dört kategorinin birleşimi — 60 fon, seed.ts tarafından tüketilir. */
export const tefasFunds: TefasFundSeed[] = [
  ...hisseSenediFunds,
  ...borclanmaAraclariFunds,
  ...altinKiymetliMadenlerFunds,
  ...degiskenFunds,
];
