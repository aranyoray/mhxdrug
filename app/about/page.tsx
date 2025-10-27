'use client'

import ThemeToggle from '@/components/ThemeToggle'

export default function AboutPage() {
  return (
    <div className="min-h-screen p-8" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <a href="/" style={{ color: 'var(--accent-blue)' }}>← Back to Dashboard</a>
            <h1 className="text-4xl font-bold mt-4 mb-2">About This Project</h1>
          </div>
          <ThemeToggle />
        </div>
        
        <div className="panel">
          <h2 className="panel-title mb-4">Study Design</h2>
          <p>Ecological longitudinal panel study examining associations between geographic, political, and socioeconomic factors with overdose mortality, suicide, and mental health outcomes (2018-2023).</p>
        </div>
        
        <div className="panel">
          <h2 className="panel-title mb-4">Data Sources</h2>
          <ul className="space-y-2">
            <li><strong>CDC WONDER:</strong> Overdose and suicide mortality <a href="https://wonder.cdc.gov/mcd.html" target="_blank" rel="noopener noreferrer">[1]</a></li>
            <li><strong>MIT Election Lab:</strong> County presidential returns <a href="https://electionlab.mit.edu/data" target="_blank" rel="noopener noreferrer">[2]</a></li>
            <li><strong>American Community Survey:</strong> Socioeconomic indicators <a href="https://www.census.gov/data/developers/data-sets/acs-5year.html" target="_blank" rel="noopener noreferrer">[3]</a></li>
          </ul>
        </div>
        
        <div className="panel">
          <h2 className="panel-title mb-4">Statistical Analysis</h2>
          <p>Generalized linear models controlling for poverty, income, demographics, education, and urban/rural classification.</p>
        </div>
      </div>
    </div>
  )
}
