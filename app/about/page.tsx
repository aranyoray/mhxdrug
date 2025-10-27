'use client'

import ThemeToggle from '@/components/ThemeToggle'

export default function AboutPage() {
  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <a
              href="/"
              className="text-sm md:text-base inline-block mb-4 transition-all duration-200 hover:opacity-80"
              style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}
            >
              ← Back to Dashboard
            </a>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">About This Project</h1>
          </div>
          <ThemeToggle />
        </div>
        
        <div className="panel">
          <h2 className="text-lg md:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Study Design</h2>
          <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>Ecological longitudinal panel study examining associations between geographic, political, and socioeconomic factors with overdose mortality, suicide, and mental health outcomes (2018-2023).</p>
        </div>
        
        <div className="panel">
          <h2 className="text-lg md:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Data Sources</h2>
          <ul className="space-y-2 text-sm md:text-base">
            <li><strong>CDC WONDER:</strong> Overdose and suicide mortality <a href="https://wonder.cdc.gov/mcd.html" target="_blank" rel="noopener noreferrer" className="break-words" style={{ color: 'var(--accent-blue)' }}>[1]</a></li>
            <li><strong>MIT Election Lab:</strong> County presidential returns <a href="https://electionlab.mit.edu/data" target="_blank" rel="noopener noreferrer" className="break-words" style={{ color: 'var(--accent-blue)' }}>[2]</a></li>
            <li><strong>American Community Survey:</strong> Socioeconomic indicators <a href="https://www.census.gov/data/developers/data-sets/acs-5year.html" target="_blank" rel="noopener noreferrer" className="break-words" style={{ color: 'var(--accent-blue)' }}>[3]</a></li>
          </ul>
        </div>
        
        <div className="panel">
          <h2 className="text-lg md:text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Statistical Analysis</h2>
          <p className="text-sm md:text-base" style={{ color: 'var(--text-secondary)' }}>Generalized linear models controlling for poverty, income, demographics, education, and urban/rural classification.</p>
        </div>
      </div>
    </div>
  )
}
