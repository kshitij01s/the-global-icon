import { MotionConfig } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { Loading } from './components/ui'
import { AuthProvider } from './lib/auth'
import { ThemeProvider } from './lib/theme'
import { useDocumentTitle } from './lib/hooks'
import About from './pages/About'
import Advertise from './pages/Advertise'
import Contact from './pages/Contact'
import Discover from './pages/Discover'
import Editions from './pages/Editions'
import Home from './pages/Home'
import { LeaderDetail, LeadersList } from './pages/Leaders'
import MagazineDetail from './pages/MagazineDetail'
import Magazines from './pages/Magazines'
import SearchPage from './pages/Search'
import SignIn from './pages/SignIn'
import { StoriesList, StoryDetail } from './pages/Stories'

const Reader = lazy(() => import('./pages/Reader'))

function NotFound() {
  useDocumentTitle('Page not found')
  return (
    <div className="mood-midnight">
      <div className="container-x py-32 text-center">
        <p className="eyebrow mb-4">404</p>
        <h1 className="display text-6xl">This page has gone to press elsewhere.</h1>
        <Link to="/" className="btn btn-gold mt-10">
          Return home
        </Link>
      </div>
    </div>
  )
}

export default function App() {
  return (
    // "user" honours the OS prefers-reduced-motion setting for all framer-motion transforms
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route element={<Layout />}>
                  <Route index element={<Home />} />
                  <Route path="editions" element={<Editions />} />
                  <Route path="magazines" element={<Magazines />} />
                  <Route path="magazines/:slug" element={<MagazineDetail />} />
                  <Route path="read/:slug" element={<Reader />} />
                  <Route path="stories" element={<StoriesList />} />
                  <Route path="stories/:slug" element={<StoryDetail />} />
                  <Route path="leaders" element={<LeadersList />} />
                  <Route path="leaders/:slug" element={<LeaderDetail />} />
                  <Route path="discover" element={<Discover />} />
                  <Route path="advertise" element={<Advertise />} />
                  <Route path="about" element={<About />} />
                  <Route path="contact" element={<Contact />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="signin" element={<SignIn />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </MotionConfig>
  )
}
