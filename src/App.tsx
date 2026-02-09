import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { TrendingUp } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useStore } from '@/hooks/useStore'
import { useProducts } from '@/hooks/useProducts'
import { useCurrency } from '@/hooks/useCurrency'
import { useShippingRates } from '@/hooks/useShippingRates'
import { AppLayout } from '@/components/layout/AppLayout'
import { StoreSetup } from '@/components/layout/StoreSetup'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProductsPage } from '@/pages/ProductsPage'
import { CalculatorPage } from '@/pages/CalculatorPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { TrackingPage } from '@/pages/TrackingPage'
import { AiScenarioPage } from '@/pages/AiScenarioPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth()
  const { store, loading: storeLoading, createStore } = useStore(user?.id)
  const { rates: shippingRates, loading: ratesLoading } = useShippingRates(store?.id, store?.marketplace ?? 'trendyol')
  const { products, loading: productsLoading, addProduct, updateProduct, deleteProduct, refetch } =
    useProducts(store?.id, shippingRates)
  const { rates: currencyRates } = useCurrency()

  if (authLoading || (user && storeLoading)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface-950 animate-fade-in">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 shadow-lg shadow-brand-500/20 mb-4">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div className="h-1 w-16 rounded-full bg-surface-800 overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-brand-500 animate-shimmer" />
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onSignIn={signIn} onSignUp={signUp} />
  }

  if (!store) {
    return <StoreSetup onCreateStore={createStore} />
  }

  const isLoading = productsLoading || ratesLoading

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout onSignOut={signOut} />}>
          <Route
            path="/"
            element={<DashboardPage products={products} loading={isLoading} currencyRates={currencyRates} />}
          />
          <Route
            path="/products"
            element={
              <ProductsPage
                products={products}
                loading={isLoading}
                storeId={store.id}
                onAdd={addProduct}
                onUpdate={updateProduct}
                onDelete={deleteProduct}
                onRefetch={refetch}
              />
            }
          />
          <Route
            path="/calculator"
            element={
              <CalculatorPage
                shippingRates={shippingRates}
                marketplace={store.marketplace}
              />
            }
          />
          <Route
            path="/analytics"
            element={<AnalyticsPage products={products} loading={isLoading} />}
          />
          <Route
            path="/tracking"
            element={<TrackingPage products={products} loading={isLoading} />}
          />
          <Route
            path="/ai-scenario"
            element={<AiScenarioPage products={products} loading={isLoading} />}
          />
          <Route
            path="/settings"
            element={
              <SettingsPage
                store={store}
                shippingRates={shippingRates}
                storeId={store.id}
                marketplace={store.marketplace}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
