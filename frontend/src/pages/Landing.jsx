import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Shield, Zap, BarChart3, ArrowRight, Lock } from 'lucide-react'

const FEATURES = [
  { icon: TrendingUp, title: 'Track Everything', desc: 'Log income and expenses with categories, dates, and payment methods.' },
  { icon: BarChart3, title: 'Visual Analytics', desc: 'Monthly trends, category breakdowns, and financial insights at a glance.' },
  { icon: Shield, title: 'Completely Private', desc: 'Your data never leaves your device. No accounts, no cloud, no tracking.' },
  { icon: Zap, title: 'Works Instantly', desc: 'No sign-up, no setup. Open and start tracking in seconds.' },
]

export default function Landing() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0f1117' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#2a2d3e' }}>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <TrendingUp size={16} color="white" />
          </div>
          <span className="font-bold text-base" style={{ color: '#f1f5f9' }}>FinTrack</span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-lg"
          style={{ color: '#a5b4fc', background: 'rgba(99,102,241,0.1)' }}
        >
          Open Dashboard <ArrowRight size={14} />
        </button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}>
          <Lock size={11} /> 100% Private · Stored in your browser
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6 max-w-3xl"
          style={{ color: '#f1f5f9', letterSpacing: '-0.02em' }}>
          Take control of your{' '}
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            finances
          </span>
        </h1>

        <p className="text-lg sm:text-xl max-w-lg mb-10" style={{ color: '#64748b', lineHeight: 1.7 }}>
          Manually track your income and expenses. View spending insights. Export your data.
          No accounts required — everything stays on your device.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', fontSize: '1rem' }}
          >
            Open Dashboard <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate('/transactions/new')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold border"
            style={{ background: 'transparent', color: '#94a3b8', borderColor: '#2a2d3e', fontSize: '1rem' }}
          >
            Add First Transaction
          </button>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20 max-w-4xl w-full text-left">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-2xl border"
              style={{ background: '#1a1d27', borderColor: '#2a2d3e' }}>
              <div className="flex items-center justify-center w-9 h-9 rounded-xl mb-3"
                style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Icon size={17} color="#6366f1" />
              </div>
              <h3 className="text-sm font-semibold mb-1.5" style={{ color: '#f1f5f9' }}>{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: '#64748b' }}>{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 border-t" style={{ borderColor: '#2a2d3e' }}>
        <p className="text-xs" style={{ color: '#475569' }}>
          FinTrack — Personal finance tracker. Data stored locally in your browser. No backend.
        </p>
      </footer>
    </div>
  )
}
