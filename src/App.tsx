import { lazy, Suspense, useEffect } from "react"
import { Route, Routes, useLocation } from "react-router-dom"

import { SiteNav } from "@/components/SiteNav"
import Home from "@/pages/Home"

// The dashboard only downloads when someone opens the Live grid tab.
const Dashboard = lazy(() => import("@/pages/Dashboard"))

function RouteEffects() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = pathname.startsWith("/grid") ? "Renewables grid · Julia Gomes" : "Julia Gomes · Chemical Engineer"
    document.getElementById("main")?.focus({ preventScroll: true })
  }, [pathname])
  return null
}

export default function App() {
  return (
    <>
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault()
          document.getElementById("main")?.focus()
        }}
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-navy focus:translate-y-0"
      >
        Skip to content
      </a>
      <RouteEffects />
      <SiteNav />
      <div id="main" tabIndex={-1} className="outline-none">
        <Routes>
          <Route
            path="/grid"
            element={
              <Suspense fallback={<div className="h-dvh bg-deep" />}>
                <Dashboard />
              </Suspense>
            }
          />
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </>
  )
}
