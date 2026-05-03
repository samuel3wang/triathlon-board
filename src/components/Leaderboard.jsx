import { useState, useMemo } from 'react'
import './Leaderboard.css'

function Leaderboard({ data }) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const filtered = useMemo(() => {
    let list = data.athletes
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        a =>
          a.name.toLowerCase().includes(q) ||
          a.raceName.toLowerCase().includes(q)
      )
    }
    if (sortField) {
      list = [...list].sort((a, b) => {
        let va = a[sortField]
        let vb = b[sortField]
        if (typeof va === 'string') va = va.toLowerCase()
        if (typeof vb === 'string') vb = vb.toLowerCase()
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ? 1 : -1
        return 0
      })
    }
    return list
  }, [data.athletes, search, sortField, sortDir])

  const handleSort = (field) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc')
      else {
        setSortField(null)
        setSortDir('asc')
      }
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortIcon = (field) => {
    if (sortField !== field) return ' \u2195'
    return sortDir === 'asc' ? ' \u2191' : ' \u2193'
  }

  return (
    <div className="leaderboard">
      <div className="board-header">
        <div>
          <h2 className="board-title">{data.title}</h2>
          <p className="board-subtitle">{data.subtitle}</p>
        </div>
        <div className="board-meta">
          <span className="last-updated">最後更新：{data.lastUpdated}</span>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜尋選手、賽事..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <span className="result-count">
            找到 {filtered.length} 筆結果
          </span>
        )}
      </div>

      <div className="table-container">
        <table className="ranking-table">
          <thead>
            <tr>
              <th className="col-rank">排名</th>
              <th className="col-name sortable" onClick={() => handleSort('name')}>
                選手姓名{sortIcon('name')}
              </th>
              <th className="col-total sortable" onClick={() => handleSort('totalTime')}>
                總成績{sortIcon('totalTime')}
              </th>
              <th className="col-split col-swim sortable" onClick={() => handleSort('swimTime')}>
                游泳{sortIcon('swimTime')}
              </th>
              <th className="col-split col-bike sortable" onClick={() => handleSort('bikeTime')}>
                自行車{sortIcon('bikeTime')}
              </th>
              <th className="col-split col-run sortable" onClick={() => handleSort('runTime')}>
                跑步{sortIcon('runTime')}
              </th>
              <th className="col-race">賽會名稱</th>

            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i} className={a.rank <= 3 ? `top-${a.rank}` : ''}>
                <td className="col-rank">
                  <span className={`rank-badge ${a.rank <= 3 ? `rank-${a.rank}` : ''}`}>
                    {a.rank}
                  </span>
                </td>
                <td className="col-name">{a.name}</td>
                <td className="col-total">{a.totalTime}</td>
                <td className="col-split col-swim">{a.swimTime}</td>
                <td className="col-split col-bike">{a.bikeTime}</td>
                <td className="col-split col-run">{a.runTime}</td>
                <td className="col-race">{a.raceName}</td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.notes && data.notes.length > 0 && (
        <div className="notes">
          <h3>備註</h3>
          <ul>
            {data.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Leaderboard
