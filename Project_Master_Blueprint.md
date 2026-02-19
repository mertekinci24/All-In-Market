 Project Master Blueprint: All-In-Market Enterprise Intelligence

1. Proje Vizyonu & Amacı All-In-Market, Türkiye e-ticaret ekosisteminde (Trendyol, Hepsiburada, Amazon TR) faaliyet gösteren satıcılar için tasarlanmış, "Veri Çekme" (Scraping) ile "Karar Destek Sistemi"ni (Decision Support System) birleştiren premium bir SaaS platformudur.Sistem, satıcının sadece rakibi görmesini değil; AI yardımıyla maliyet, stok ve kampanya üçgeninde en kârlı stratejiyi kurmasını sağlar.

2. Temel Modüller ve Teknik Detaylar
A. Göz (The Eye): Browser Extension
Görev: Trendyol ve Hepsiburada sayfalarından veri toplamak.
Scraping Stratejisi: Kullanıcının tarayıcısını bir "Proxy Node" olarak kullanır.Ürün sayfası yüklendiğinde; Fiyat, Stok Durumu, Buybox Sahibi, Satıcı Puanı ve Yorum Sayısı verilerini çeker."Kritik Ürünler" için arka planda (Background Service Worker) 1, 5 veya 10 dakikalık periyotlarla sessizce kontrol yapar.
UI/UX: Sayfa üzerinde (In-page Injection) ürünün yanına küçük bir "Net Kâr Rozeti" ekler.

B. Beyin (The Brain): SaaS Dashboard
Teknoloji: Next.js (Frontend) + FastAPI (Backend).
Finansal Motor: Türkiye'ye özgü tüm maliyet kalemlerini hesaplayan kompleks bir algoritma içerir.
Kargo Hesaplama: Güncel Trendyol/HB desi barem tablolarını veritabanından çeker.
Vergi Modülü: %0, %10, %20 KDV seçenekleri ve stopaj hesaplama.
Komisyon: Kategori bazlı komisyon ve "Pazaryeri Hizmet Bedeli" kesintileri.
Döviz Entegrasyonu: TCMB API üzerinden günlük kur takibi ile ithal ürün maliyet yönetimi.

C. Stratejist (The Strategist): 
AI EngineModel: Google Gemini Pro.
Senaryo Analizi: "Fiyatı X TL düşürürsem ne olur?" sorusuna, rakip stok verisi ve pazar hızıyla yanıt verir.
Kampanya Optimizasyonu: Stoğu fazla olan veya devir hızı düşen ürünler için "Kupon mu tanımlamalıyım yoksa doğrudan indirim mi yapmalıyım?" önerisi sunar.3. Detaylı Veri Modeli ve Finansal FormülSistemin kalbi olan Net Kâr hesabı şu formüle dayanır:
$$P_{net} = S_{price} - (C_{buy} + V_{tax} + M_{comm} + S_{ship} + O_{extra} + A_{ads})

$$$S_{price}$: Satış Fiyatı
$C_{buy}$: Ürün Alış Maliyeti
$V_{tax}$: KDV ve Stopaj Yükü
$M_{comm}$: Pazaryeri Komisyonu + Hizmet Bedeli
$S_{ship}$: Desi Bazlı Güncel Kargo Ücreti
$O_{extra}$: Operasyonel Giderler (Paketleme, Kira vb.)
$A_{ads}$: Satış Başına Düşen Reklam Maliyeti (PPC)

4. Kullanıcı Deneyimi (UX) StandartlarıPremium Vibe: Minimalist, "Dark Mode" öncelikli, "Glassmorphism" efektli kart tasarımları.
Hız: Tüm tablolar "Instant Search" ve "Infinite Scroll" özellikli (TanStack Table).
Psikolojik Tetikleyiciler: * Yeşil/Kırmızı Karlılık Isı Haritası: Zarar edilen ürünler panelde anında dikkat çekecek şekilde parlar.
Trend Okları: Fiyat değişimleri borsa terminali gibi yukarı/aşağı oklarla gösterilir.

5. Güvenlik ve Yetkilendirme (Enterprise)API Key Isolation: Kullanıcı API anahtarları veritabanında AES-256 ile şifrelenir. Asla plain-text olarak tutulmaz.
Multi-Tenancy: Bir ana hesap altında 10 kişiye kadar çalışan yetkilendirilebilir (Görüntüleme, Düzenleme, Sadece Finans yetkisi).
Loglama: Sistem üzerinden yapılan her fiyat güncellemesi "Hangi kullanıcı, hangi tarih, hangi eski/yeni fiyat" şeklinde loglanır.

6. Yol Haritası (Roadmap)
Hafta 1: İskelet (Scaffolding)Next.js ve FastAPI temel yapıları.Extension Manifest V3 ve Trendyol DOM Selector'ların yazılması.Supabase/PostgreSQL veritabanı şemasının kurulması.
Hafta 2: Finansal Motor (The Engine)Kargo barem ve komisyon tablolarının entegrasyonu.Manuel maliyet giriş ekranları.Extension'dan gelen verinin DB'ye kaydedilmesi.
Hafta 3: Analiz ve UI (The Dashboard)Ana analitik sayfası ve ürün listeleme tabloları.Grafiklerin (Chart.js) entegrasyonu.Döviz kuru entegrasyonu.
Hafta 4: AI ve Bildirimler (The Final Touch)Gemini Pro API ile "Satış Tavsiyesi" modülü.Telegram/Browser bildirim sistemi.Final Bug-Fix ve "Premium" görsel dokunuşlar..