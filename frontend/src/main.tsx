import React from 'react'
import {createRoot} from 'react-dom/client'
import {BrowserRouter, HashRouter} from 'react-router-dom'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import App from './App'
import './style.css'

const queryClient = new QueryClient({defaultOptions: {queries: {staleTime: 20000, retry: 1}}})
const onPages = import.meta.env.BASE_URL !== '/'
const Router = onPages ? HashRouter : BrowserRouter
const awaitingApi = onPages && !import.meta.env.VITE_API_BASE_URL?.trim()

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {awaitingApi ? (
      <main>
        <section className="panel">
          <h1>AdmitFlow</h1>
          <p>Patient admissions will be available once the hosted API is connected.</p>
        </section>
      </main>
    ) : (
      <QueryClientProvider client={queryClient}>
        <Router><App /></Router>
      </QueryClientProvider>
    )}
  </React.StrictMode>,
)
