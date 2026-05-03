import { useState, useEffect } from 'react'
import Leaderboard from './components/Leaderboard'
import './App.css'

const BOARDS = [
  { label: '男子超鐵', file: 'data/2026-full-men.json' },
  { label: '女子超鐵', file: 'data/2026-full-women.json' },
  { label: '男子半超鐵', file: 'data/2026-half-men.json' },
  { label: '女子半超鐵', file: 'data/2026-half-women.json' },
]

function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(import.meta.env.BASE_URL + BOARDS[activeIndex].file)
      .then(res => res.json())
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [activeIndex])

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1 className="site-title">臺灣超級鐵人三項排行榜</h1>
          <p className="site-subtitle">Taiwan Triathlon Leaderboard</p>
        </div>
      </header>

      <nav className="tab-nav">
        {BOARDS.map((b, i) => (
          <button
            key={i}
            className={`tab-btn ${i === activeIndex ? 'active' : ''}`}
            onClick={() => setActiveIndex(i)}
          >
            {b.label}
          </button>
        ))}
      </nav>

      <main className="main">
        {loading ? (
          <div className="loading">載入中...</div>
        ) : data ? (
          <Leaderboard data={data} />
        ) : (
          <div className="loading">無法載入資料</div>
        )}
      </main>

      <footer className="footer">
        <p>臺灣超級鐵人三項排行榜 &copy; {new Date().getFullYear()}</p>
        <p className="footer-note">資料僅供參考，如有錯誤歡迎來信指正</p>
      </footer>
    </div>
  )
}

export default App
