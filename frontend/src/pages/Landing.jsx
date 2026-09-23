import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Shield, Zap, BarChart3, ArrowRight, Lock } from 'lucide-react'

const FEATURES = [
  { icon: TrendingUp, title: 'Track Everything', desc: 'Log income and expenses with categories, dates, and payment methods.', color: '#6366F1' },
  { icon: BarChart3,  title: 'Visual Analytics', desc: 'Monthly trends, category breakdowns, and financial insights at a glance.', color: '#10B981' },
  { icon: Shield,     title: 'Completely Private', desc: 'Your data never leaves your device. No accounts, no cloud, no tracking.', color: '#F59E0B' },
  { icon: Zap,        title: 'Works Instantly', desc: 'No sign-up, no setup. Open and start tracking in seconds.', color: '#EF4444' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8FAFC' }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b bg-white"
        style={{ borderColor: '#E5E7EB' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            <TrendingUp size={15} color="white" />
          </div>
          <span className="font-bold text-base" style={{ color: '#0F172A' }}>FinTrack</span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg border"
          style={{ color: '#4338CA', background: '#EEF2FF', borderColor: '#C7D2FE' }}
        >
          Open Dashboard <ArrowRight size={14} />
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 border"
          style={{ background: '#EEF2FF', color: '#4338CA', borderColor: '#C7D2FE' }}
        >
          <Lock size={11} /> 100% Private · Stored in your browser
        </div>

        {/* Headline */}
        <h1
          className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5 max-w-2xl"
          style={{ color: '#0F172A', letterSpacing: '-0.02em' }}
        >
          Take control of your{' '}
          <span style={{
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            finances
          </span>
        </h1>

        <p className="text-lg max-w-md mb-9 leading-relaxed" style={{ color: '#475569' }}>
          Manually track your income and expenses. View spending insights. Export your data.
          No accounts required.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white text-base"
            style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
          >
            Open Dashboard <ArrowRight size={17} />
          </button>
          <button
            onClick={() => navigate('/transactions/new')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border text-base"
            style={{ background: '#FFFFFF', color: '#374151', borderColor: '#D1D5DB' }}
          >
            Add First Transaction
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-4xl w-full text-left">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="p-5 rounded-2xl border bg-white shadow-sm"
              style={{ borderColor: '#E5E7EB' }}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-xl mb-3"
                style={{ background: `${color}12` }}
              >
                <Icon size={17} color={color} />
              </div>
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: '#0F172A' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748B' }}>{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-5 border-t" style={{ borderColor: '#E5E7EB' }}>
        <p className="text-xs" style={{ color: '#94A3B8' }}>
          FinTrack — Personal finance tracker. Data stored locally in your browser. No backend.
        </p>
      </footer>
    </div>
  )
}
